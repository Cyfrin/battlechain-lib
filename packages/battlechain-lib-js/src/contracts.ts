/**
 * Internal helpers for loading BattleChain protocol contracts via ethers.
 *
 * Centralizes the `new ethers.Contract(addr, abi, runner)` pattern so action
 * modules (deploy, safeHarbor, query) don't repeat ABI-loading boilerplate.
 */

import {
  Contract,
  ContractRunner,
  Provider,
  Signer,
} from "ethers";

import {
  AGREEMENT_ABI,
  AGREEMENT_FACTORY_ABI,
  ATTACK_REGISTRY_ABI,
  DEPLOYER_ABI,
  REGISTRY_ABI,
} from "./abi.js";
import * as config from "./config.js";

export type Runner = Signer | Provider | ContractRunner;

export async function chainIdOf(runner: Runner): Promise<number> {
  const provider =
    "provider" in runner && runner.provider ? runner.provider : (runner as Provider);
  if (!provider) {
    throw new Error("Runner has no provider — pass a Signer or Provider");
  }
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

export function agreementFactory(runner: Runner, address: string): Contract {
  return new Contract(address, AGREEMENT_FACTORY_ABI as unknown as any[], runner);
}

export function agreement(runner: Runner, address: string): Contract {
  return new Contract(address, AGREEMENT_ABI as unknown as any[], runner);
}

export function registry(runner: Runner, address: string): Contract {
  return new Contract(address, REGISTRY_ABI as unknown as any[], runner);
}

export function attackRegistry(
  runner: Runner,
  address: string,
  abi?: readonly any[],
): Contract {
  return new Contract(
    address,
    (abi ?? ATTACK_REGISTRY_ABI) as unknown as any[],
    runner,
  );
}

export function deployer(runner: Runner, address: string): Contract {
  return new Contract(address, DEPLOYER_ABI as unknown as any[], runner);
}

/** Resolve and load the AgreementFactory for the current chain. */
export async function agreementFactoryForChain(runner: Runner): Promise<Contract> {
  const chainId = await chainIdOf(runner);
  return agreementFactory(runner, config.agreementFactoryAddress(chainId));
}

export async function registryForChain(runner: Runner): Promise<Contract> {
  const chainId = await chainIdOf(runner);
  return registry(runner, config.registryAddress(chainId));
}

export async function attackRegistryForChain(
  runner: Runner,
  abi?: readonly any[],
): Promise<Contract> {
  const chainId = await chainIdOf(runner);
  return attackRegistry(runner, config.attackRegistryAddress(chainId), abi);
}

export async function deployerForChain(runner: Runner): Promise<Contract> {
  const chainId = await chainIdOf(runner);
  return deployer(runner, config.deployerAddress(chainId));
}
