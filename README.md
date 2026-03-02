# Battlechain Template Repo (Foundry)

This template repo is a quick and easy way to get started with **BattleChain**. 

- Deploy your contracts through the BattleChain Deployer
- Create security agreements with sensible defaults
- Manage 'attack-mode' transitions

## Requirements

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  - You'll know you did it right if you can run `git --version` and you see a response like `git version x.x.x`
- [foundry](https://getfoundry.sh/)
  - You'll know you did it right if you can run `forge --version` and you see a response like `forge 0.2.0 (816e00b 2023-03-16T00:05:26.396218Z)`

## Installation

```shell
forge install Cyfrin/battlechain-lib
```

Add the remapping to `foundry.toml`:

```toml
remappings = ["bc-lib/=lib/battlechain-lib/src/"]
```

## Script Quick start

See [`script/Example.s.sol`](script/Example.s.sol) for a full working example.

## Run against the testnet

```shell
forge script script/Deploy.s.sol --fork-url <testnet-rpc> --broadcast
```

See [`script/Example.s.sol`](script/Example.s.sol) for a full working example.

## Modules

| Module | What it does |
|--------|-------------|
| **`BCConfig`** | Chain ID constants and contract address registry |
| **`BCBase`** | Abstract base that resolves BattleChain infrastructure addresses. Supports overrides for local testing |
| **`BCDeploy`** | `bcDeployCreate` / `bcDeployCreate2` / `bcDeployCreate3` wrappers that deploy through BattleChainDeployer and track all deployed addresses |
| **`BCSafeHarbor`** | Agreement builder with sensible defaults (10% bounty, $1M cap, 14-day commitment) plus registry and attack-mode helpers |
| **`BCBroadcastReader`** | Parses Foundry broadcast JSON files to extract deployed contract addresses |

## Interfaces

Located in `src/interfaces/`:

- `IAgreement` — agreement getters/setters
- `IAgreementFactory` — create new agreements
- `IBCSafeHarborRegistry` — adopt and validate agreements
- `IAttackRegistry` — request attack mode, go to production
- `IBCDeployer` — CREATE / CREATE2 / CREATE3 deployment and address computation

## Supported chains

| Network | Chain ID |
|---------|----------|
| Mainnet | *** |
| Testnet | 627 |

> Contract addresses are currently deployed on **testnet** only. Mainnet addresses will be added as they become available.

## Development

Requires [Foundry](https://book.getfoundry.sh/).

```shell
forge build      # compile
forge test       # run tests
forge fmt        # format code
```

## License

MIT
