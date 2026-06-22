/**
 * Registry of chains where CreateX is deployed at the well-known address.
 *
 * Mirrors src/CreateXChains.sol from cyfrin/battlechain-lib.
 * Source: https://github.com/pcaversaccio/createx#createx-deployments
 * Well-known address: 0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed (same on all chains).
 *
 * The chain-id sets are generated from the canonical Solidity — see
 * src/contractData.gen.ts (regenerate with `npm run gen-config`).
 */

import {
  PRODUCTION_CHAIN_IDS,
  TEST_CHAIN_IDS,
} from "./contractData.gen.js";

export { PRODUCTION_CHAIN_IDS, TEST_CHAIN_IDS };

/**
 * Returns true if the chain has CreateX deployed at the well-known address.
 */
export function isSupported(chainId: number): boolean {
  return PRODUCTION_CHAIN_IDS.has(chainId) || TEST_CHAIN_IDS.has(chainId);
}
