/**
 * Deploy helpers via BattleChainDeployer (or CreateX off-chain).
 *
 * Mirrors src/BCDeploy.sol from cyfrin/battlechain-lib. Tracks deployed
 * addresses to a per-chain JSON file so subsequent script runs can resolve
 * them. The tracking file exists because deployer-routed contracts perform
 * their CREATE inside BattleChainDeployer's call context — Hardhat's
 * deployment systems (ignition/deploy plugins) only see top-level deploys
 * from Hardhat.ethers.deployContract / a direct factory deploy.
 *
 * For vanilla deploys, use Hardhat's deployment system instead (ignition).
 * Use these helpers ONLY for the CREATE/CREATE2/CREATE3 deploys that must
 * route through BCDeployer.
 */

import {
  AbiCoder,
  Contract,
  type ContractRunner,
  Interface,
  type Signer,
  concat,
  getBytes,
  hexlify,
  type Provider,
} from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";

import * as bcContracts from "./contracts.js";

export const DEFAULT_TRACKING_FILE = ".bc_deployments.json";

/** Minimal artifact shape — works with both Hardhat artifacts and ethers Interface. */
export interface DeployArtifact {
  abi: ReadonlyArray<unknown>;
  bytecode: string;
  contractName?: string;
}

export interface DeployOptions {
  /** Override the tracking key. Defaults to artifact.contractName. */
  name?: string;
  /** Override the tracking file location (default `./.bc_deployments.json`). */
  trackingPath?: string;
  /** Override the chain ID (default: read from runner). */
  chainId?: number;
}

// Module-level deployment tracker. Mirrors `address[] private _deployedContracts`
// in BCDeploy.sol — survives for the duration of a script run.
const sessionDeployed: string[] = [];

/**
 * Deploy via CREATE.
 * Mirrors BCDeploy.bcDeployCreate(initCode). Routes through:
 *   - BattleChainDeployer on BattleChain (auto-registers with AttackRegistry)
 *   - CreateX on any other supported chain
 */
export async function bcDeployCreate(
  runner: Signer | ContractRunner,
  initCode: string,
): Promise<string> {
  const deployer = await bcContracts.deployerForChain(runner);
  const address: string = await deployer["deployCreate"].staticCall(initCode);
  const tx = await deployer["deployCreate"](initCode);
  await tx.wait();
  sessionDeployed.push(address);
  return address;
}

export async function bcDeployCreate2(
  runner: Signer | ContractRunner,
  salt: string,
  initCode: string,
): Promise<string> {
  if (getBytes(salt).length !== 32) {
    throw new Error(`salt must be 32 bytes, got ${getBytes(salt).length}`);
  }
  const deployer = await bcContracts.deployerForChain(runner);
  const address: string = await deployer["deployCreate2(bytes32,bytes)"].staticCall(
    salt,
    initCode,
  );
  const tx = await deployer["deployCreate2(bytes32,bytes)"](salt, initCode);
  await tx.wait();
  sessionDeployed.push(address);
  return address;
}

export async function bcDeployCreate3(
  runner: Signer | ContractRunner,
  salt: string,
  initCode: string,
): Promise<string> {
  if (getBytes(salt).length !== 32) {
    throw new Error(`salt must be 32 bytes, got ${getBytes(salt).length}`);
  }
  const deployer = await bcContracts.deployerForChain(runner);
  const address: string = await deployer["deployCreate3(bytes32,bytes)"].staticCall(
    salt,
    initCode,
  );
  const tx = await deployer["deployCreate3(bytes32,bytes)"](salt, initCode);
  await tx.wait();
  sessionDeployed.push(address);
  return address;
}

/** Returns all addresses deployed this session via bcDeploy* helpers. */
export function deployedContracts(): readonly string[] {
  return [...sessionDeployed];
}

export function resetDeployments(): void {
  sessionDeployed.length = 0;
}

/**
 * Manually record an address as if it had been deployed via bcDeploy*.
 * Useful when a contract was deployed before this session started but should
 * still appear in the agreement's scope.
 */
