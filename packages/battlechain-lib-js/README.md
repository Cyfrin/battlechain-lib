# battlechain-lib-js

JS/TS library for deploying on [BattleChain](https://docs.battlechain.com) and adopting
[Safe Harbor](https://docs.battlechain.com) agreements. Mirrors
[`cyfrin/battlechain-lib`](https://github.com/Cyfrin/battlechain-lib) (Solidity)
and [`cyfrin/battlechain-lib-py`](https://github.com/Cyfrin/battlechain-lib-py) (Python).

ethers v6, designed for [Hardhat](https://hardhat.org/) scripts and standalone
scripts alike.

- [Installation](#installation)
- [Quick start](#quick-start)
- [What's included](#whats-included)
- [Supported networks](#supported-networks)
- [Reference](#reference)
- [Hardhat integration](#hardhat-integration)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install battlechain-lib-js ethers
# or
pnpm add battlechain-lib-js ethers
```

`ethers` v6 is a peer dependency.

Requires Node ≥ 20.

## Quick start

A minimal Hardhat script that deploys a contract via `BattleChainDeployer`,
creates a Safe Harbor agreement, adopts it, and requests attack mode:

```ts
import { ethers } from "ethers";
import { network } from "hardhat";

import * as bc from "battlechain-lib-js";
import VaultArtifact from "../artifacts/src/MyVault.sol/MyVault.json" with { type: "json" };

const { ethers: hethers } = await network.connect({ network: "battlechain", chainType: "l1" });
const [signer] = await hethers.getSigners();

// 1. Deploy through BattleChainDeployer (auto-registers with AttackRegistry)
const { address: vaultAddress } = await bc.bcDeploy(signer, {
  abi: VaultArtifact.abi,
  bytecode: VaultArtifact.bytecode,
  contractName: "MyVault",
});

// 2. Build agreement defaults — chain ID, CAIP-2 scope, and Safe Harbor URI
//    are picked automatically based on chainId.
const details = bc.defaultAgreementDetails({
  protocolName: "MyProtocol",
  contacts: [{ name: "Security Team", contact: "sec@example.xyz" }],
  contracts: bc.deployedContracts(),
  recoveryAddress: signer.address,
  chainId: bc.TESTNET_CHAIN_ID,
});

// 3. Create + 14-day commitment + adopt, all in one call
const salt = ethers.id("v1");
const agreementAddress = await bc.createAndAdoptAgreement(
  signer,
  details,
  signer.address,
  salt,
);

// 4. Enter attack mode — only valid on BattleChain
await bc.requestAttackMode(signer, agreementAddress);

// 5. Self-approve via the testnet MockRegistryModerator (state → UNDER_ATTACK).
//    Mainnet has no equivalent helper — approval is a real DAO governance action.
await bc.approveAttackRequest(signer, agreementAddress);
```

For Solidity verification, prefer the official
[`@nomicfoundation/hardhat-verify`](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify)
plugin. The lib's `verifyContract` is a Vyper-friendly fallback for
non-Hardhat scripts (parity with battlechain-lib-py).

## What's included

| Module                       | Mirrors                        | What it does                                                                |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `config`                     | `src/BCConfig.sol`             | Chain IDs, CAIP-2 ids, addresses, Safe Harbor URIs, override registration   |
| `types`                      | `src/types/AgreementTypes.sol` | `AgreementDetails`, `BountyTerms`, `BcAccount`, `BcChain`, `AgreementState` |
| `abi`                        | forge artifacts                | Auto-generated ABI fragments                                                |
| `builders`                   | `BCSafeHarbor` builders        | `defaultBountyTerms`, `defaultAgreementDetails`, …                          |
| `deploy`                     | `src/BCDeploy.sol`             | `bcDeployCreate` / `_create2` / `_create3` + tracked deployments JSON       |
| `safeHarbor`                 | `src/BCSafeHarbor.sol`         | `createAndAdoptAgreement`, `requestAttackMode`, …                           |
| `query`                      | `src/BCQuery.sol`              | `isAttackable` (off-chain explorer API) + on-chain primitives               |
| `verify`                     | `verifyContract.ts` fallback   | Vyper-friendly source verification via the explorer's API                   |
| `errors`                     | Solidity custom errors         | Typed exceptions: `NotBattleChainError`, `ApiFailedError`, …                |
| `createxChains`              | `src/CreateXChains.sol`        | Registry of CreateX-supported chains                                        |

## Supported networks

| Network | Chain ID | Status                  |
| ------- | -------- | ----------------------- |
| Mainnet | 626      | TBD (addresses pending) |
| Testnet | 627      | Available               |

For local Anvil/Hardhat or unsupported chains, register addresses with `setOverrides`:

```ts
import * as bc from "battlechain-lib-js";

bc.setOverrides(31337, {
  registry: "0x…",
  factory: "0x…",
  attackRegistry: "0x…",
  deployer: "0x…",
});
```

## Reference

### `bcDeploy(signer, artifact, args?, opts?)`

Routes the deploy through `BattleChainDeployer` on BattleChain (auto-registers
with the AttackRegistry) and through `CreateX` on any of the
[190+ supported chains](./src/createxChains.ts). Persists the deployed address
to a per-chain JSON file (`.bc_deployments.json` by default) so subsequent
script runs can resolve it via `getTrackedAddress(name, chainId)` or
`getTrackedContract(name, abi, runner, chainId)`.

The JSON file exists because deployer-routed contracts perform their CREATE
inside `BattleChainDeployer`'s call context, so Hardhat's deployment tooling
(ignition, hardhat-deploy) doesn't see them. Use Hardhat's deployment system
for vanilla deploys; use `bcDeploy` only for the contracts that **must** route
through `BCDeployer` (so the AttackRegistry recognizes them as top-level).

### `bcDeployCreate / bcDeployCreate2 / bcDeployCreate3`

Lower-level: take raw `initCode` (and `salt` for CREATE2/3) and return the new
address. Pair `bcDeployCreate2` with `buildInitCode(artifact, args)` for
deterministic addresses.

### `defaultAgreementDetails(opts)` and friends

Build `AgreementDetails` with sensible defaults. On BattleChain it sets the
BattleChain CAIP-2 scope and `BATTLECHAIN_SAFE_HARBOR_URI`; on other chains it
falls back to the chain's `eip155:` scope and the generic Safe Harbor V3 URI.

The default bounty terms match `BCSafeHarbor.defaultBountyTerms`: 10%, $1M cap,
retainable, anonymous, no aggregate cap.

### `approveAttackRequest(signer, agreementAddress)`

On testnet, calls the permissionless `MockRegistryModerator` at
`0x1bC64E6F187a47D136106784f4E9182801535BD3` to self-approve an attack-mode
request — moves the agreement from `ATTACK_REQUESTED` (2) to `UNDER_ATTACK`
(3). Mirrors the `cast send <moderator> "approveAttack(address)"` flow from
the BattleChain testnet docs. Throws on mainnet (where approval is a real DAO
governance action).

### `isAttackable(runner, contractAddress)`

Mirrors `BCQuery.isAttackable`. Returns `true` if any Safe Harbor agreement
covering the contract is in `UNDER_ATTACK` or `PROMOTION_REQUESTED`. Resolves
coverage via the BattleChain block explorer (works for top-level **and** child
contracts).

For top-level-only on-chain checks (no HTTP), use `isTopLevelContractUnderAttack`.

### Network overrides

Same pattern as `BCBase._setBcAddresses`: register override addresses for any
chain and they take precedence over the canonical registry.

## Hardhat integration

For Hardhat 3 starters, see
[`cyfrin/hardhat-battlechain-starter`](https://github.com/Cyfrin/hardhat-battlechain-starter).
The starter uses:

- **hardhat-ignition** for vanilla deploys (`MockToken`, `Attacker`)
- **`bcDeploy`** for `VulnerableVault` (must route through BCDeployer)
- **hardhat-verify** for contract verification (no custom verify script)

This matches how `cyfrin/vyper-template` uses moccasin's `deployments.db` for
vanilla deploys and `.bc_deployments.json` for BCDeployer-routed deploys.

## Contributing

```bash
npm install
npm run build
npm test
```

To regenerate `src/abi.ts` from a fresh forge build of `cyfrin/battlechain-lib`:

```bash
npm run gen-abi -- /path/to/battlechain-lib
```

## License

Dual-licensed under [MIT](./LICENCE-MIT) and [Apache-2.0](./LICENCE-APACHE) at
your option.
