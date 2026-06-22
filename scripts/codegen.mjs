#!/usr/bin/env node

/**
 * Generates TypeScript from Solidity build artifacts and source.
 *
 * Reads:
 *   - out/<Interface>.sol/<Interface>.json  (ABI JSON from forge build)
 *   - src/BCConfig.sol                      (addresses, chain IDs, URIs)
 *   - src/types/AgreementTypes.sol          (enum definitions)
 *
 * Writes:
 *   - ts/abi.ts        (typed ABI constants for every interface)
 *   - ts/config.ts     (network configs mirroring BCConfig.sol)
 *   - ts/types.ts      (enums + TypeScript interfaces for Solidity structs)
 *   - deployments.json (language-neutral source-of-truth deployment artifact)
 *   - abis/<name>.json (one framework-agnostic raw ABI JSON per interface)
 *
 * The deployments.json and abis/ outputs are generated but COMMITTED, so that
 * downstream consumers and the staleness guard can read them without running
 * forge. Do not edit them by hand — re-run this script instead.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const SRC = join(ROOT, "src");
const TS = join(ROOT, "ts");
const ABIS = join(ROOT, "abis");

mkdirSync(TS, { recursive: true });
mkdirSync(ABIS, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readAbi(contractDir, contractName) {
  const path = join(OUT, contractDir, `${contractName}.json`);
  const json = JSON.parse(readFileSync(path, "utf-8"));
  return json.abi;
}

function formatAbiJson(abi) {
  return JSON.stringify(abi, null, 2);
}

/** Parse `type Foo { A, B, C }` enums from Solidity source. */
function parseEnums(soliditySource) {
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  const enums = [];
  let match;
  while ((match = enumRegex.exec(soliditySource)) !== null) {
    const name = match[1];
    const members = match[2]
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    enums.push({ name, members });
  }
  return enums;
}

/** Parse `address internal constant NAME = 0x...;` from BCConfig.sol. */
function parseAddressConstants(source) {
  const regex =
    /address\s+internal\s+constant\s+(\w+)\s*=\s*(0x[0-9a-fA-F]+)\s*;/g;
  const constants = {};
  let match;
  while ((match = regex.exec(source)) !== null) {
    constants[match[1]] = match[2];
  }
  return constants;
}

/** Parse `uint256 internal constant NAME = N;` from BCConfig.sol. */
function parseUintConstants(source) {
  const regex =
    /uint256\s+internal\s+constant\s+(\w+)\s*=\s*(\d+)\s*;/g;
  const constants = {};
  let match;
  while ((match = regex.exec(source)) !== null) {
    constants[match[1]] = Number(match[2]);
  }
  return constants;
}

/** Parse `string internal constant NAME = "...";` from BCConfig.sol. */
function parseStringConstants(source) {
  const regex =
    /string\s+internal\s+constant\s+(\w+)\s*=\s*\n?\s*"([^"]+)"\s*;/g;
  const constants = {};
  let match;
  while ((match = regex.exec(source)) !== null) {
    constants[match[1]] = match[2];
  }
  return constants;
}

/**
 * Parse the chain IDs listed in a `_isProductionChain` / `_isTestChain`
 * function body from CreateXChains.sol. Numbers use Solidity's `_` digit
 * separators (e.g. `13_371`), which are stripped before parsing.
 *
 * @param {string} source CreateXChains.sol contents.
 * @param {string} fnName Name of the private function to extract IDs from.
 * @returns {number[]} Numerically sorted chain IDs.
 */
