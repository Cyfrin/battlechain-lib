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

### Regenerate the generated modules

`battlechain/abi.py` and `battlechain/_contract_data.py` are **generated — do not
hand-edit them.** They derive from the committed artifacts the canonical
`@cyfrin/battlechain-lib` monorepo produces at its root (this package lives at
`packages/battlechain-lib-py/`):

- `abi.py` ← `../../abis/*.json` (raw contract ABIs)
- `_contract_data.py` ← `../../deployments.json` (addresses, chain IDs, CAIP-2
  ids, Safe Harbor URIs, CreateX chain lists)

Those root artifacts are themselves generated from the deployed Solidity in
[`battlechain-safe-harbor-contracts`](https://github.com/Cyfrin/battlechain-safe-harbor-contracts)
(the source of truth) by the monorepo's `scripts/codegen.mjs`. Regenerate the
Python side with:

```bash
just gen          # = gen-abi + gen-config
# or individually:
uv run python tools/gen_abi.py        # rewrites battlechain/abi.py from ../../abis
uv run python tools/gen_config.py     # rewrites battlechain/_contract_data.py from ../../deployments.json
```

Commit the regenerated files alongside the change that motivated them. A
`codegen-check` CI job re-runs every generator and fails on any drift, so the
committed output can't silently fall out of sync.

## Keeping in sync with the contracts

Addresses and ABIs are **generated**, so most "syncing" is automatic. The chain
of truth is: `battlechain-safe-harbor-contracts` (deployed contracts) →
`scripts/codegen.mjs` → `deployments.json` + `abis/` → this package's generators.

| What changed | What to do here |
| --- | --- |
| Contract addresses / chain IDs / URIs | nothing by hand — `just gen` regenerates `battlechain/_contract_data.py` from `../../deployments.json` |
| Interface ABIs | nothing by hand — `just gen` regenerates `battlechain/abi.py` from `../../abis/` |
| Behavior of a builder / action / query | edit the hand-written logic: `config.py`, `createx_chains.py`, `types.py`, `builders.py`, `safe_harbor.py`, `query.py`, `deploy.py`, `errors.py` |

Run `just gen` and commit the regenerated files. Add a test in
`tests/test_smoke.py` that pins the new behavior to a value from the canonical
artifacts — the cheapest way to catch silent drift.

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
