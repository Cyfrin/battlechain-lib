/**
 * Contract source verification on the BattleChain block explorer.
 *
 * The explorer's verifysourcecode API differs from a stock Etherscan API in a
 * subtle but important way: it relies on top-level form fields for
 * `optimizationUsed`, `runs`, and `evmVersion` rather than reading them from
 * the standard JSON `settings`. As of Dec 2025, `@nomicfoundation/hardhat-verify`
 * only embeds those settings inside the standard JSON, so its submissions
 * recompile with default optimizer/evm settings on the explorer side and the
 * resulting bytecode doesn't match what was deployed.
 *
 * This helper sends the form fields the explorer wants — mirroring what
 * `forge verify-contract --verifier custom` does (which is the path
 * documented at https://docs.battlechain.com/battlechain/how-to/verifying-contracts).
 *
 * API spec: https://block-explorer-api.testnet.battlechain.com/docs
 */

import type { ContractRunner, Provider } from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";

import * as bcContracts from "./contracts.js";
import * as config from "./config.js";

const DEFAULT_API_KEY = "not-required";

const INDEX_TIMEOUT_MS = 60_000;
const INDEX_POLL_INTERVAL_MS = 3_000;
const VERIFY_TIMEOUT_MS = 180_000;
const VERIFY_POLL_INTERVAL_MS = 5_000;

export type CodeFormat =
  | "vyper-json"
  | "solidity-standard-json-input"
  | "solidity-single-file";

export interface VerifyContractOptions {
  /** Deployed contract address. */
  address: string;
  /** File path + contract name, e.g. "src/MockToken.sol:MockToken". */
  contractFqn: string;
  /** Compiler version (e.g. "0.8.24" or "0.8.24+commit.e11b9ed9"). */
  compilerVersion: string;
  /**
   * Solidity standard JSON input (the contents of artifacts/build-info/<id>.json's
   * `input` field). Required for `solidity-standard-json-input` codeformat.
   */
  standardJsonInput?: object;
  /**
   * For `solidity-single-file` / `vyper-json`: path to the (flattened) source.
   * Defaults to the path component of contractFqn.
   */
  sourcePath?: string;
  /**
   * Constructor args, ABI-encoded as hex (with or without 0x prefix). Pass an
   * empty string for contracts with no constructor args.
   */
  constructorArgs?: string;
  /** Whether the contract was compiled with optimizer enabled. */
  optimizationUsed?: boolean;
  /** Optimizer runs (defaults to 200 if optimizationUsed is true). */
  runs?: number;
  /** EVM version (e.g. "cancun", "paris"). */
  evmVersion?: string;
  /** Chain ID override. Defaults to the runner's network. */
  chainId?: number;
  codeFormat?: CodeFormat;
  apiKey?: string;
  /** Runner used to look up chainId when chainId is not given. */
  runner?: ContractRunner | Provider;
  /**
   * If true, returns true immediately when the contract is already verified.
   * Default: true.
   */
  skipIfVerified?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function httpGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  return (await res.json()) as Record<string, unknown>;
}

async function httpPostForm(
  url: string,
  data: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(data).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await res.json()) as Record<string, unknown>;
}

async function isAlreadyVerified(
  apiUrl: string,
  address: string,
  apiKey: string,
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      module: "contract",
      action: "getsourcecode",
      address,
      apikey: apiKey,
    });
    const res = await fetch(`${apiUrl}?${params.toString()}`);
    if (!res.ok) return false;
    const json = (await res.json()) as { result?: Array<{ SourceCode?: string }> };
    const sourceCode = json.result?.[0]?.SourceCode ?? "";
    return typeof sourceCode === "string" && sourceCode !== "";
  } catch {
    return false;
  }
}

async function waitForIndexing(
  apiUrl: string,
  address: string,
  chainId: number,
  apiKey: string,
): Promise<void> {
  const deadline = Date.now() + INDEX_TIMEOUT_MS;
  const params = new URLSearchParams({
    module: "contract",
    action: "getabi",
    address,
    chainId: String(chainId),
    apikey: apiKey,
  });
  while (Date.now() < deadline) {
    const data = await httpGet(`${apiUrl}?${params.toString()}`);
    if (data.result === "Contract source code not verified") return;
    await sleep(INDEX_POLL_INTERVAL_MS);
  }
  console.warn(`  ⚠ Timed out waiting for indexer at ${address} — submitting anyway`);
}

async function pollVerification(
  apiUrl: string,
  guid: string,
  chainId: number,
  apiKey: string,
): Promise<{ ok: boolean; result: string }> {
  const deadline = Date.now() + VERIFY_TIMEOUT_MS;
  const params = new URLSearchParams({
    module: "contract",
    action: "checkverifystatus",
    guid,
    chainId: String(chainId),
    apikey: apiKey,
  });
  while (Date.now() < deadline) {
    await sleep(VERIFY_POLL_INTERVAL_MS);
    const data = await httpGet(`${apiUrl}?${params.toString()}`);
    const result = String(data.result ?? "");
    if (result === "Pending in queue" || result === "In progress") continue;
    const lowered = result.toLowerCase();
    const ok = lowered.includes("pass") || lowered.includes("already verified");
    return { ok, result };
  }
  return { ok: false, result: "Timed out waiting for verification result" };
}

