import { getAddress, type Address } from "viem";

import type {
  AgreementDetails,
  BcAccount,
  BcChain,
  BcNetworkConfig,
  BountyTerms,
  Contact,
} from "./types.js";
import { ChildContractScope, IdentityRequirements } from "./types.js";
import { BATTLECHAIN_SAFE_HARBOR_URI, SAFE_HARBOR_V3_URI, isBattleChain } from "./config.js";

/**
 * Returns default bounty terms matching BCSafeHarbor.sol:
 * 10%, $1M cap, retainable, anonymous, no aggregate cap.
 */
export function defaultBountyTerms(): BountyTerms {
  return {
    bountyPercentage: 10n,
    bountyCapUsd: 1_000_000n,
    retainable: true,
    identity: IdentityRequirements.Anonymous,
    diligenceRequirements: "",
    aggregateBountyCapUsd: 0n,
  };
}

/**
 * Maps addresses to BcAccount structs with ChildContractScope.All.
 * Mirrors BCSafeHarbor.buildAccounts().
 */
export function buildAccounts(
  addresses: readonly Address[],
): BcAccount[] {
  return addresses.map((addr) => ({
    accountAddress: getAddress(addr),
    childContractScope: ChildContractScope.All,
  }));
}

/**
 * Builds a BcChain entry for a specific chain scope.
 * Mirrors BCSafeHarbor.buildChainScope().
 */
export function buildChainScope(
  contracts: readonly Address[],
  recoveryAddress: Address,
  caip2ChainId: string,
): BcChain {
  return {
    assetRecoveryAddress: getAddress(recoveryAddress),
    accounts: buildAccounts(contracts),
    caip2ChainId,
  };
}

/**
 * Builds a full AgreementDetails struct with sensible defaults.
 * Mirrors BCSafeHarbor.defaultAgreementDetails().
 *
 * Uses the chainConfig to determine CAIP-2 scope and URI automatically:
 * - BattleChain networks use BATTLECHAIN_SAFE_HARBOR_URI
 * - Other chains use SAFE_HARBOR_V3_URI
 */
export function buildDefaultAgreement(
  protocolName: string,
  contacts: readonly Contact[],
  contracts: readonly Address[],
  recoveryAddress: Address,
  chainConfig: BcNetworkConfig,
): AgreementDetails {
  const uri = isBattleChain(chainConfig.chainId)
    ? BATTLECHAIN_SAFE_HARBOR_URI
    : SAFE_HARBOR_V3_URI;

  return {
    protocolName,
    contactDetails: contacts,
    chains: [buildChainScope(contracts, recoveryAddress, chainConfig.caip2)],
    bountyTerms: defaultBountyTerms(),
    agreementURI: uri,
  };
}
