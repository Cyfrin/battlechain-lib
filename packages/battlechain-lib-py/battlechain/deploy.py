"""Deploy helpers via BattleChainDeployer (or CreateX off-chain).

Mirrors src/BCDeploy.sol from cyfrin/battlechain-lib. Tracks all deployed
addresses so they can be passed to Safe Harbor agreement builders.

Boa-first: every helper assumes a boa environment with a configured EOA.

Two layers of API:

* Low-level (mirrors Solidity) — `bc_deploy_create` / `bc_deploy_create2` /
  `bc_deploy_create3` take raw `init_code: bytes` and return the new address.
* High-level (Python convenience) — `bc_deploy(deployer, *args)` takes a boa
  ``VyperDeployer`` plus constructor args, builds init_code, deploys via the
  low-level helper, and returns a ``VyperContract`` wrapped at the new address.
  The address is also persisted to a JSON file so subsequent script runs
  (e.g., create-agreement reading vault address from setup) can read it back
  via `get_tracked_address` / `get_tracked_contract`.

The JSON tracking file exists because deployer-routed contracts perform their
CREATE inside ``BattleChainDeployer``'s call context — moccasin's
``deployments.db`` only sees top-level boa deploys, so it can't track them.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from eth_abi import encode
from vyper.compiler.output import build_abi_output

from battlechain import _boa

# Module-level deployment tracker. Mirrors `address[] private _deployedContracts`
# in BCDeploy.sol — it persists for the duration of a script run, which matches
# the moccasin `def moccasin_main()` pattern of one process per invocation.
_deployed: list[str] = []

# Default location for the per-chain address tracking file. Lives in the cwd
# (project root for moccasin scripts). Override with `tracking_path=` if needed.
DEFAULT_TRACKING_FILE = Path(".bc_deployments.json")


def bc_deploy_create(init_code: bytes) -> str:
    """Deploy via CREATE.

    Mirrors `BCDeploy.bcDeployCreate(initCode)`. Routes through:
      - BattleChainDeployer on BattleChain (auto-registers with AttackRegistry)
      - CreateX on any other supported chain
    """
    deployer = _boa.deployer()
    address = deployer.deployCreate(init_code)
    _deployed.append(address)
    return address


def bc_deploy_create2(salt: bytes, init_code: bytes) -> str:
    """Deploy via CREATE2 (deterministic address, salt + bytecode).

    Mirrors `BCDeploy.bcDeployCreate2(salt, initCode)`.
    """
    if len(salt) != 32:
        raise ValueError(f"salt must be 32 bytes, got {len(salt)}")
    deployer = _boa.deployer()
    address = deployer.deployCreate2(salt, init_code)
    _deployed.append(address)
    return address


def bc_deploy_create3(salt: bytes, init_code: bytes) -> str:
    """Deploy via CREATE3 (address depends only on salt, not bytecode).

    Mirrors `BCDeploy.bcDeployCreate3(salt, initCode)`.
    """
    if len(salt) != 32:
        raise ValueError(f"salt must be 32 bytes, got {len(salt)}")
    deployer = _boa.deployer()
    address = deployer.deployCreate3(salt, init_code)
    _deployed.append(address)
    return address


def deployed_contracts() -> tuple[str, ...]:
    """Return all addresses deployed this session via `bc_deploy_*` helpers.

    Mirrors `BCDeploy.getDeployedContracts()`.
    """
    return tuple(_deployed)


def reset_deployments() -> None:
    """Clear the tracked deployment list. Useful between independent runs/tests."""
    _deployed.clear()


def track_deployment(address: str) -> None:
    """Manually record an address as if it had been deployed via `bc_deploy_*`.

    Useful when a contract was deployed before this session started (e.g., a
    pre-existing token) but should still appear in the agreement's scope.
    """
    _deployed.append(address)


# -----------------------------------------------------------------------------
# High-level deploy from a boa Vyper deployer
# -----------------------------------------------------------------------------


def build_init_code(deployer: Any, *args: Any) -> bytes:
    """Assemble deployment init code from a boa Vyper deployer + constructor args.

    Mirrors what ``VyperContract._run_init`` does internally: appends ABI-encoded
    constructor args to the contract's creation bytecode. Use this when you want
    to deploy through one of the low-level helpers (`bc_deploy_create2` /
    `bc_deploy_create3`) but don't want to hand-encode the constructor.

    Raises:
        ValueError: if the contract has no constructor but args were given, or
            the number of args doesn't match the constructor signature.
    """
    bytecode = deployer.compiler_data.bytecode
    arg_types = _ctor_arg_types(deployer)
    if not arg_types:
        if args:
            raise ValueError(
                f"contract has no constructor but {len(args)} args were given"
            )
        return bytecode
    if len(arg_types) != len(args):
        raise ValueError(
            f"constructor expects {len(arg_types)} args ({arg_types}), "
            f"got {len(args)}"
        )
    return bytecode + encode(arg_types, list(args))


def bc_deploy(
    deployer: Any,
    *args: Any,
    name: str | None = None,
    tracking_path: Path | str | None = None,
) -> Any:
    """Deploy a boa Vyper contract via BattleChainDeployer + persist its address.

    High-level wrapper: takes a ``VyperDeployer`` (e.g. ``MockToken`` from
    ``from src import MockToken``) plus constructor args, routes the deploy
    through ``BattleChainDeployer`` (auto-registering with AttackRegistry on
    BattleChain), and returns a ``VyperContract`` at the new address.

    The new address is also written to a per-chain tracking file (default
    ``.bc_deployments.json`` in the cwd) so later script runs can resolve it
    via `get_tracked_address` / `get_tracked_contract`. This bridges the gap
    that moccasin's ``deployments.db`` doesn't see deployer-routed contracts
    because BCDeployer performs the CREATE inside its own call context.

    Args:
        deployer: Boa ``VyperDeployer`` (e.g. the symbol from
            ``from src import MyContract``).
        *args: Constructor arguments, in declaration order.
        name: Override the tracking key. Defaults to the contract name from
            ``deployer.compiler_data.contract_path``.
        tracking_path: Override the tracking file location. Defaults to
            ``./.bc_deployments.json``.
    """
    init_code = build_init_code(deployer, *args)
    address = bc_deploy_create(init_code)
    _track_address(name or _deployer_name(deployer), address, _resolve_path(tracking_path))
    return deployer.at(address)


def get_tracked_address(
    name: str,
    *,
    tracking_path: Path | str | None = None,
) -> str | None:
    """Look up a previously tracked deployment address for the active chain.

    Returns ``None`` if the tracking file doesn't exist or the name isn't recorded.
    """
    path = _resolve_path(tracking_path)
    data = _read_tracking(path)
    return data.get(_chain_key(), {}).get(name)


def get_tracked_contract(
    deployer: Any,
    *,
    name: str | None = None,
    tracking_path: Path | str | None = None,
) -> Any | None:
    """Look up a tracked deployment and return a boa contract at that address.

    Returns ``None`` if no tracked address is found. Use the contract's
    ``deployer`` (from ``from src import MyContract``) to wrap it with the
    correct ABI.
    """
    address = get_tracked_address(
        name or _deployer_name(deployer),
        tracking_path=tracking_path,
    )
    if address is None:
        return None
    return deployer.at(address)


# -----------------------------------------------------------------------------
# Internal helpers
# -----------------------------------------------------------------------------


def _ctor_arg_types(deployer: Any) -> list[str] | None:
    """Return the constructor's ABI type strings, or None if there's no constructor."""
    abi = build_abi_output(deployer.compiler_data)
    for entry in abi:
        if entry.get("type") == "constructor":
            return [_canonical_type(inp) for inp in entry["inputs"]]
    return None


def _canonical_type(input_dict: dict) -> str:
    """Build the canonical ABI type string for a constructor input.

    Tuples are recursed into so nested structs encode correctly.
    """
    type_str = input_dict["type"]
    if type_str.startswith("tuple"):
        components = input_dict.get("components", [])
        inner = ",".join(_canonical_type(c) for c in components)
        suffix = type_str[len("tuple"):]
        return f"({inner}){suffix}"
    return type_str


def _deployer_name(deployer: Any) -> str:
    """Best-effort contract name from a boa Vyper deployer."""
    contract_path = getattr(deployer.compiler_data, "contract_path", None)
    if contract_path:
        return Path(contract_path).stem
    filename = getattr(deployer, "filename", None)
    if filename:
        return Path(filename).stem
    raise ValueError(
        "could not derive contract name from deployer — pass `name=...` explicitly"
    )


def _resolve_path(tracking_path: Path | str | None) -> Path:
    if tracking_path is None:
        return DEFAULT_TRACKING_FILE
    return Path(tracking_path)


def _chain_key() -> str:
    return str(_boa.chain_id())


def _read_tracking(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def _write_tracking(path: Path, data: dict[str, dict[str, str]]) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")


def _track_address(name: str, address: str, path: Path) -> None:
    data = _read_tracking(path)
    data.setdefault(_chain_key(), {})[name] = address
    _write_tracking(path, data)


__all__ = [
    "DEFAULT_TRACKING_FILE",
    "bc_deploy",
    "bc_deploy_create",
    "bc_deploy_create2",
    "bc_deploy_create3",
    "build_init_code",
    "deployed_contracts",
    "get_tracked_address",
    "get_tracked_contract",
    "reset_deployments",
    "track_deployment",
]
