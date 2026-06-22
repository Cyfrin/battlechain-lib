# battlechain-lib-py

Python library for deploying on [BattleChain](https://docs.battlechain.com) and adopting
[Safe Harbor](https://docs.battlechain.com) agreements. Mirrors
[`cyfrin/battlechain-lib`](https://github.com/Cyfrin/battlechain-lib) (Solidity).

Boa-first, designed for [Moccasin](https://github.com/Cyfrin/moccasin) scripts.

- [battlechain-lib-py](#battlechain-lib-py)
  - [Installation](#installation)
  - [Quick start](#quick-start)
  - [What's included](#whats-included)
  - [Supported networks](#supported-networks)
    - [Mainnet (626) addresses](#mainnet-626-addresses)
  - [Reference](#reference)
    - [`is_attackable(contract_address: str) -> bool`](#is_attackablecontract_address-str---bool)
    - [`bc_deploy_create(init_code: bytes) -> str`](#bc_deploy_createinit_code-bytes---str)
    - [`bc_deploy(deployer, *args)` and `build_init_code(deployer, *args)`](#bc_deploydeployer-args-and-build_init_codedeployer-args)
    - [`default_agreement_details(...)` and friends](#default_agreement_details-and-friends)
    - [Network overrides](#network-overrides)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

```bash
uv add battlechain-lib-py
# or
pip install battlechain-lib-py
```

Requires Python ≥ 3.11.

## Quick start

A minimal Moccasin script that deploys a contract, creates a Safe Harbor agreement,
adopts it, and requests attack mode:

```python
import boa
from eth_utils import keccak

import battlechain as bc
from src import MyVault  # your Vyper contract


def moccasin_main() -> None:
    # 1. Deploy through BattleChainDeployer (auto-registers with AttackRegistry)
    vault = MyVault.deploy()
    bc.track_deployment(vault.address)

    # 2. Build agreement defaults — chain ID, CAIP-2 scope, and Safe Harbor URI
    #    are all picked automatically based on the active boa env.
    details = bc.default_agreement_details(
        protocol_name="MyProtocol",
        contacts=[bc.Contact(name="Security Team", contact="sec@example.xyz")],
        contracts=bc.deployed_contracts(),
        recovery_address=boa.env.eoa,
        chain_id=bc.TESTNET_CHAIN_ID,
    )

    # 3. Create + 14-day commitment + adopt, all in one call
    agreement = bc.create_and_adopt_agreement(
        details, owner=boa.env.eoa, salt=keccak(b"v1")
    )

    # 4. Enter attack mode — only valid on BattleChain
    bc.request_attack_mode(agreement)

    # 5. Verify source on the block explorer
    bc.verify_contract(vault.address, "src/MyVault.vy:MyVault", "0.4.0")
```

Run with `mox run script/deploy.py --network battlechain`.

## What's included

| Module                       | Mirrors                        | What it does                                                                |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `battlechain.config`         | `src/BCConfig.sol`             | Chain IDs, CAIP-2 ids, addresses, Safe Harbor URIs, override registration   |
| `battlechain.types`          | `src/types/AgreementTypes.sol` | `AgreementDetails`, `BountyTerms`, `BcAccount`, `BcChain`, `AgreementState` |
| `battlechain.abi`            | forge artifacts (`out/`)       | Auto-generated ABI fragments                                                |
| `battlechain.builders`       | `BCSafeHarbor` builders        | `default_bounty_terms`, `default_agreement_details`, …                      |
| `battlechain.deploy`         | `src/BCDeploy.sol`             | `bc_deploy_create` / `_create2` / `_create3` + tracked deployments          |
| `battlechain.safe_harbor`    | `src/BCSafeHarbor.sol`         | `create_and_adopt_agreement`, `request_attack_mode`, …                      |
| `battlechain.query`          | `src/BCQuery.sol`              | `is_attackable` (off-chain explorer API) + on-chain primitives              |
| `battlechain.verify`         | starter `verify_contract.py`   | Source verification via the explorer's Etherscan-compatible API             |
| `battlechain.errors`         | Solidity custom errors         | Typed exceptions: `NotBattleChainError`, `ApiFailedError`, …                |
| `battlechain.createx_chains` | `src/CreateXChains.sol`        | Registry of CreateX-supported chains                                        |

## Supported networks

| Network | Chain ID | RPC                              | Status    |
| ------- | -------- | -------------------------------- | --------- |
| Mainnet | 626      | `https://mainnet.battlechain.com` | Available |
| Testnet | 627      | `https://testnet.battlechain.com` | Available |

Both networks have a block explorer, so the explorer-backed helpers
(`is_attackable`, `verify_contract`) work on mainnet and testnet:

- Mainnet: <https://explorer.mainnet.battlechain.com/>
- Testnet: <https://explorer.testnet.battlechain.com/>

### Mainnet (626) addresses

| Contract                        | Address                                      |
| ------------------------------- | -------------------------------------------- |
| Safe Harbor Registry (proxy)    | `0xd229f4EE1bAE432010b72a9d1bD682570F4C6eBe` |
| Registry Implementation         | `0xBFF0ec94740c287932B50E64c2e8b380129B99a1` |
| Agreement Factory (proxy)       | `0xCdB7F5C0F708baBaabE82afE1DbA8362023AcFdd` |
| AgreementFactory Implementation | `0x8d4fEDF4462E3876Ae7C70CC0C5cebA482003Ad5` |
| Attack Registry (proxy)         | `0x24876e481eC7198CAC95af739Df2a852CE65A415` |
| AttackRegistry Implementation   | `0x03A3228A4ce38362289E715bbc26Cac8b98e421B` |
| BattleChainDeployer             | `0xD12765D21dDba418B8Fc0583c4716763e03Aa078` |
| CreateX                         | `0xa397f06F07251A3AEd53f6d3019A2a6cbd83E53e` |
| Registry Moderator              | `0x445d5685c4Ae71550Da0716b82B434AEA140E0c7` |

Note: on BattleChain mainnet, CreateX is **not** at the well-known
`0xba5Ed0…` address — `create_x_address(626)` resolves the BattleChain
deployment above.

For local Anvil or unsupported chains, register addresses with `config.set_overrides`:

```python
import battlechain.config as cfg

cfg.set_overrides(
    chain_id=31337,
    registry="0x…",
    factory="0x…",
    attack_registry="0x…",
    deployer="0x…",
)
```

## Reference

### `is_attackable(contract_address: str) -> bool`

Mirrors `BCQuery.isAttackable`. Returns `True` if any Safe Harbor agreement
covering the contract is in `UNDER_ATTACK` or `PROMOTION_REQUESTED`. Resolves
coverage via the BattleChain block explorer (works for top-level **and** child
contracts).

```python
import battlechain as bc

if bc.is_attackable("0x…"):
    print("fair game under Safe Harbor")
```

For top-level-only on-chain checks (no HTTP), use `is_top_level_contract_under_attack`.

### `bc_deploy_create(init_code: bytes) -> str`

Routes through `BattleChainDeployer` on BattleChain (auto-registers with the
AttackRegistry) and through `CreateX` on any of the [190+ supported chains](./battlechain/createx_chains.py).
`bc_deploy_create2(salt, init_code)` and `bc_deploy_create3(salt, init_code)`
work the same way.

Every deploy is tracked — call `deployed_contracts()` to get them all and pass
straight into `default_agreement_details`.

### `bc_deploy(deployer, *args)` and `build_init_code(deployer, *args)`

Higher-level wrappers for boa-compiled contracts. `build_init_code` takes a
boa `VyperDeployer` (e.g. the symbol from `from src import MyContract`) plus
constructor args and returns the assembled init code — handy when paired with
`bc_deploy_create2` for deterministic addresses:

```python
salt = keccak(b"my-vault-v1")
init_code = bc.build_init_code(MyVault, token.address)
address = bc.bc_deploy_create2(salt, init_code)
```

`bc_deploy` does the full job in one call: builds init code, deploys via
`BattleChainDeployer` (CREATE), wraps the result back into a `VyperContract`,
and persists the address to a per-chain JSON file (`.bc_deployments.json` by
default):

```python
vault = bc.bc_deploy(MyVault, token.address)
vault.deposit(amount)  # use it like any boa contract
```

Subsequent script runs can resolve the address with `get_tracked_address("MyVault")`
or fetch a wrapped contract instance with `get_tracked_contract(MyVault)`. The
JSON file exists because deployer-routed contracts perform their CREATE inside
`BattleChainDeployer`'s call context, so moccasin's `deployments.db` can't see
them.

### `default_agreement_details(...)` and friends

Build `AgreementDetails` with sensible defaults. On BattleChain it sets the
BattleChain CAIP-2 scope and `BATTLECHAIN_SAFE_HARBOR_URI`; on other chains it
falls back to the chain's `eip155:` scope and the generic Safe Harbor V3 URI.

The default bounty terms match `BCSafeHarbor.defaultBountyTerms`: 10%, $1M cap,
retainable, anonymous, no aggregate cap.

### Network overrides

Same pattern as `BCBase._setBcAddresses`: register override addresses for any
chain and they take precedence over the canonical registry.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev environment setup, the codegen
flow, and the test suite.

## License

Dual-licensed under [MIT](./LICENCE-MIT) and [Apache-2.0](./LICENCE-APACHE) at
your option.
