/**
 * Regenerate src/contractData.gen.ts from the canonical battlechain-lib
 * deployments artifact.
 *
 * Source of truth: the ROOT-level deployments.json produced by canonical
 * codegen (../../deployments.json relative to this package). It carries
 * addresses, chain IDs, CAIP-2 strings, URIs, CreateX address, explorer hosts,
 * and the production/test CreateX chain-id lists.
 *
 * RPC URLs are off-chain infra (not in the deployments artifact); they are
 * sourced from the in-sync Python reference battlechain-lib-py/battlechain/
 * config.py and applied as a manual overlay below.
 *
 * Usage:
 *   npx tsx tools/gen-config.ts                          # defaults to ../../deployments.json
 *   npx tsx tools/gen-config.ts /path/to/deployments.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DEPLOYMENTS_PATH = path.resolve(__dirname, "..", "..", "..", "deployments.json");
const TARGET = path.resolve(__dirname, "..", "src", "contractData.gen.ts");

// -----------------------------------------------------------------------------
// Manual overlay: RPC URLs (off-chain infra, not declared in deployments.json).
// Source of truth: battlechain-lib-py/battlechain/config.py.
// -----------------------------------------------------------------------------
const RPC_URLS = {
  MAINNET_RPC_URL: "https://mainnet.battlechain.com",
  TESTNET_RPC_URL: "https://testnet.battlechain.com",
} as const;

interface NetworkDeployment {
  chainId: number;
  caip2: string;
  registry: string;
  agreementFactory: string;
  attackRegistry: string;
  deployer: string;
  createX: string;
  registryModerator?: string;
  mockRegistryModerator?: string;
  registryImpl: string;
  agreementFactoryImpl: string;
  attackRegistryImpl: string;
}

interface Deployments {
  wellKnownCreateX: string;
  safeHarborV3Uri: string;
  battlechainSafeHarborUri: string;
  networks: {
    [chainId: string]: NetworkDeployment | { [chainId: string]: string };
    _explorer: { [chainId: string]: string };
  };
  createx: {
    production: number[];
    test: number[];
  };
}

function readDeployments(file: string): Deployments {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing canonical deployments artifact: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as Deployments;
}

function getRequired<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing expected field ${name} in deployments.json`);
  }
  return value;
}

function renderSet(name: string, ids: number[], doc: string): string {
  const sorted = [...ids].sort((a, b) => a - b);
  const lines: string[] = [];
  let line = "  ";
  for (const id of sorted) {
    const next = `${id}, `;
    if (line.length + next.length > 96) {
      lines.push(line.trimEnd());
      line = "  ";
    }
    line += next;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return `${doc}\nexport const ${name}: ReadonlySet<number> = new Set([\n${lines.join("\n")}\n]);\n`;
}

function buildAddresses(deployments: Deployments): Record<string, string> {
  const mainnet = getRequired(
    deployments.networks["626"] as NetworkDeployment,
    "networks.626",
  );
  const testnet = getRequired(
    deployments.networks["627"] as NetworkDeployment,
    "networks.627",
  );

  return {
    WELL_KNOWN_CREATEX: getRequired(deployments.wellKnownCreateX, "wellKnownCreateX"),
    MAINNET_REGISTRY: getRequired(mainnet.registry, "networks.626.registry"),
    MAINNET_AGREEMENT_FACTORY: getRequired(
      mainnet.agreementFactory,
      "networks.626.agreementFactory",
    ),
    MAINNET_ATTACK_REGISTRY: getRequired(mainnet.attackRegistry, "networks.626.attackRegistry"),
    MAINNET_DEPLOYER: getRequired(mainnet.deployer, "networks.626.deployer"),
    MAINNET_CREATEX: getRequired(mainnet.createX, "networks.626.createX"),
    MAINNET_REGISTRY_IMPL: getRequired(mainnet.registryImpl, "networks.626.registryImpl"),
    MAINNET_AGREEMENT_FACTORY_IMPL: getRequired(
      mainnet.agreementFactoryImpl,
      "networks.626.agreementFactoryImpl",
    ),
    MAINNET_ATTACK_REGISTRY_IMPL: getRequired(
      mainnet.attackRegistryImpl,
      "networks.626.attackRegistryImpl",
    ),
    MAINNET_REGISTRY_MODERATOR: getRequired(
      mainnet.registryModerator,
      "networks.626.registryModerator",
    ),
    TESTNET_REGISTRY: getRequired(testnet.registry, "networks.627.registry"),
    TESTNET_AGREEMENT_FACTORY: getRequired(
      testnet.agreementFactory,
      "networks.627.agreementFactory",
    ),
    TESTNET_ATTACK_REGISTRY: getRequired(testnet.attackRegistry, "networks.627.attackRegistry"),
    TESTNET_DEPLOYER: getRequired(testnet.deployer, "networks.627.deployer"),
    TESTNET_CREATEX: getRequired(testnet.createX, "networks.627.createX"),
    TESTNET_REGISTRY_IMPL: getRequired(testnet.registryImpl, "networks.627.registryImpl"),
    TESTNET_AGREEMENT_FACTORY_IMPL: getRequired(
      testnet.agreementFactoryImpl,
      "networks.627.agreementFactoryImpl",
    ),
    TESTNET_ATTACK_REGISTRY_IMPL: getRequired(
      testnet.attackRegistryImpl,
      "networks.627.attackRegistryImpl",
    ),
    TESTNET_MOCK_REGISTRY_MODERATOR: getRequired(
      testnet.mockRegistryModerator,
      "networks.627.mockRegistryModerator",
    ),
  };
}

function renderModule(args: {
  deployments: Deployments;
  addresses: Record<string, string>;
}): string {
  const { deployments, addresses } = args;
  const mainnet = deployments.networks["626"] as NetworkDeployment;
  const testnet = deployments.networks["627"] as NetworkDeployment;
  const explorer = getRequired(deployments.networks._explorer, "networks._explorer");

  const addrNames = [
    "WELL_KNOWN_CREATEX",
    "MAINNET_REGISTRY",
    "MAINNET_AGREEMENT_FACTORY",
    "MAINNET_ATTACK_REGISTRY",
    "MAINNET_DEPLOYER",
    "MAINNET_CREATEX",
    "MAINNET_REGISTRY_IMPL",
    "MAINNET_AGREEMENT_FACTORY_IMPL",
    "MAINNET_ATTACK_REGISTRY_IMPL",
    "MAINNET_REGISTRY_MODERATOR",
    "TESTNET_REGISTRY",
    "TESTNET_AGREEMENT_FACTORY",
    "TESTNET_ATTACK_REGISTRY",
    "TESTNET_DEPLOYER",
    "TESTNET_CREATEX",
    "TESTNET_REGISTRY_IMPL",
    "TESTNET_AGREEMENT_FACTORY_IMPL",
    "TESTNET_ATTACK_REGISTRY_IMPL",
    "TESTNET_MOCK_REGISTRY_MODERATOR",
  ];

  const addrLines = addrNames
    .map((name) => `export const ${name} = "${addresses[name]}";`)
    .join("\n");

  const mainnetExplorer = getRequired(explorer["626"], "networks._explorer.626");
  const testnetExplorer = getRequired(explorer["627"], "networks._explorer.627");
  const prodIds = getRequired(deployments.createx.production, "createx.production");
  const testIds = getRequired(deployments.createx.test, "createx.test");

  return `/**
 * Contract data for BattleChain networks.
 *
 * Auto-generated by tools/gen-config.ts from the canonical battlechain-lib
 * deployments artifact (../../deployments.json). Do not edit manually —
 * regenerate with \`npm run gen-config\`. RPC URLs are a manual overlay sourced
 * from battlechain-lib-py/battlechain/config.py.
 */

