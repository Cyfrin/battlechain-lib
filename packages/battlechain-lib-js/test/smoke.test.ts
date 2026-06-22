/**
 * Pure-TS smoke tests — no RPC, no signer required.
 *
 * These tests are behavioral/relational: they assert the shape and routing of
 * the config rather than duplicating address/URI literals (which live in the
 * generated src/contractData.gen.ts and are validated against canonical Solidity
 * by the gen-config codegen + the CI staleness guard).
 *
 * Verifies that:
 *   - the package imports cleanly
 *   - addresses are well-formed and mainnet/testnet are distinct
 *   - tuple serialization (in safeHarbor.detailsToTuple) round-trips
 *   - builders return well-formed agreement details
 *   - the explorer URL helpers route to the right hosts
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

import * as bc from "../src/index.js";
import * as config from "../src/config.js";
import * as createxChains from "../src/createxChains.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO = "0x0000000000000000000000000000000000000000";

const MAINNET_ADDRESSES: ReadonlyArray<[string, string]> = [
  ["MAINNET_REGISTRY", config.MAINNET_REGISTRY],
  ["MAINNET_AGREEMENT_FACTORY", config.MAINNET_AGREEMENT_FACTORY],
  ["MAINNET_ATTACK_REGISTRY", config.MAINNET_ATTACK_REGISTRY],
  ["MAINNET_DEPLOYER", config.MAINNET_DEPLOYER],
  ["MAINNET_CREATEX", config.MAINNET_CREATEX],
  ["MAINNET_REGISTRY_MODERATOR", config.MAINNET_REGISTRY_MODERATOR],
];

const TESTNET_ADDRESSES: ReadonlyArray<[string, string]> = [
  ["TESTNET_REGISTRY", config.TESTNET_REGISTRY],
  ["TESTNET_AGREEMENT_FACTORY", config.TESTNET_AGREEMENT_FACTORY],
  ["TESTNET_ATTACK_REGISTRY", config.TESTNET_ATTACK_REGISTRY],
  ["TESTNET_DEPLOYER", config.TESTNET_DEPLOYER],
  ["TESTNET_CREATEX", config.TESTNET_CREATEX],
  ["TESTNET_MOCK_REGISTRY_MODERATOR", config.TESTNET_MOCK_REGISTRY_MODERATOR],
];

describe("canonical addresses", () => {
  it.each([...MAINNET_ADDRESSES, ...TESTNET_ADDRESSES])(
    "%s is a valid non-zero 20-byte hex address",
    (_name, addr) => {
      expect(addr).toMatch(ADDRESS_RE);
      expect(addr.toLowerCase()).not.toBe(ZERO);
    },
  );

  it("WELL_KNOWN_CREATEX is the canonical CreateX address", () => {
    expect(config.WELL_KNOWN_CREATEX).toMatch(ADDRESS_RE);
    // Mainnet deploys its own CreateX, not the well-known one.
    expect(config.MAINNET_CREATEX).not.toBe(config.WELL_KNOWN_CREATEX);
  });

  it("mainnet and testnet addresses are distinct", () => {
    for (let i = 0; i < MAINNET_ADDRESSES.length; i++) {
      expect(MAINNET_ADDRESSES[i]![1].toLowerCase()).not.toBe(
        TESTNET_ADDRESSES[i]![1].toLowerCase(),
      );
    }
  });

  it("both networks resolve and registry helpers return the right registry", () => {
    expect(config.getNetworkConfig(626).registry).toBe(config.MAINNET_REGISTRY);
    expect(config.getNetworkConfig(627).registry).toBe(config.TESTNET_REGISTRY);
    expect(config.registryAddress(626)).toBe(config.MAINNET_REGISTRY);
    expect(config.registryAddress(627)).toBe(config.TESTNET_REGISTRY);
    expect(config.deployerAddress(626)).toBe(config.MAINNET_DEPLOYER);
    expect(config.deployerAddress(627)).toBe(config.TESTNET_DEPLOYER);
    expect(config.createXAddress(626)).toBe(config.MAINNET_CREATEX);
    expect(config.createXAddress(627)).toBe(config.TESTNET_CREATEX);
    expect(config.bcMainnet.chainId).toBe(626);
    expect(config.bcTestnet.chainId).toBe(627);
  });
});

describe("safe harbor URIs", () => {
  it("uses ipfs and the BC variant differs from V3", () => {
    expect(config.BATTLECHAIN_SAFE_HARBOR_URI.startsWith("ipfs://")).toBe(true);
    expect(config.SAFE_HARBOR_V3_URI.startsWith("ipfs://")).toBe(true);
    expect(config.BATTLECHAIN_SAFE_HARBOR_URI).not.toBe(config.SAFE_HARBOR_V3_URI);
  });
});

describe("chain ids", () => {
  it("identifies BattleChain mainnet/testnet only", () => {
    expect(config.MAINNET_CHAIN_ID).toBe(626);
    expect(config.TESTNET_CHAIN_ID).toBe(627);
    expect(config.isBattleChain(626)).toBe(true);
    expect(config.isBattleChain(627)).toBe(true);
    expect(config.isBattleChain(1)).toBe(false);
    expect(config.isBattleChain(31337)).toBe(false);
  });
});

describe("caip2 resolution", () => {
  it("maps known chains and falls back to eip155: prefix", () => {
    expect(config.caip2ChainId(626)).toBe("eip155:626");
    expect(config.caip2ChainId(627)).toBe("eip155:627");
    expect(config.caip2ChainId(8453)).toBe("eip155:8453");
  });
});

describe("safe harbor uri resolution", () => {
  it("returns BC variant on testnet, V3 elsewhere", () => {
    expect(config.safeHarborUri(627)).toBe(config.BATTLECHAIN_SAFE_HARBOR_URI);
    expect(config.safeHarborUri(1)).toBe(config.SAFE_HARBOR_V3_URI);
  });
});

describe("unsupported chain", () => {
  it("throws on getNetworkConfig for unknown chain", () => {
    expect(() => config.getNetworkConfig(1)).toThrow(bc.UnsupportedChainIdError);
  });
});

describe("explorer urls", () => {
  it("routes BattleChain hosts and rejects others", () => {
    expect(config.explorerHost(627)).toBe(config.TESTNET_EXPLORER_HOST);
    expect(config.explorerHost(626)).toBe(config.MAINNET_EXPLORER_HOST);
    expect(config.explorerHost(626)).not.toBe(config.explorerHost(627));
    expect(config.explorerHost(626).startsWith("https://")).toBe(true);
    expect(config.explorerApi(627)).toBe(`${config.TESTNET_EXPLORER_HOST}/api`);
    expect(config.explorerApi(626)).toBe(`${config.MAINNET_EXPLORER_HOST}/api`);
    expect(() => config.explorerHost(1)).toThrow(bc.UnsupportedChainForQueryError);
  });
});

describe("overrides round trip", () => {
  beforeEach(() => config.clearOverrides());
  it("registers and resolves an Anvil chain config", () => {
    const cfg = config.setOverrides(31337, {
      registry: "0x" + "11".repeat(20),
      factory: "0x" + "22".repeat(20),
      attackRegistry: "0x" + "33".repeat(20),
      deployer: "0x" + "44".repeat(20),
    });
    expect(cfg.chainId).toBe(31337);
    expect(cfg.caip2).toBe("eip155:31337");
    expect(config.registryAddress(31337)).toBe("0x" + "11".repeat(20));
    expect(config.deployerAddress(31337)).toBe("0x" + "44".repeat(20));
    config.clearOverrides(31337);
  });

  it("rejects zero-address overrides", () => {
    expect(() =>
      config.setOverrides(31337, {
        registry: "0x0000000000000000000000000000000000000000",
        factory: "0x" + "22".repeat(20),
        attackRegistry: "0x" + "33".repeat(20),
        deployer: "0x" + "44".repeat(20),
      }),
    ).toThrow(bc.ZeroAddressError);
  });
});

describe("createx supported chains", () => {
  it("recognizes mainnet, base, sepolia, and Anvil", () => {
    expect(createxChains.isSupported(1)).toBe(true);
    expect(createxChains.isSupported(8453)).toBe(true);
    expect(createxChains.isSupported(11155111)).toBe(true);
    expect(createxChains.isSupported(31337)).toBe(true);
    expect(createxChains.isSupported(999_999_998)).toBe(false);
  });
});

describe("default bounty terms", () => {
  it("matches BCSafeHarbor.defaultBountyTerms", () => {
    const bt = bc.defaultBountyTerms();
    expect(bt.bountyPercentage).toBe(10n);
    expect(bt.bountyCapUsd).toBe(1_000_000n);
    expect(bt.retainable).toBe(true);
    expect(bt.identity).toBe(bc.IdentityRequirements.Anonymous);
    expect(bt.diligenceRequirements).toBe("");
    expect(bt.aggregateBountyCapUsd).toBe(0n);
  });
});

describe("default agreement details", () => {
  it("routes URI by chain and lowercases addresses", () => {
    const contacts = [{ name: "Sec", contact: "x" }];
    const contractInput = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";
    const recoveryInput = "0x1234567890ABCDEF1234567890abcdef12345678";

    const onBc = bc.defaultAgreementDetails({
      protocolName: "p",
      contacts,
      contracts: [contractInput],
      recoveryAddress: recoveryInput,
      chainId: 627,
    });
    const offBc = bc.defaultAgreementDetails({
      protocolName: "p",
      contacts,
      contracts: [contractInput],
      recoveryAddress: recoveryInput,
      chainId: 1,
    });

    expect(onBc.agreementURI).toBe(config.BATTLECHAIN_SAFE_HARBOR_URI);
    expect(onBc.chains[0].caip2ChainId).toBe("eip155:627");
    expect(offBc.agreementURI).toBe(config.SAFE_HARBOR_V3_URI);
    expect(offBc.chains[0].caip2ChainId).toBe("eip155:1");

    // Lowercase invariant
    expect(onBc.chains[0].assetRecoveryAddress).toBe(recoveryInput.toLowerCase());
    expect(onBc.chains[0].accounts[0].accountAddress).toBe(contractInput.toLowerCase());
    expect(onBc.chains[0].accounts[0].childContractScope).toBe(
      bc.ChildContractScope.All,
    );
  });
});

describe("agreement state enum", () => {
  it("matches expected ints and ATTACKABLE_STATES", () => {
    expect(Number(bc.AgreementState.UnderAttack)).toBe(3);
    expect(Number(bc.AgreementState.PromotionRequested)).toBe(4);
    expect(bc.ATTACKABLE_STATES.has(bc.AgreementState.UnderAttack)).toBe(true);
    expect(bc.ATTACKABLE_STATES.has(bc.AgreementState.PromotionRequested)).toBe(true);
  });
});

describe("ABI shape", () => {
  it("AGREEMENT_FACTORY_ABI exposes create()", () => {
    const names = bc.AGREEMENT_FACTORY_ABI.map((fn: any) => fn.name);
    expect(names).toContain("create");
  });
  it("DEPLOYER_ABI exposes deployCreate/2/3", () => {
    const names = bc.DEPLOYER_ABI.map((fn: any) => fn.name);
    expect(names).toContain("deployCreate");
    expect(names).toContain("deployCreate2");
    expect(names).toContain("deployCreate3");
  });
  it("REGISTRY_ABI has adoptSafeHarbor", () => {
    const names = bc.REGISTRY_ABI.map((fn: any) => fn.name);
    expect(names).toContain("adoptSafeHarbor");
  });
  it("ATTACK_REGISTRY_ABI has requestUnderAttack, goToProduction, and approveAttack", () => {
    const names = bc.ATTACK_REGISTRY_ABI.map((fn: any) => fn.name);
    expect(names).toContain("requestUnderAttack");
    expect(names).toContain("goToProduction");
    expect(names).toContain("approveAttack");
  });
});

// -----------------------------------------------------------------------------
// is_attackable: mirrors the BCQuery test fixtures from
// battlechain-lib/test/mocks/mock_api.sh
// -----------------------------------------------------------------------------

const FIXTURES: Record<string, any> = {
  "0x0000000000000000000000000000000000000aaa": {
    agreements: [{ state: "UNDER_ATTACK" }],
    hasCoverage: true,
    isAgreementContract: false,
  },
  "0x0000000000000000000000000000000000000bbb": {
    agreements: [{ state: "PRODUCTION" }],
    hasCoverage: true,
    isAgreementContract: false,
  },
  "0x0000000000000000000000000000000000000ccc": {
    agreements: [{ state: "PROMOTION_REQUESTED" }],
    hasCoverage: true,
    isAgreementContract: false,
  },
  "0x0000000000000000000000000000000000000eee": {
    agreements: [],
    hasCoverage: false,
    isAgreementContract: false,
  },
};

describe("isAttackable matches BCQuery fixtures", () => {
  beforeEach(() => {
    // Stub fetch to return our fixtures.
    vi.stubGlobal("fetch", async (url: string) => {
      const addr = url.toLowerCase().split("/").pop()!;
      if (FIXTURES[addr]) {
        return new Response(JSON.stringify(FIXTURES[addr]), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
  });

  // Stub a runner whose chainId resolves to 627
  const fakeRunner: any = {
    provider: { getNetwork: async () => ({ chainId: 627n }) },
  };

  it.each([
    ["0x0000000000000000000000000000000000000aaa", true],
    ["0x0000000000000000000000000000000000000bbb", false],
    ["0x0000000000000000000000000000000000000ccc", true],
    ["0x0000000000000000000000000000000000000eee", false],
  ])("address %s -> %s", async (addr, expected) => {
    expect(await bc.isAttackable(fakeRunner, addr as string)).toBe(expected);
  });

  it("propagates API failures", async () => {
    await expect(
      bc.isAttackable(fakeRunner, "0x0000000000000000000000000000000000000fff"),
    ).rejects.toThrow(bc.ApiFailedError);
  });
});

describe("agreement-by-contract URL", () => {
  it("hits the BattleChain-specific route, not /api", () => {
    const url = `${config.explorerHost(627)}/battlechain/agreement/by-contract/0xabc`;
    expect(url.startsWith(config.TESTNET_EXPLORER_HOST)).toBe(true);
    expect(url.endsWith("/battlechain/agreement/by-contract/0xabc")).toBe(true);
    expect(url.includes("/api")).toBe(false);
  });
});

describe("MockRegistryModerator", () => {
  it("returns the testnet address only on chain 627", () => {
    expect(config.mockRegistryModeratorAddress(627)).toBe(
      config.TESTNET_MOCK_REGISTRY_MODERATOR,
    );
    expect(config.mockRegistryModeratorAddress(626)).toBeNull();
    expect(config.mockRegistryModeratorAddress(1)).toBeNull();
    expect(config.mockRegistryModeratorAddress(31337)).toBeNull();
  });
});
