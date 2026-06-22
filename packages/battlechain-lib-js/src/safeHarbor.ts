/**
 * Safe Harbor agreement creation, adoption, and attack-mode helpers.
 *
 * Mirrors src/BCSafeHarbor.sol from cyfrin/battlechain-lib.
 */

import { Contract, type Signer } from "ethers";

import { MOCK_REGISTRY_MODERATOR_ABI } from "./abi.js";
import * as bcContracts from "./contracts.js";
import * as config from "./config.js";
import { DEFAULT_COMMITMENT_DAYS } from "./builders.js";
import { BattleChainError, NotBattleChainError } from "./errors.js";
import { AgreementDetails } from "./types.js";

const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Translate a typed AgreementDetails into the positional tuple ethers expects
 * for an ABI struct argument.
 */
function detailsToTuple(d: AgreementDetails): unknown[] {
  return [
    d.protocolName,
    d.contactDetails.map((c) => [c.name, c.contact]),
    d.chains.map((c) => [
      c.assetRecoveryAddress,
      c.accounts.map((a) => [a.accountAddress, a.childContractScope]),
      c.caip2ChainId,
    ]),
    [
      d.bountyTerms.bountyPercentage,
      d.bountyTerms.bountyCapUsd,
      d.bountyTerms.retainable,
      d.bountyTerms.identity,
      d.bountyTerms.diligenceRequirements,
      d.bountyTerms.aggregateBountyCapUsd,
    ],
    d.agreementURI,
  ];
}

/** Create an agreement via the AgreementFactory and return its address. */
export async function createAgreement(
  signer: Signer,
  details: AgreementDetails,
  owner: string,
  salt: string,
): Promise<string> {
  const factory = await bcContracts.agreementFactoryForChain(signer);
  const tuple = detailsToTuple(details);
  const address: string = await factory["create"].staticCall(tuple, owner, salt);
  const tx = await factory["create"](tuple, owner, salt);
  await tx.wait();
  return address;
}

/** Set the commitment window on an agreement. Mirrors BCSafeHarbor.setCommitmentWindow. */
export async function setCommitmentWindow(
  signer: Signer,
  agreementAddress: string,
  durationDays: number,
): Promise<void> {
  const newCantChangeUntil =
    BigInt(Math.floor(Date.now() / 1000)) +
    BigInt(durationDays * SECONDS_PER_DAY);
  const agreement = bcContracts.agreement(signer, agreementAddress);
  const tx = await agreement["extendCommitmentWindow"](newCantChangeUntil);
  await tx.wait();
}

/** Adopt an agreement in the BattleChain Safe Harbor Registry. */
export async function adoptAgreement(
  signer: Signer,
  agreementAddress: string,
): Promise<void> {
  const registry = await bcContracts.registryForChain(signer);
  const tx = await registry["adoptSafeHarbor"](agreementAddress);
  await tx.wait();
}

export interface CreateAndAdoptOptions {
  /** Override DEFAULT_COMMITMENT_DAYS (14). */
  commitmentDays?: number;
}

/**
 * Create an agreement, set a commitment window, and adopt it.
 * Mirrors BCSafeHarbor.createAndAdoptAgreement (which is hard-coded to 14 days);
 * we expose commitmentDays so callers can pick a different window.
 */
export async function createAndAdoptAgreement(
  signer: Signer,
  details: AgreementDetails,
  owner: string,
  salt: string,
  opts: CreateAndAdoptOptions = {},
): Promise<string> {
  const days = opts.commitmentDays ?? DEFAULT_COMMITMENT_DAYS;
  const address = await createAgreement(signer, details, owner, salt);
  await setCommitmentWindow(signer, address, days);
  await adoptAgreement(signer, address);
  return address;
}

/** Request attack mode for an agreement. Only available on BattleChain. */
export async function requestAttackMode(
  signer: Signer,
  agreementAddress: string,
): Promise<void> {
  const chainId = await bcContracts.chainIdOf(signer);
  if (!config.isBattleChain(chainId)) {
    throw new NotBattleChainError(chainId);
  }
  const attackRegistry = await bcContracts.attackRegistryForChain(signer);
  const tx = await attackRegistry["requestUnderAttack"](agreementAddress);
  await tx.wait();
}

/**
 * Approve an attack-mode request via the testnet MockRegistryModerator —
 * moves an agreement from ATTACK_REQUESTED (2) to UNDER_ATTACK (3).
 *
 * On testnet, the moderator is a permissionless contract that forwards
 * `approveAttack` calls to the AttackRegistry, so testnet users can
 * self-approve their own request without waiting for a real DAO action.
 *
 * Mainnet has no equivalent self-service helper — approval is a real DAO
 * governance action. This helper throws on mainnet.
 *
 * Mirrors the manual `cast send 0x1bC6…approveAttack(address)` flow from
 * the BattleChain testnet docs.
 */
export async function approveAttackRequest(
  signer: Signer,
  agreementAddress: string,
): Promise<void> {
  const chainId = await bcContracts.chainIdOf(signer);
  const moderator = config.mockRegistryModeratorAddress(chainId);
  if (!moderator) {
    throw new BattleChainError(
      `approveAttackRequest is only available on BattleChain testnet (chain ID ` +
        `${config.TESTNET_CHAIN_ID}); got chain ID ${chainId}. On mainnet, ` +
        `approval is a real DAO governance action.`,
    );
  }
  const contract = new Contract(
    moderator,
    MOCK_REGISTRY_MODERATOR_ABI as unknown as any[],
    signer,
  );
  const tx = await contract["approveAttack"](agreementAddress);
  await tx.wait();
}

/** Skip an agreement directly to production. Only available on BattleChain. */
export async function skipToProduction(
  signer: Signer,
  agreementAddress: string,
): Promise<void> {
  const chainId = await bcContracts.chainIdOf(signer);
  if (!config.isBattleChain(chainId)) {
    throw new NotBattleChainError(chainId);
  }
  const attackRegistry = await bcContracts.attackRegistryForChain(signer);
  const tx = await attackRegistry["goToProduction"](agreementAddress);
  await tx.wait();
}
