# battlechain-lib

Foundry library for deploying on [BattleChain](https://docs.battlechain.com) and adopting [Safe Harbor](https://docs.battlechain.com) agreements.

## Installation

```shell
forge install cyfrin/battlechain-lib
```

Add the remapping to your `foundry.toml`:

```toml
remappings = ["bc-lib/=lib/battlechain-lib/src/"]
```

## Quick Start

Inherit `BCScript` and implement the required hooks:

```solidity
import { BCScript } from "bc-lib/BCScript.sol";
import { Contact } from "bc-lib/types/AgreementTypes.sol";

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

If you're using an AI coding assistant (Claude Code, Cursor, Copilot, etc.), add the following to your project's `CLAUDE.md`, `.cursorrules`, or equivalent instructions file:

```markdown
This project deploys on BattleChain. Use context7 MCP to look up
the latest docs before writing or modifying deploy scripts:

1. Resolve the library ID: resolve-library-id("battlechain")
2. Query the docs: query-docs(id, "topic you need")

BattleChain docs: https://docs.battlechain.com
```

If your AI tool supports fetching URLs, point it at `https://docs.battlechain.com` for the latest protocol documentation, contract addresses, and integration guides.

## Development

```shell
forge build       # Build
forge test        # Run tests
forge fmt         # Format
```
