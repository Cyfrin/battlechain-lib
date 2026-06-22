/**
 * Off-chain queries against the BattleChain block explorer API,
 * plus on-chain primitives for top-level contracts.
 *
 * Mirrors src/BCQuery.sol from cyfrin/battlechain-lib.
 */

import { Contract, type ContractRunner, type Provider } from "ethers";

import * as bcContracts from "./contracts.js";
import * as config from "./config.js";
import { ApiFailedError } from "./errors.js";
import { AgreementState, ATTACKABLE_STATES } from "./types.js";

const ATTACKABLE_STATE_NAMES: ReadonlySet<string> = new Set([
  "UNDER_ATTACK",
  "PROMOTION_REQUESTED",
]);

const REQUEST_TIMEOUT_MS = 10_000;

interface AgreementByContractResponse {
  hasCoverage?: boolean;
  agreements?: { state?: string }[];
  isAgreementContract?: boolean;
}

function agreementByContractUrl(host: string, contractAddress: string): string {
  return `${host}/battlechain/agreement/by-contract/${contractAddress}`;
}

async function queryAgreementByContract(
  chainId: number,
  contractAddress: string,
): Promise<AgreementByContractResponse> {
  const url = agreementByContractUrl(config.explorerHost(chainId), contractAddress);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new ApiFailedError(contractAddress, `HTTP ${res.status}`);
    }
    const text = await res.text();
    if (!text) {
      throw new ApiFailedError(contractAddress, "empty response");
    }
    try {
      return JSON.parse(text) as AgreementByContractResponse;
    } catch (e) {
      throw new ApiFailedError(contractAddress, `invalid JSON: ${(e as Error).message}`);
    }
  } catch (e) {
    if (e instanceof ApiFailedError) throw e;
    throw new ApiFailedError(contractAddress, (e as Error).message);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns true if a contract is currently fair game for whitehats.
 *
 * Mirrors BCQuery.isAttackable. A contract is attackable when any covering
 * Safe Harbor agreement is in UNDER_ATTACK or PROMOTION_REQUESTED.
 *
 * Resolves coverage via the BattleChain block explorer API, which works for
 * both top-level and child contracts.
 */
export async function isAttackable(
  runner: ContractRunner | Provider,
  contractAddress: string,
): Promise<boolean> {
  const chainId = await bcContracts.chainIdOf(runner);
  const response = await queryAgreementByContract(chainId, contractAddress);

  if (!response.hasCoverage) return false;

  for (const entry of response.agreements ?? []) {
    if (entry.state && ATTACKABLE_STATE_NAMES.has(entry.state)) {
      return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// On-chain primitives (top-level contracts only)
// -----------------------------------------------------------------------------

const ATTACK_REGISTRY_QUERY_METHODS = [
  {
    type: "function",
    name: "getAgreementState",
    stateMutability: "view",
    inputs: [{ name: "agreementAddress", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "getAgreementForContract",
    stateMutability: "view",
    inputs: [{ name: "contractAddress", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isTopLevelContractUnderAttack",
    stateMutability: "view",
    inputs: [{ name: "contractAddress", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

async function queryRegistry(runner: ContractRunner | Provider): Promise<Contract> {
  const chainId = await bcContracts.chainIdOf(runner);
  const address = config.attackRegistryAddress(chainId);
  return bcContracts.attackRegistry(runner, address, ATTACK_REGISTRY_QUERY_METHODS);
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Return the current state of a Safe Harbor agreement (on-chain). */
export async function getAgreementState(
  runner: ContractRunner | Provider,
  agreementAddress: string,
): Promise<AgreementState> {
  const registry = await queryRegistry(runner);
  const raw: bigint = await registry["getAgreementState"](agreementAddress);
  return Number(raw) as AgreementState;
}

/**
 * Return the Binding Agreement address for a top-level contract, or null.
 * Returns null for non-registered or child contracts.
 */
export async function getAgreementForContract(
  runner: ContractRunner | Provider,
  contractAddress: string,
): Promise<string | null> {
  const registry = await queryRegistry(runner);
  const address: string = await registry["getAgreementForContract"](contractAddress);
  if (address.toLowerCase() === ZERO_ADDRESS) return null;
  return address;
}

/**
 * On-chain check: True if a top-level contract's agreement is UNDER_ATTACK.
 *
 * Narrower than isAttackable — does NOT include PROMOTION_REQUESTED, and
 * only works for top-level contracts. Useful when you want a pure on-chain
 * answer without an HTTP round-trip.
 */
export async function isTopLevelContractUnderAttack(
  runner: ContractRunner | Provider,
  contractAddress: string,
): Promise<boolean> {
  const registry = await queryRegistry(runner);
  return Boolean(await registry["isTopLevelContractUnderAttack"](contractAddress));
}

export { ATTACKABLE_STATES };