function buildVyperPayload(contractFile: string, sourceCode: string): object {
  return {
    language: "Vyper",
    sources: { [contractFile]: { content: sourceCode } },
    settings: {
      outputSelection: { "*": ["evm.bytecode", "evm.deployedBytecode", "abi"] },
    },
  };
}

function normalizeCompilerVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

function normalizeConstructorArgs(args?: string): string {
  if (!args) return "";
  return args.startsWith("0x") ? args.slice(2) : args;
}

/**
 * Verify a deployed contract on the BattleChain block explorer.
 *
 * For Solidity standard JSON input (the typical Hardhat case): pass
 * `standardJsonInput` (the contents of build-info's `input` field) plus
 * `optimizationUsed`, `runs`, and `evmVersion` matching the build.
 *
 * For Vyper: pass `sourcePath` and the lib will inline the source.
 *
 * Returns true on a successful or already-verified result, false otherwise.
 */
export async function verifyContract(opts: VerifyContractOptions): Promise<boolean> {
  let chainId = opts.chainId;
  if (chainId === undefined) {
    if (!opts.runner) {
      throw new Error("verifyContract requires either chainId or runner");
    }
    chainId = await bcContracts.chainIdOf(opts.runner);
  }

  const apiUrl = config.explorerApi(chainId);
  const apiKey = opts.apiKey ?? DEFAULT_API_KEY;
  const codeFormat = opts.codeFormat ?? "solidity-standard-json-input";
  const skipIfVerified = opts.skipIfVerified ?? true;

  if (skipIfVerified && (await isAlreadyVerified(apiUrl, opts.address, apiKey))) {
    console.log(`  ✅ ${opts.address} is already verified`);
    return true;
  }

  // Build the sourceCode payload depending on codeformat.
  let sourceCodePayload: string;
  if (codeFormat === "solidity-standard-json-input") {
    if (!opts.standardJsonInput) {
      throw new Error(
        "verifyContract: standardJsonInput is required for solidity-standard-json-input codeformat",
      );
    }
    sourceCodePayload = JSON.stringify(opts.standardJsonInput);
  } else if (codeFormat === "vyper-json") {
    const [contractFile] = opts.contractFqn.split(":");
    const src = opts.sourcePath ?? contractFile;
    if (!fs.existsSync(path.resolve(src))) {
      console.warn(`  ⚠ Source file not found: ${src} — skipping verification`);
      return false;
    }
    sourceCodePayload = JSON.stringify(
      buildVyperPayload(contractFile, fs.readFileSync(path.resolve(src), "utf8")),
    );
  } else {
    // solidity-single-file: pass raw source text
    const [contractFile] = opts.contractFqn.split(":");
    const src = opts.sourcePath ?? contractFile;
    if (!fs.existsSync(path.resolve(src))) {
      console.warn(`  ⚠ Source file not found: ${src} — skipping verification`);
      return false;
    }
    sourceCodePayload = fs.readFileSync(path.resolve(src), "utf8");
  }

  console.log(`  ⏳ Waiting for explorer to index ${opts.address}...`);
  await waitForIndexing(apiUrl, opts.address, chainId, apiKey);

  const submitUrl = `${apiUrl}?module=contract&action=verifysourcecode&chainId=${chainId}&apikey=${apiKey}`;

  // The BattleChain explorer relies on these top-level form fields rather
  // than parsing them from the standard JSON `settings`. Send them all.
  const body: Record<string, string> = {
    contractaddress: opts.address,
    sourceCode: sourceCodePayload,
    codeformat: codeFormat,
    contractname: opts.contractFqn,
    compilerversion: normalizeCompilerVersion(opts.compilerVersion),
    constructorArguments: normalizeConstructorArgs(opts.constructorArgs),
    // Forge sends these too — the explorer expects them despite the standard
    // JSON containing the same info.
    optimizationUsed: opts.optimizationUsed ? "1" : "0",
    runs: String(opts.runs ?? 200),
  };
  if (opts.evmVersion) body.evmVersion = opts.evmVersion;

  let submitData: Record<string, unknown>;
  try {
    submitData = await httpPostForm(submitUrl, body);
  } catch (e) {
    console.error(`  ✗ Verification submission failed: ${(e as Error).message}`);
    return false;
  }

  if (submitData.status !== "1") {
    const result = String(submitData.result ?? "");
    if (result.toLowerCase().includes("already verified")) {
      console.log(`  ✅ ${opts.address} already verified`);
      return true;
    }
    console.error(`  ✗ Verification submission rejected: ${result}`);
    return false;
  }

  console.log(
    `  📤 Submitted for verification: ${opts.contractFqn} at ${opts.address}`,
  );
  const { ok, result } = await pollVerification(
    apiUrl,
    String(submitData.result),
    chainId,
    apiKey,
  );
  if (ok) {
    console.log(`  ✅ Verified: ${opts.address}`);
    return true;
  }
  // The explorer occasionally returns "may still succeed" mid-poll while the
  // queue is still working. Re-check getsourcecode once before giving up.
  if (result.toLowerCase().includes("may still succeed")) {
    await sleep(VERIFY_POLL_INTERVAL_MS);
    if (await isAlreadyVerified(apiUrl, opts.address, apiKey)) {
      console.log(`  ✅ Verified after re-check: ${opts.address}`);
      return true;
    }
  }
  console.error(`  ✗ Verification failed: ${result}`);
  return false;
}
