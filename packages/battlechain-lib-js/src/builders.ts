/**
 * Agreement builder helpers.
 *
 * Mirrors the builder functions in src/BCSafeHarbor.sol from cyfrin/battlechain-lib.
 * All builders are pure: they take inputs and return plain objects. No on-chain calls.
 */

import * as config from "./config.js";
import {
  AgreementDetails,
  BcAccount,
  BcChain,
  BountyTerms,
  ChildContractScope,
  Contact,
  IdentityRequirements,
} from "./types.js";

// Defaults pulled from BCSafeHarbor.sol:
//   DEFAULT_BOUNTY_PERCENTAGE = 10
//   DEFAULT_BOUNTY_CAP_USD    = 1_000_000
//   DEFAULT_COMMITMENT_DAYS   = 14
export const DEFAULT_BOUNTY_PERCENTAGE = 10n;
export const DEFAULT_BOUNTY_CAP_USD = 1_000_000n;
export const DEFAULT_COMMITMENT_DAYS = 14;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Normalize an address to lowercase 0x-prefixed hex.
 *
 * Matches vm.toString(address) from forge-std, which is what BCSafeHarbor
 * uses when storing addresses in Account.accountAddress and
 * BcChain.assetRecoveryAddress. Using checksum case here would produce
 * different bytes than agreements built via the Solidity lib.
 *
 * Lenient on checksum (matches python lib's `to_canonical_address` semantics).
 */
function toLowercaseHex(address: string): string {
  if (!ADDRESS_RE.test(address)) {
    throw new Error(`invalid address: ${address}`);
  }
  return address.toLowerCase();
}

/** Returns default bounty terms: 10%, $1M cap, retainable, anonymous, no aggregate cap. */
export function defaultBountyTerms(): BountyTerms {
  return {
    bountyPercentage: DEFAULT_BOUNTY_PERCENTAGE,
    bountyCapUsd: DEFAULT_BOUNTY_CAP_USD,
    retainable: true,
    identity: IdentityRequirements.Anonymous,
    diligenceRequirements: "",
    aggregateBountyCapUsd: 0n,
  };
}

/** Convert a list of addresses to BcAccount tuples. Mirrors BCSafeHarbor.buildAccounts. */
export function buildAccounts(
  addresses: readonly string[],
  scope: ChildContractScope = ChildContractScope.All,
): BcAccount[] {
  return addresses.map((addr) => ({
    accountAddress: toLowercaseHex(addr),
    childContractScope: scope,
  }));
}

export interface BuildChainScopeOptions {
  scope?: ChildContractScope;
}

/** Build a BcChain entry for any EVM chain. Mirrors BCSafeHarbor.buildChainScope. */
export function buildChainScope(
  contracts: readonly string[],
  recoveryAddress: string,
  caip2: string,
  opts: BuildChainScopeOptions = {},
): BcChain {
  return {
    assetRecoveryAddress: toLowercaseHex(recoveryAddress),
    accounts: buildAccounts(contracts, opts.scope ?? ChildContractScope.All),
    caip2ChainId: caip2,
  };
}

/**
 * Build a BcChain entry for the current BattleChain network.
 * Mirrors BCSafeHarbor.buildBattleChainScope.
 */
export function buildBattleChainScope(
  contracts: readonly string[],
  recoveryAddress: string,
  chainId: number,
  opts: BuildChainScopeOptions = {},
): BcChain {
  return buildChainScope(
    contracts,
    recoveryAddress,
    config.caip2ChainId(chainId),
    opts,
  );
}

/** Build a full AgreementDetails struct. Mirrors BCSafeHarbor.buildAgreementDetails. */
export function buildAgreementDetails(
  protocolName: string,
  contacts: readonly Contact[],
  chains: readonly BcChain[],
  bountyTerms: BountyTerms,
  agreementUri: string,
): AgreementDetails {
  return {
    protocolName,
    contactDetails: [...contacts],
    chains: [...chains],
    bountyTerms,
    agreementURI: agreementUri,
  };
}

export interface DefaultAgreementDetailsOptions {
  protocolName: string;
  contacts: readonly Contact[];
  contracts: readonly string[];
  recoveryAddress: string;
  chainId: number;
  scope?: ChildContractScope;
  bountyTerms?: BountyTerms;
}

/**
 * Build a full AgreementDetails with sensible defaults.
 * Mirrors BCSafeHarbor.defaultAgreementDetails.
 *
 * On BattleChain networks: BattleChain CAIP-2 scope and BattleChain Safe Harbor URI.
 * On other chains: chain's CAIP-2 string and the generic Safe Harbor V3 URI.
 */
export function defaultAgreementDetails(
  opts: DefaultAgreementDetailsOptions,
): AgreementDetails {
  const chain = buildChainScope(
    opts.contracts,
    opts.recoveryAddress,
    config.caip2ChainId(opts.chainId),
    { scope: opts.scope },
  );
  return {
    protocolName: opts.protocolName,
    contactDetails: [...opts.contacts],
    chains: [chain],
    bountyTerms: opts.bountyTerms ?? defaultBountyTerms(),
    agreementURI: config.safeHarborUri(opts.chainId),
  };
}