function parseCreateXChainIds(source, fnName) {
  const fnRegex = new RegExp(
    `function\\s+${fnName}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\s*\\}`,
  );
  const fnMatch = fnRegex.exec(source);
  if (!fnMatch) {
    throw new Error(`Could not find ${fnName} in CreateXChains.sol`);
  }
  const body = fnMatch[1];
  const idRegex = /chainId\s*==\s*([\d_]+)/g;
  const ids = [];
  let match;
  while ((match = idRegex.exec(body)) !== null) {
    ids.push(Number(match[1].replace(/_/g, "")));
  }
  return ids.sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Generate ts/abi.ts
// ---------------------------------------------------------------------------

const interfaces = [
  {
    dir: "IAgreementFactory.sol",
    name: "IAgreementFactory",
    exportName: "agreementFactoryAbi",
  },
  {
    dir: "IAgreement.sol",
    name: "IAgreement",
    exportName: "agreementAbi",
  },
  {
    dir: "IAttackRegistry.sol",
    name: "IAttackRegistry",
    exportName: "attackRegistryAbi",
  },
  {
    dir: "IBCSafeHarborRegistry.sol",
    name: "IBCSafeHarborRegistry",
    exportName: "registryAbi",
  },
  {
    dir: "IBCDeployer.sol",
    name: "IBCDeployer",
    exportName: "deployerAbi",
  },
  {
    dir: "IRegistryModerator.sol",
    name: "IRegistryModerator",
    exportName: "registryModeratorAbi",
  },
];

let abiTs = `/**
 * AUTO-GENERATED by scripts/codegen.mjs — do not edit manually.
 * Source: forge build artifacts in out/
 */

import type { Abi } from "viem";

`;

for (const iface of interfaces) {
  const abi = readAbi(iface.dir, iface.name);
  abiTs += `export const ${iface.exportName} = ${formatAbiJson(abi)} as const satisfies Abi;\n\n`;
}

writeFileSync(join(TS, "abi.ts"), abiTs);
console.log("wrote ts/abi.ts");

// ---------------------------------------------------------------------------
// Generate ts/config.ts
// ---------------------------------------------------------------------------

const bcConfigSource = readFileSync(
  join(SRC, "BCConfig.sol"),
  "utf-8",
);

const addresses = parseAddressConstants(bcConfigSource);
const uints = parseUintConstants(bcConfigSource);
const strings = parseStringConstants(bcConfigSource);

let configTs = `/**
 * AUTO-GENERATED by scripts/codegen.mjs — do not edit manually.
 * Source: src/BCConfig.sol
 */

import type { Address } from "viem";
import type { BcNetworkConfig } from "./types.js";

// Well-known addresses
export const WELL_KNOWN_CREATEX: Address = "${addresses.WELL_KNOWN_CREATEX}";
${addresses.MAINNET_CREATEX ? `export const MAINNET_CREATEX: Address = "${addresses.MAINNET_CREATEX}";\n` : ""}
// URIs
export const SAFE_HARBOR_V3_URI = "${strings.SAFE_HARBOR_V3_URI}";
export const BATTLECHAIN_SAFE_HARBOR_URI = "${strings.BATTLECHAIN_SAFE_HARBOR_URI}";

`;

// Build network configs from parsed constants.
const networks = [
  {
    exportName: "bcTestnet",
    chainId: uints.TESTNET_CHAIN_ID,
    caip2: strings.TESTNET_CAIP2,
    registry: addresses.TESTNET_REGISTRY,
    factory: addresses.TESTNET_AGREEMENT_FACTORY,
    attackRegistry: addresses.TESTNET_ATTACK_REGISTRY,
    deployer: addresses.TESTNET_DEPLOYER,
    createX: addresses.TESTNET_CREATEX,
    safeHarborUri: strings.BATTLECHAIN_SAFE_HARBOR_URI,
  },
];

// Only emit mainnet if it has addresses in BCConfig.sol
if (addresses.MAINNET_REGISTRY) {
  networks.unshift({
    exportName: "bcMainnet",
    chainId: uints.MAINNET_CHAIN_ID,
    caip2: strings.MAINNET_CAIP2,
    registry: addresses.MAINNET_REGISTRY,
    factory: addresses.MAINNET_AGREEMENT_FACTORY,
    attackRegistry: addresses.MAINNET_ATTACK_REGISTRY,
    deployer: addresses.MAINNET_DEPLOYER,
    createX: addresses.MAINNET_CREATEX || addresses.WELL_KNOWN_CREATEX,
    safeHarborUri: strings.BATTLECHAIN_SAFE_HARBOR_URI,
  });
}

for (const net of networks) {
  configTs += `export const ${net.exportName}: BcNetworkConfig = {
  chainId: ${net.chainId},
  caip2: "${net.caip2}",
  registry: "${net.registry}",
  factory: "${net.factory}",
  attackRegistry: "${net.attackRegistry}",
  deployer: "${net.deployer}",
  createX: "${net.createX}",
  safeHarborUri: "${net.safeHarborUri}",
};\n\n`;
}

// Export chain ID constants for convenience
configTs += `// Chain IDs
export const BC_MAINNET_CHAIN_ID = ${uints.MAINNET_CHAIN_ID};
export const BC_TESTNET_CHAIN_ID = ${uints.TESTNET_CHAIN_ID};

export function isBattleChain(chainId: number): boolean {
  return chainId === BC_MAINNET_CHAIN_ID || chainId === BC_TESTNET_CHAIN_ID;
}
`;

writeFileSync(join(TS, "config.ts"), configTs);
console.log("wrote ts/config.ts");

// ---------------------------------------------------------------------------
// Generate ts/types.ts
// ---------------------------------------------------------------------------

const agreementTypesSource = readFileSync(
  join(SRC, "types", "AgreementTypes.sol"),
  "utf-8",
);

const enums = parseEnums(agreementTypesSource);

let typesTs = `/**
 * AUTO-GENERATED by scripts/codegen.mjs — do not edit manually.
 * Source: src/types/AgreementTypes.sol, src/BCConfig.sol
 */

import type { Address } from "viem";

`;

// Emit enums as const objects + type aliases (idiomatic TS for numeric enums)
for (const e of enums) {
  typesTs += `export const ${e.name} = {\n`;
  for (let i = 0; i < e.members.length; i++) {
    typesTs += `  ${e.members[i]}: ${i},\n`;
  }
  typesTs += `} as const;\n`;
  typesTs += `export type ${e.name} =\n  (typeof ${e.name})[keyof typeof ${e.name}];\n\n`;
}

// Emit struct interfaces — these match the Solidity structs field-for-field.
// Addresses are strings in the Solidity structs (BcAccount.accountAddress,
// BcChain.assetRecoveryAddress) so we mirror that here.
typesTs += `export interface Contact {
  readonly name: string;
  readonly contact: string;
}

export interface BcAccount {
  readonly accountAddress: string;
  readonly childContractScope: ChildContractScope;
}

export interface BcChain {
  readonly assetRecoveryAddress: string;
  readonly accounts: readonly BcAccount[];
  readonly caip2ChainId: string;
}

export interface BountyTerms {
  readonly bountyPercentage: bigint;
  readonly bountyCapUsd: bigint;
  readonly retainable: boolean;
  readonly identity: IdentityRequirements;
  readonly diligenceRequirements: string;
  readonly aggregateBountyCapUsd: bigint;
}

export interface AgreementDetails {
  readonly protocolName: string;
  readonly contactDetails: readonly Contact[];
  readonly chains: readonly BcChain[];
  readonly bountyTerms: BountyTerms;
  readonly agreementURI: string;
}

export interface BcNetworkConfig {
  readonly chainId: number;
  readonly caip2: string;
  readonly registry: Address;
  readonly factory: Address;
  readonly attackRegistry: Address;
  readonly deployer: Address;
  readonly createX: Address;
  readonly safeHarborUri: string;
}
`;

writeFileSync(join(TS, "types.ts"), typesTs);
console.log("wrote ts/types.ts");

// ---------------------------------------------------------------------------
// Generate deployments.json
// ---------------------------------------------------------------------------

const createXChainsSource = readFileSync(
  join(SRC, "CreateXChains.sol"),
  "utf-8",
);
const bcQuerySource = readFileSync(join(SRC, "BCQuery.sol"), "utf-8");
const explorerApis = parseStringConstants(bcQuerySource);

const deployments = {
  _comment:
    "Auto-generated from src/BCConfig.sol and src/CreateXChains.sol by scripts/codegen.mjs. Do not edit by hand.",
  wellKnownCreateX: addresses.WELL_KNOWN_CREATEX,
  safeHarborV3Uri: strings.SAFE_HARBOR_V3_URI,
  battlechainSafeHarborUri: strings.BATTLECHAIN_SAFE_HARBOR_URI,
  networks: {
    [String(uints.MAINNET_CHAIN_ID)]: {
      chainId: uints.MAINNET_CHAIN_ID,
      caip2: strings.MAINNET_CAIP2,
      registry: addresses.MAINNET_REGISTRY,
      agreementFactory: addresses.MAINNET_AGREEMENT_FACTORY,
      attackRegistry: addresses.MAINNET_ATTACK_REGISTRY,
      deployer: addresses.MAINNET_DEPLOYER,
      createX: addresses.MAINNET_CREATEX,
      registryModerator: addresses.MAINNET_REGISTRY_MODERATOR,
      registryImpl: addresses.MAINNET_REGISTRY_IMPL,
      agreementFactoryImpl: addresses.MAINNET_AGREEMENT_FACTORY_IMPL,
      attackRegistryImpl: addresses.MAINNET_ATTACK_REGISTRY_IMPL,
    },
    [String(uints.TESTNET_CHAIN_ID)]: {
      chainId: uints.TESTNET_CHAIN_ID,
      caip2: strings.TESTNET_CAIP2,
      registry: addresses.TESTNET_REGISTRY,
      agreementFactory: addresses.TESTNET_AGREEMENT_FACTORY,
      attackRegistry: addresses.TESTNET_ATTACK_REGISTRY,
      deployer: addresses.TESTNET_DEPLOYER,
      createX: addresses.TESTNET_CREATEX,
      mockRegistryModerator: addresses.TESTNET_MOCK_REGISTRY_MODERATOR,
      registryImpl: addresses.TESTNET_REGISTRY_IMPL,
      agreementFactoryImpl: addresses.TESTNET_AGREEMENT_FACTORY_IMPL,
      attackRegistryImpl: addresses.TESTNET_ATTACK_REGISTRY_IMPL,
    },
    _explorer: {
      [String(uints.MAINNET_CHAIN_ID)]: explorerApis.MAINNET_EXPLORER_API,
      [String(uints.TESTNET_CHAIN_ID)]: explorerApis.TESTNET_EXPLORER_API,
    },
  },
  createx: {
    production: parseCreateXChainIds(createXChainsSource, "_isProductionChain"),
    test: parseCreateXChainIds(createXChainsSource, "_isTestChain"),
  },
};

writeFileSync(
  join(ROOT, "deployments.json"),
  `${JSON.stringify(deployments, null, 2)}\n`,
);
console.log("wrote deployments.json");

// ---------------------------------------------------------------------------
// Generate abis/<name>.json
// ---------------------------------------------------------------------------

const abiFiles = [
  { dir: "IAgreementFactory.sol", name: "IAgreementFactory", file: "agreementFactory.json" },
  { dir: "IAgreement.sol", name: "IAgreement", file: "agreement.json" },
  { dir: "IAttackRegistry.sol", name: "IAttackRegistry", file: "attackRegistry.json" },
  { dir: "IBCSafeHarborRegistry.sol", name: "IBCSafeHarborRegistry", file: "registry.json" },
  { dir: "IBCDeployer.sol", name: "IBCDeployer", file: "deployer.json" },
  { dir: "IRegistryModerator.sol", name: "IRegistryModerator", file: "registryModerator.json" },
];

for (const { dir, name, file } of abiFiles) {
  const abi = readAbi(dir, name);
  writeFileSync(join(ABIS, file), `${formatAbiJson(abi)}\n`);
}
console.log(`wrote abis/ (${abiFiles.length} files)`);

console.log("codegen complete");