/* oxlint-disable */

// -----------------------------------------------------------------------------
// Chain IDs (BCConfig.sol)
// -----------------------------------------------------------------------------

export const MAINNET_CHAIN_ID = ${getRequired(mainnet.chainId, "networks.626.chainId")};
export const TESTNET_CHAIN_ID = ${getRequired(testnet.chainId, "networks.627.chainId")};

// -----------------------------------------------------------------------------
// CAIP-2 chain ID strings (BCConfig.sol)
// -----------------------------------------------------------------------------

export const MAINNET_CAIP2 = "${getRequired(mainnet.caip2, "networks.626.caip2")}";
export const TESTNET_CAIP2 = "${getRequired(testnet.caip2, "networks.627.caip2")}";

// -----------------------------------------------------------------------------
// Safe Harbor agreement URIs (BCConfig.sol)
// -----------------------------------------------------------------------------

export const SAFE_HARBOR_V3_URI = "${getRequired(deployments.safeHarborV3Uri, "safeHarborV3Uri")}";
export const BATTLECHAIN_SAFE_HARBOR_URI = "${getRequired(deployments.battlechainSafeHarborUri, "battlechainSafeHarborUri")}";

// -----------------------------------------------------------------------------
// RPC URLs (manual overlay — off-chain infra from battlechain-lib-py)
// -----------------------------------------------------------------------------

export const MAINNET_RPC_URL = "${RPC_URLS.MAINNET_RPC_URL}";
export const TESTNET_RPC_URL = "${RPC_URLS.TESTNET_RPC_URL}";

// -----------------------------------------------------------------------------
// Block explorer hosts (BCQuery.sol)
// -----------------------------------------------------------------------------

export const MAINNET_EXPLORER_HOST = "${mainnetExplorer}";
export const TESTNET_EXPLORER_HOST = "${testnetExplorer}";

// -----------------------------------------------------------------------------
// Contract addresses (BCConfig.sol)
// -----------------------------------------------------------------------------

${addrLines}

// -----------------------------------------------------------------------------
// CreateX-supported chain IDs (CreateXChains.sol)
// -----------------------------------------------------------------------------

${renderSet("PRODUCTION_CHAIN_IDS", prodIds, "/** Production chains with CreateX at the well-known address. */")}
${renderSet("TEST_CHAIN_IDS", testIds, "/** Test/dev chains with CreateX at the well-known address. */")}`;
}

function main(): void {
  const args = process.argv.slice(2);
  const deploymentsPath = args[0] ? path.resolve(args[0]) : DEFAULT_DEPLOYMENTS_PATH;

  const deployments = readDeployments(deploymentsPath);
  const addresses = buildAddresses(deployments);

  const module = renderModule({ deployments, addresses });
  fs.writeFileSync(TARGET, module);
  console.log(`Wrote ${TARGET}`);
  console.log(
    `  addresses=${Object.keys(addresses).length}, production=${deployments.createx.production.length}, test=${deployments.createx.test.length}`,
  );
}

main();
