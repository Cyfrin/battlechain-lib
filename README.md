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

> **Note:** Hardhat support is still in development. The TypeScript exports and Solidity imports work, but the integration is not yet fully tested. Expect rough edges.

```shell
npm install @cyfrin/battlechain-lib
```

Add the remapping to your `hardhat.config` or `remappings.txt`:

```
battlechain-lib/=node_modules/@cyfrin/battlechain-lib/src/
```

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

| Network | Chain ID |
| ------- | -------- |
| Mainnet | 626      |
| Testnet | 627      |
| Devnet  | 624      |

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
