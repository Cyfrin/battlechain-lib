# battlechain-lib

Foundry library for deploying on [BattleChain](https://docs.battlechain.com) and adopting [Safe Harbor](https://docs.battlechain.com) agreements.

## Installation

### Foundry

```shell
forge install cyfrin/battlechain-lib
```

Add the remapping to your `foundry.toml`:

```toml
remappings = ["battlechain-lib/=lib/battlechain-lib/src/"]
```

### npm / Hardhat (in development)

> **Note:** Hardhat support is still in development. The Solidity imports work, but the integration is not yet fully tested. Expect rough edges.

```shell
npm install @cyfrin/battlechain-lib
```

Add the remapping to your `hardhat.config` or `remappings.txt`:

```
battlechain-lib/=node_modules/@cyfrin/battlechain-lib/src/
```

This package ships Solidity source plus the language-neutral data artifacts
(`deployments.json` and `abis/`) — it has no JavaScript/TypeScript API.
JavaScript/TypeScript users should use
[`@cyfrin/battlechain-lib-js`](https://www.npmjs.com/package/@cyfrin/battlechain-lib-js)
instead, which exposes typed addresses, ABIs, and helpers.

## Using the data artifacts (viem, etc.)

`@cyfrin/battlechain-lib-js` (ethers) wraps the high-level flows. If you use
**viem** — or any other tool — you don't need a wrapper: consume the
`deployments.json` and `abis/` artifacts this package ships directly.

```ts
import { createPublicClient, getContract, http } from "viem";
import deployments from "@cyfrin/battlechain-lib/deployments.json" with { type: "json" };
import registryAbi from "@cyfrin/battlechain-lib/abis/registry.json" with { type: "json" };

const testnet = deployments.networks["627"]; // or "626" for mainnet

const client = createPublicClient({ transport: http("https://testnet.battlechain.com") });

const registry = getContract({
  address: testnet.registry as `0x${string}`,
  abi: registryAbi,
  client,
});

// e.g. look up an adopter's Safe Harbor agreement
const agreement = await registry.read.getAgreement([adopter]);
```

`deployments.json` carries every address, chain ID, CAIP-2 id, the Safe Harbor
URIs, explorer endpoints, and the CreateX chain lists for both networks. For full
viem type inference, declare the imported ABI `as const`.

## Quick Start

Inherit `BCScript` and implement the required hooks:

```solidity
import { BCScript } from "battlechain-lib/BCScript.sol";
import { Contact } from "battlechain-lib/types/AgreementTypes.sol";

contract Deploy is BCScript {
    function _protocolName() internal pure override returns (string memory) {
        return "MyProtocol";
    }

    function _contacts() internal pure override returns (Contact[] memory) {
        Contact[] memory c = new Contact[](1);
        c[0] = Contact({ name: "Security Team", contact: "security@example.xyz" });
        return c;
    }

    function _recoveryAddress() internal view override returns (address) {
        return msg.sender;
    }

    function run() external {
        vm.startBroadcast();

        // Deploy via BattleChainDeployer
        address token = bcDeployCreate(type(MyToken).creationCode);

        // Create agreement with defaults, adopt it, and enter attack mode
        address agreement = createAndAdoptAgreement(
            defaultAgreementDetails(
                _protocolName(), _contacts(), getDeployedContracts(), _recoveryAddress()
            ),
            msg.sender,
            keccak256("v1")
        );
        requestAttackMode(agreement);

        vm.stopBroadcast();
    }
}
```

See [`script/Example.s.sol`](script/Example.s.sol) for full examples including generic EVM deployment.

## What's Included

| Contract       | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `BCScript`     | Single import combining deploy + Safe Harbor helpers        |
| `BCDeploy`     | Deploy via `BattleChainDeployer` (CREATE, CREATE2, CREATE3) |
| `BCSafeHarbor` | Build and adopt Safe Harbor agreements                      |
| `BCConfig`     | On-chain address registry for BattleChain networks          |
| `BCBase`       | Shared base with address resolution and overrides           |

## Supported Networks

| Network | Chain ID | RPC URL                            |
| ------- | -------- | ---------------------------------- |
| Mainnet | 626      | `https://mainnet.battlechain.com`  |
| Testnet | 627      | `https://testnet.battlechain.com`  |

The core BattleChain contracts (registry, agreement factory, attack registry,
deployer) and CreateX are deployed on both networks — `BCConfig` resolves them
by chain ID. Block explorers: [explorer.mainnet.battlechain.com](https://explorer.mainnet.battlechain.com/)
and [explorer.testnet.battlechain.com](https://explorer.testnet.battlechain.com/).

For unsupported chains or local Anvil testing, use `_setBcAddresses()` to provide contract addresses manually.

## Documentation

Full BattleChain documentation: [docs.battlechain.com](https://docs.battlechain.com)

## Teach Your AI About BattleChain

**Claude Code:** Install the BattleChain skill:

```shell
npx skills add cyfrin/solskill --skill battlechain
```

**Other AI tools (Cursor, Copilot, etc.):** Add this to your `.cursorrules` or equivalent AI instructions file:

```markdown
This project deploys on BattleChain.

AI docs: https://docs.battlechain.com/llms-full.txt
```

BattleChain docs follow the [llms.txt convention](https://llmstxt.org/):

| URL | Contents |
| --- | -------- |
| [llms.txt](https://docs.battlechain.com/llms.txt) | Table of contents with page titles and links |
| [llms-full.txt](https://docs.battlechain.com/llms-full.txt) | Complete docs as clean markdown |

## Development

```shell
forge build       # Build
forge test        # Run tests
forge fmt         # Format
```
