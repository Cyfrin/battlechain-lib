/**
 * Address registry for BattleChain contracts, resolved by chain ID.
 *
 * Mirrors src/BCConfig.sol and src/BCBase.sol from cyfrin/battlechain-lib.
 * On supported chains, addresses resolve from the canonical registry.
 * On unsupported chains (Anvil, forks), use setOverrides() to provide them.
 *
 * All address/URI/chain-id data is generated from the canonical Solidity into
 * src/contractData.gen.ts (regenerate with `npm run gen-config`). The function
 * logic below is hand-maintained.
 */

import * as createxChains from "./createxChains.js";
import {
  CreateXNotAvailableError,
  UnsupportedChainForQueryError,
  UnsupportedChainIdError,
  ZeroAddressError,
} from "./errors.js";
import {
  BATTLECHAIN_SAFE_HARBOR_URI,
  MAINNET_AGREEMENT_FACTORY,
  MAINNET_AGREEMENT_FACTORY_IMPL,
  MAINNET_ATTACK_REGISTRY,
  MAINNET_ATTACK_REGISTRY_IMPL,
  MAINNET_CAIP2,
  MAINNET_CHAIN_ID,
  MAINNET_CREATEX,
  MAINNET_DEPLOYER,
  MAINNET_EXPLORER_HOST,
  MAINNET_REGISTRY,
  MAINNET_REGISTRY_IMPL,
  MAINNET_REGISTRY_MODERATOR,
  MAINNET_RPC_URL,
  SAFE_HARBOR_V3_URI,
  TESTNET_AGREEMENT_FACTORY,
  TESTNET_AGREEMENT_FACTORY_IMPL,
  TESTNET_ATTACK_REGISTRY,
  TESTNET_ATTACK_REGISTRY_IMPL,
  TESTNET_CAIP2,
  TESTNET_CHAIN_ID,
  TESTNET_CREATEX,
  TESTNET_DEPLOYER,
  TESTNET_EXPLORER_HOST,
  TESTNET_MOCK_REGISTRY_MODERATOR,
  TESTNET_REGISTRY,
  TESTNET_REGISTRY_IMPL,
  TESTNET_RPC_URL,
  WELL_KNOWN_CREATEX,
} from "./contractData.gen.js";

// Re-export the generated data under the public names callers already use.
export {
  // chain IDs
  MAINNET_CHAIN_ID,
  TESTNET_CHAIN_ID,
  // CAIP-2
  MAINNET_CAIP2,
  TESTNET_CAIP2,
  // CreateX well-known
  WELL_KNOWN_CREATEX,
  // safe harbor URIs
  SAFE_HARBOR_V3_URI,
  BATTLECHAIN_SAFE_HARBOR_URI,
  // RPC URLs
  MAINNET_RPC_URL,
  TESTNET_RPC_URL,
  // explorer hosts
  MAINNET_EXPLORER_HOST,
  TESTNET_EXPLORER_HOST,
  // mainnet addresses
  MAINNET_REGISTRY,
  MAINNET_AGREEMENT_FACTORY,
  MAINNET_ATTACK_REGISTRY,
  MAINNET_DEPLOYER,
  MAINNET_CREATEX,
  MAINNET_REGISTRY_IMPL,
  MAINNET_AGREEMENT_FACTORY_IMPL,
  MAINNET_ATTACK_REGISTRY_IMPL,
  MAINNET_REGISTRY_MODERATOR,
  // testnet addresses
  TESTNET_REGISTRY,
  TESTNET_AGREEMENT_FACTORY,
  TESTNET_ATTACK_REGISTRY,
  TESTNET_DEPLOYER,
  TESTNET_CREATEX,
  TESTNET_REGISTRY_IMPL,
  TESTNET_AGREEMENT_FACTORY_IMPL,
  TESTNET_ATTACK_REGISTRY_IMPL,
  TESTNET_MOCK_REGISTRY_MODERATOR,
};

// -----------------------------------------------------------------------------
// Explorer API URLs (Etherscan-compatible) derived from the bare hosts.
// -----------------------------------------------------------------------------

export const MAINNET_EXPLORER_API = `${MAINNET_EXPLORER_HOST}/api`;
export const TESTNET_EXPLORER_API = `${TESTNET_EXPLORER_HOST}/api`;

export interface BcNetworkConfig {
  readonly chainId: number;
  readonly caip2: string;
  readonly registry: string;
  readonly factory: string;
  readonly attackRegistry: string;
  readonly deployer: string;
  readonly createX: string;
  readonly safeHarborUri: string;
}

// -----------------------------------------------------------------------------
// Frozen network configs (mainnet 626, testnet 627)
// -----------------------------------------------------------------------------

export const bcMainnet: BcNetworkConfig = Object.freeze({
  chainId: MAINNET_CHAIN_ID,
  caip2: MAINNET_CAIP2,
  registry: MAINNET_REGISTRY,
  factory: MAINNET_AGREEMENT_FACTORY,
  attackRegistry: MAINNET_ATTACK_REGISTRY,
  deployer: MAINNET_DEPLOYER,
  createX: MAINNET_CREATEX,
  safeHarborUri: BATTLECHAIN_SAFE_HARBOR_URI,
});

export const bcTestnet: BcNetworkConfig = Object.freeze({
  chainId: TESTNET_CHAIN_ID,
  caip2: TESTNET_CAIP2,
  registry: TESTNET_REGISTRY,
  factory: TESTNET_AGREEMENT_FACTORY,
  attackRegistry: TESTNET_ATTACK_REGISTRY,
  deployer: TESTNET_DEPLOYER,
  createX: TESTNET_CREATEX,
  safeHarborUri: BATTLECHAIN_SAFE_HARBOR_URI,
});

