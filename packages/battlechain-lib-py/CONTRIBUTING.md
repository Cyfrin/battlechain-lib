# Contributing to battlechain-lib-py

Thanks for helping out. This doc covers the dev environment, the codegen flow
that keeps us in sync with the Solidity lib, and the test/lint workflow.

- [Prerequisites](#prerequisites)
- [Dev environment](#dev-environment)
- [Project layout](#project-layout)
- [Common tasks](#common-tasks)
  - [Run tests](#run-tests)
  - [Lint and format](#lint-and-format)
  - [Type-check](#type-check)
  - [Regenerate the ABI module](#regenerate-the-abi-module)
- [Keeping in sync with battlechain-lib (Solidity)](#keeping-in-sync-with-battlechain-lib-solidity)
- [Conventions](#conventions)
- [Filing issues / PRs](#filing-issues--prs)

## Prerequisites

| Tool                                            | Why                                                |
| ----------------------------------------------- | -------------------------------------------------- |
| [`uv`](https://docs.astral.sh/uv/)              | Python toolchain (env, deps, runner)               |
| [`just`](https://github.com/casey/just)         | Task runner — the `justfile` wraps common commands |
| [Foundry](https://book.getfoundry.sh/)          | Required to regenerate `abi.py` from forge artifacts |

Python ≥ 3.11 is required (the project pins 3.13 via `.python-version`).

## Dev environment

```bash
# Clone alongside battlechain-lib (the codegen looks for ../battlechain-lib by default)
git clone https://github.com/Cyfrin/battlechain-lib-py
cd battlechain-lib-py

# Install deps + the package in editable mode
uv sync
```

That's it — `uv sync` resolves dependencies from `uv.lock`, creates `.venv/`,
and installs the package in editable mode so your changes are picked up
immediately.

Use `uv run <cmd>` to run anything in the project env (`uv run pytest`,
`uv run python -c "..."`).

## Project layout

```
battlechain/            ← the library
  __init__.py             public API re-exports
  _boa.py                 internal: boa contract loaders
  abi.py                  AUTO-GENERATED — see codegen flow below
  builders.py             agreement builders (mirrors BCSafeHarbor builders)
  config.py               chain IDs, addresses, overrides (mirrors BCConfig.sol)
  createx_chains.py       CreateX-supported chain registry
  deploy.py               bcDeployCreate/2/3 + tracked deployments (BCDeploy.sol)
  errors.py               typed exceptions mirroring Solidity custom errors
  query.py                isAttackable + on-chain primitives (BCQuery.sol)
  safe_harbor.py          create/adopt/attack-mode helpers (BCSafeHarbor.sol)
  types.py                agreement dataclasses + AgreementState enum
  verify.py               block-explorer source verification

tests/                   pytest test suite (no RPC required)
tools/
  gen_abi.py             regenerates battlechain/abi.py from forge artifacts
justfile                 common commands wrapped for `just`
pyproject.toml           project metadata + tool config (ruff, hatchling)
```

## Common tasks

The `justfile` wraps the everyday flow. Run `just` with no args to list targets.

### Run tests

```bash
just test
# or:
uv run pytest -v
```

The smoke tests don't require an RPC or boa environment — they stub the
explorer and verify pure-Python correctness (constants, dataclass shapes,
builders, `is_attackable` against the BCQuery test fixtures).

### Lint and format

```bash
just format          # ruff: organize imports + auto-fix
just format-check    # ruff: report only, no writes
```

Lint rules are configured in `pyproject.toml` under `[tool.ruff]`. Line length
is 100; selected rule sets are `E`, `F`, `I`, `UP`, `B`, `SIM`.

### Type-check

```bash
just ty
# or:
uvx ty check
```

We use [`ty`](https://github.com/astral-sh/ty), Astral's static type checker.

### Regenerate the ABI module

`battlechain/abi.py` is auto-generated from forge build artifacts in the
sibling `battlechain-lib` Solidity repo. Whenever the Solidity interfaces
change, regenerate:

```bash
# Defaults to ../battlechain-lib
uv run python tools/gen_abi.py

# Or point at a specific working copy
uv run python tools/gen_abi.py /path/to/battlechain-lib

# Skip `forge build` if you've already built (faster iteration)
uv run python tools/gen_abi.py --no-build
```

The script:
1. Runs `forge build` inside the Solidity repo (unless `--no-build`).
2. Reads `out/<Iface>.sol/<Iface>.json` for each interface (`IAgreementFactory`,
   `IAgreement`, `IAttackRegistry`, `IBCSafeHarborRegistry`, `IBCDeployer`).
3. Extracts the `.abi` field from each artifact.
4. Renders `battlechain/abi.py` with the standard ABI list-of-dicts shape that
   boa and web3.py both accept.

Commit the regenerated `abi.py` alongside any code changes that motivated it.

## Keeping in sync with battlechain-lib (Solidity)

This library mirrors the public surface of
[`cyfrin/battlechain-lib`](https://github.com/Cyfrin/battlechain-lib). When the
Solidity lib changes, here's what to update:

| Solidity change              | Python update                                                         |
| ---------------------------- | --------------------------------------------------------------------- |
| `BCConfig.sol` addresses     | `battlechain/config.py` constants + `bc_mainnet` / `bc_testnet`       |
| `AgreementTypes.sol`         | `battlechain/types.py` dataclasses/enums                              |
| Interface methods            | Run `tools/gen_abi.py` to refresh `battlechain/abi.py`                |
| `BCSafeHarbor.sol` builders  | `battlechain/builders.py` + corresponding `safe_harbor.py` actions    |
| `BCDeploy.sol` helpers       | `battlechain/deploy.py`                                               |
| `BCQuery.sol` predicates     | `battlechain/query.py` (Python uses HTTP directly instead of FFI)     |
| `CreateXChains.sol` chain list | `battlechain/createx_chains.py` `PRODUCTION_CHAIN_IDS` / `TEST_CHAIN_IDS` |
| New custom errors            | `battlechain/errors.py`                                               |

Add a test in `tests/test_smoke.py` that pins the new behavior to a value from
the Solidity source — that's the cheapest way to catch silent drift.

## Conventions

- **Boa-first.** Action helpers (`deploy.py`, `safe_harbor.py`, `query.py`)
  use boa for contract calls. They go through the `_boa` module, which
  centralizes ABI loading. If you need a non-boa client, import `abi` and
  `config` directly and load contracts yourself.
- **Address case matches Solidity.** When serializing addresses into agreement
  details, we use lowercase 0x-hex (matching `vm.toString(address)` from
  forge-std), not EIP-55 checksum. Don't use `to_checksum_address` in the
  builders — it produces different bytes than the Solidity lib.
- **Frozen dataclasses for value types.** `AgreementDetails`, `BountyTerms`,
  `BcChain`, etc. are immutable. Each exposes a `to_tuple()` method that
  produces the positional shape boa's `loads_abi` expects.
- **No premature abstractions.** If a function is used only by the Solidity
  lib in one place, it's used in one place here too. Mirror first, refactor
  later.
- **Auto-generated files have a header.** Anything generated by `tools/`
  must start with a comment pointing to the generator, so a future contributor
  doesn't hand-edit it.

## Filing issues / PRs

- Open issues at <https://github.com/Cyfrin/battlechain-lib-py/issues>.
- For PRs, please include:
  - A test that fails before your change (when adding a feature or fix).
  - `just format-check` and `just test` passing locally.
  - If you regenerated `abi.py`, mention the `battlechain-lib` commit you
    pulled from.