export function trackDeployment(address: string): void {
  sessionDeployed.push(address);
}

/**
 * Assemble deployment init code from an artifact + constructor args.
 * Appends ABI-encoded constructor args to the contract's creation bytecode.
 */
export function buildInitCode(
  artifact: DeployArtifact,
  args: readonly unknown[] = [],
): string {
  const iface = new Interface(artifact.abi as unknown as any[]);
  const ctor = iface.fragments.find((f) => f.type === "constructor");
  if (!ctor) {
    if (args.length > 0) {
      throw new Error(
        `contract has no constructor but ${args.length} args were given`,
      );
    }
    return artifact.bytecode;
  }

  const inputs = (ctor as any).inputs as Array<{ type: string }>;
  if (inputs.length !== args.length) {
    throw new Error(
      `constructor expects ${inputs.length} args (${inputs
        .map((i) => i.type)
        .join(", ")}), got ${args.length}`,
    );
  }
  const encoded = AbiCoder.defaultAbiCoder().encode(
    inputs.map((i) => i.type),
    [...args],
  );
  return hexlify(concat([artifact.bytecode, encoded]));
}

export interface BcDeployResult {
  /** Deployed contract address (after BCDeployer routing). */
  address: string;
  /** ethers Contract attached at the deployed address with the artifact's ABI. */
  contract: Contract;
}

/**
 * High-level: deploy a contract via BattleChainDeployer + persist its address.
 *
 * Routes the deploy through BattleChainDeployer (auto-registering with
 * AttackRegistry on BattleChain), and returns a Contract at the new address.
 *
 * The address is also written to a per-chain tracking file (default
 * `./.bc_deployments.json`) so later script runs can resolve it via
 * getTrackedAddress / getTrackedContract.
 */
export async function bcDeploy(
  runner: Signer,
  artifact: DeployArtifact,
  args: readonly unknown[] = [],
  opts: DeployOptions = {},
): Promise<BcDeployResult> {
  const initCode = buildInitCode(artifact, args);
  const address = await bcDeployCreate(runner, initCode);
  const name = opts.name ?? artifact.contractName;
  if (!name) {
    throw new Error(
      "could not derive contract name from artifact — pass `name` explicitly or include `contractName` on the artifact",
    );
  }
  const chainId = opts.chainId ?? (await bcContracts.chainIdOf(runner));
  trackAddress(name, address, chainId, opts.trackingPath);
  return { address, contract: new Contract(address, artifact.abi as unknown as any[], runner) };
}

/**
 * Look up a previously tracked deployment address for the active chain.
 * Returns null if the tracking file doesn't exist or the name isn't recorded.
 */
export function getTrackedAddress(
  name: string,
  chainId: number,
  trackingPath = DEFAULT_TRACKING_FILE,
): string | null {
  const data = readTracking(trackingPath);
  return data[String(chainId)]?.[name] ?? null;
}

/** Look up a tracked deployment and return a Contract attached at that address. */
export function getTrackedContract(
  name: string,
  abi: readonly unknown[],
  runner: Runner,
  chainId: number,
  trackingPath = DEFAULT_TRACKING_FILE,
): Contract | null {
  const address = getTrackedAddress(name, chainId, trackingPath);
  if (!address) return null;
  return new Contract(address, abi as unknown as any[], runner);
}

type Runner = Signer | Provider | ContractRunner;

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

type Tracking = Record<string, Record<string, string>>;

function readTracking(trackingPath: string): Tracking {
  const resolved = path.resolve(trackingPath);
  if (!fs.existsSync(resolved)) return {};
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function writeTracking(trackingPath: string, data: Tracking): void {
  const resolved = path.resolve(trackingPath);
  fs.writeFileSync(resolved, JSON.stringify(data, null, 2) + "\n");
}

function trackAddress(
  name: string,
  address: string,
  chainId: number,
  trackingPath = DEFAULT_TRACKING_FILE,
): void {
  const data = readTracking(trackingPath);
  const key = String(chainId);
  if (!data[key]) data[key] = {};
  data[key][name] = address;
  writeTracking(trackingPath, data);
}