const KNOWN_NETWORKS: Map<number, BcNetworkConfig> = new Map([
  [MAINNET_CHAIN_ID, bcMainnet],
  [TESTNET_CHAIN_ID, bcTestnet],
]);

// -----------------------------------------------------------------------------
// Override registry for local Anvil / unsupported chains
// (mirrors BCBase._setBcAddresses)
// -----------------------------------------------------------------------------

const overrides: Map<number, BcNetworkConfig> = new Map();

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface SetOverridesOptions {
  registry: string;
  factory: string;
  attackRegistry: string;
  deployer: string;
  createX?: string;
  safeHarborUri?: string;
  caip2?: string;
}

export function setOverrides(
  chainId: number,
  opts: SetOverridesOptions,
): BcNetworkConfig {
  const required: Array<["registry" | "factory" | "attackRegistry" | "deployer", string]> = [
    ["registry", opts.registry],
    ["factory", opts.factory],
    ["attackRegistry", opts.attackRegistry],
    ["deployer", opts.deployer],
  ];
  for (const [name, value] of required) {
    if (!value || value.toLowerCase() === ZERO_ADDRESS) {
      throw new ZeroAddressError(`${name} cannot be the zero address`);
    }
  }

  const config: BcNetworkConfig = Object.freeze({
    chainId,
    caip2: opts.caip2 ?? `eip155:${chainId}`,
    registry: opts.registry,
    factory: opts.factory,
    attackRegistry: opts.attackRegistry,
    deployer: opts.deployer,
    createX: opts.createX ?? WELL_KNOWN_CREATEX,
    safeHarborUri: opts.safeHarborUri ?? BATTLECHAIN_SAFE_HARBOR_URI,
  });
  overrides.set(chainId, config);
  return config;
}

export function clearOverrides(chainId?: number): void {
  if (chainId === undefined) {
    overrides.clear();
  } else {
    overrides.delete(chainId);
  }
}

// -----------------------------------------------------------------------------
// Resolution
// -----------------------------------------------------------------------------

export function getNetworkConfig(chainId: number): BcNetworkConfig {
  const override = overrides.get(chainId);
  if (override) return override;
  const known = KNOWN_NETWORKS.get(chainId);
  if (known) return known;
  throw new UnsupportedChainIdError(chainId);
}

/** Mirrors BCConfig.isBattleChain(). */
export function isBattleChain(chainId: number): boolean {
  return chainId === MAINNET_CHAIN_ID || chainId === TESTNET_CHAIN_ID;
}

/**
 * Mirrors BCConfig.caip2ChainId() for known BattleChain networks; falls back
 * to "eip155:<chainId>" for any other chain (matching defaultAgreementDetails).
 */
export function caip2ChainId(chainId: number): string {
  const override = overrides.get(chainId);
  if (override) return override.caip2;
  if (chainId === MAINNET_CHAIN_ID) return MAINNET_CAIP2;
  if (chainId === TESTNET_CHAIN_ID) return TESTNET_CAIP2;
  return `eip155:${chainId}`;
}

export function registryAddress(chainId: number): string {
  return getNetworkConfig(chainId).registry;
}

export function agreementFactoryAddress(chainId: number): string {
  return getNetworkConfig(chainId).factory;
}

export function attackRegistryAddress(chainId: number): string {
  return getNetworkConfig(chainId).attackRegistry;
}

/**
 * Returns the deployer address for a chain.
 *  - On BattleChain: BattleChainDeployer (CreateX + AttackRegistry registration)
 *  - On other chains: CreateX at the well-known address (if supported)
 */
export function deployerAddress(chainId: number): string {
  const override = overrides.get(chainId);
  if (override) return override.deployer;
  if (isBattleChain(chainId)) return getNetworkConfig(chainId).deployer;
  return createXAddress(chainId);
}

export function createXAddress(chainId: number): string {
  const override = overrides.get(chainId);
  if (override) return override.createX;
  if (chainId === MAINNET_CHAIN_ID) return MAINNET_CREATEX;
  if (chainId === TESTNET_CHAIN_ID) return TESTNET_CREATEX;
  if (createxChains.isSupported(chainId)) return WELL_KNOWN_CREATEX;
  throw new CreateXNotAvailableError(chainId);
}

export function safeHarborUri(chainId: number): string {
  if (isBattleChain(chainId)) return BATTLECHAIN_SAFE_HARBOR_URI;
  return SAFE_HARBOR_V3_URI;
}

/**
 * Bare BattleChain block explorer host. Used by query helpers and verify.
 * Mirrors BCQuery._explorerApiUrl() and raises for non-BattleChain chains.
 */
export function explorerHost(chainId: number): string {
  if (chainId === TESTNET_CHAIN_ID) return TESTNET_EXPLORER_HOST;
  if (chainId === MAINNET_CHAIN_ID) return MAINNET_EXPLORER_HOST;
  throw new UnsupportedChainForQueryError(chainId);
}

/** Etherscan-compatible API URL for source verification. */
export function explorerApi(chainId: number): string {
  return `${explorerHost(chainId)}/api`;
}

/**
 * Returns the testnet MockRegistryModerator address — a permissionless contract
 * that anyone can call to self-approve their agreement's attack request.
 *
 * Mainnet uses a real moderator EOA; this returns null off-testnet so callers
 * can detect the difference and skip the self-approval flow.
 */
export function mockRegistryModeratorAddress(chainId: number): string | null {
  if (chainId === TESTNET_CHAIN_ID) return TESTNET_MOCK_REGISTRY_MODERATOR;
  return null;
}
