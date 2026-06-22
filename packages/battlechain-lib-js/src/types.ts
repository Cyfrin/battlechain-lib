/**
 * Agreement and registry data types.
 *
 * Mirrors src/types/AgreementTypes.sol from cyfrin/battlechain-lib, plus the
 * AgreementState enum from the BattleChain protocol docs.
 */

export enum ChildContractScope {
  None = 0,
  ExistingOnly = 1,
  All = 2,
  FutureOnly = 3,
}

export enum IdentityRequirements {
  Anonymous = 0,
  Pseudonymous = 1,
  Named = 2,
}

/**
 * Lifecycle state of a Safe Harbor agreement on the AttackRegistry.
 * Mirrors IAttackRegistry.ContractState from the BattleChain docs.
 */
export enum AgreementState {
  NotDeployed = 0,
  NewDeployment = 1,
  AttackRequested = 2,
  UnderAttack = 3,
  PromotionRequested = 4,
  Production = 5,
  Corrupted = 6,
}

/** States during which a covering contract is fair game for whitehats. */
export const ATTACKABLE_STATES: ReadonlySet<AgreementState> = new Set([
  AgreementState.UnderAttack,
  AgreementState.PromotionRequested,
]);

export interface Contact {
  name: string;
  contact: string;
}

export interface BcAccount {
  accountAddress: string;
  childContractScope: ChildContractScope;
}

export interface BcChain {
  assetRecoveryAddress: string;
  accounts: BcAccount[];
  caip2ChainId: string;
}

export interface BountyTerms {
  bountyPercentage: bigint;
  bountyCapUsd: bigint;
  retainable: boolean;
  identity: IdentityRequirements;
  diligenceRequirements: string;
  aggregateBountyCapUsd: bigint;
}

export interface AgreementDetails {
  protocolName: string;
  contactDetails: Contact[];
  chains: BcChain[];
  bountyTerms: BountyTerms;
  agreementURI: string;
}
