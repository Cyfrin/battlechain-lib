#!/usr/bin/env node

/**
 * Generates language-neutral data artifacts from Solidity build artifacts and source.
 *
 * Reads:
 *   - out/<Interface>.sol/<Interface>.json  (ABI JSON from forge build)
 *   - src/BCConfig.sol                      (addresses, chain IDs, URIs)
 *   - src/CreateXChains.sol                 (CreateX chain lists)
 *   - src/BCQuery.sol                       (explorer API endpoints)
 *
 * Writes:
 *   - deployments.json (language-neutral source-of-truth deployment artifact)
 *   - abis/<name>.json (one framework-agnostic raw ABI JSON per interface)
 *
 * These outputs are generated but COMMITTED, so that downstream consumers and
 * the staleness guard can read them without running forge. Do not edit them by
 * hand — re-run this script instead.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const SRC = join(ROOT, "src");
const ABIS = join(ROOT, "abis");

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
// Generate deployments.json
// ---------------------------------------------------------------------------

const bcConfigSource = readFileSync(
  join(SRC, "BCConfig.sol"),
  "utf-8",
);

const addresses = parseAddressConstants(bcConfigSource);
const uints = parseUintConstants(bcConfigSource);
const strings = parseStringConstants(bcConfigSource);

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
