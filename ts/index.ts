export {
  agreementFactoryAbi,
  agreementAbi,
  attackRegistryAbi,
  registryAbi,
  deployerAbi,
} from "./abi.js";

export {
  bcTestnet,
  WELL_KNOWN_CREATEX,
  SAFE_HARBOR_V3_URI,
  BATTLECHAIN_SAFE_HARBOR_URI,
  BC_MAINNET_CHAIN_ID,
  BC_TESTNET_CHAIN_ID,
  isBattleChain,
} from "./config.js";

export {
  ChildContractScope,
  IdentityRequirements,
  type Contact,
  type BcAccount,
  type BcChain,
  type BountyTerms,
  type AgreementDetails,
  type BcNetworkConfig,
} from "./types.js";

export {
  defaultBountyTerms,
  buildAccounts,
  buildChainScope,
  buildDefaultAgreement,
} from "./builders.js";
