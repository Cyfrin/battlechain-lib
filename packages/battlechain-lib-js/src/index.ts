/**
 * @cyfrin/battlechain-lib-js — JS/TS library for deploying on BattleChain and adopting
 * Safe Harbor agreements. Mirrors cyfrin/battlechain-lib (Solidity) and
 * cyfrin/battlechain-lib-py (Python).
 */

export * from "./errors.js";
export * from "./types.js";
export * as createxChains from "./createxChains.js";

// config — re-export named values + the namespace
export {
  // chain IDs / CAIP-2
  MAINNET_CHAIN_ID,
  TESTNET_CHAIN_ID,
  MAINNET_CAIP2,
  TESTNET_CAIP2,
  // safe harbor URIs
  SAFE_HARBOR_V3_URI,
  BATTLECHAIN_SAFE_HARBOR_URI,
  // explorer
  MAINNET_RPC_URL,
  TESTNET_RPC_URL,
  TESTNET_EXPLORER_HOST,
  MAINNET_EXPLORER_HOST,
  TESTNET_EXPLORER_API,
  MAINNET_EXPLORER_API,
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
  WELL_KNOWN_CREATEX,
  // network config helpers
  bcMainnet,
  bcTestnet,
  setOverrides,
  clearOverrides,
  getNetworkConfig,
  isBattleChain,
  caip2ChainId,
  registryAddress,
  agreementFactoryAddress,
  attackRegistryAddress,
  deployerAddress,
  createXAddress,
  safeHarborUri,
  explorerHost,
  explorerApi,
  mockRegistryModeratorAddress,
} from "./config.js";

export type { BcNetworkConfig, SetOverridesOptions } from "./config.js";

// ABI fragments
export {
  AGREEMENT_FACTORY_ABI,
  AGREEMENT_ABI,
  ATTACK_REGISTRY_ABI,
  REGISTRY_ABI,
  DEPLOYER_ABI,
  MOCK_REGISTRY_MODERATOR_ABI,
} from "./abi.js";

// Builders
export {
  DEFAULT_BOUNTY_PERCENTAGE,
  DEFAULT_BOUNTY_CAP_USD,
  DEFAULT_COMMITMENT_DAYS,
  defaultBountyTerms,
  buildAccounts,
  buildChainScope,
  buildBattleChainScope,
  buildAgreementDetails,
  defaultAgreementDetails,
} from "./builders.js";
export type {
  BuildChainScopeOptions,
  DefaultAgreementDetailsOptions,
} from "./builders.js";

// Deploy helpers (BCDeployer routing + JSON tracking file for those deploys)
export {
  DEFAULT_TRACKING_FILE,
  bcDeploy,
  bcDeployCreate,
  bcDeployCreate2,
  bcDeployCreate3,
  buildInitCode,
  deployedContracts,
  resetDeployments,
  trackDeployment,
  getTrackedAddress,
  getTrackedContract,
} from "./deploy.js";
export type {
  DeployArtifact,
  DeployOptions,
  BcDeployResult,
} from "./deploy.js";

// Safe harbor
export {
  createAgreement,
  setCommitmentWindow,
  adoptAgreement,
  createAndAdoptAgreement,
  requestAttackMode,
  approveAttackRequest,
  skipToProduction,
} from "./safeHarbor.js";
export type { CreateAndAdoptOptions } from "./safeHarbor.js";

// Query
export {
  isAttackable,
  getAgreementState,
  getAgreementForContract,
  isTopLevelContractUnderAttack,
} from "./query.js";

// Verify (parity helper; Hardhat users should prefer hardhat-verify)
export { verifyContract } from "./verify.js";
export type { CodeFormat, VerifyContractOptions } from "./verify.js";
