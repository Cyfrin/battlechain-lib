/**
 * Custom errors mirroring custom errors from cyfrin/battlechain-lib (Solidity).
 */

export class BattleChainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BattleChainError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnsupportedChainIdError extends BattleChainError {
  readonly chainId: number;

  constructor(chainId: number) {
    super(`Unsupported chain ID: ${chainId}`);
    this.name = "UnsupportedChainIdError";
    this.chainId = chainId;
  }
}

export class CreateXNotAvailableError extends BattleChainError {
  readonly chainId: number;

  constructor(chainId: number) {
    super(`CreateX not available on chain ID: ${chainId}`);
    this.name = "CreateXNotAvailableError";
    this.chainId = chainId;
  }
}

export class NotBattleChainError extends BattleChainError {
  readonly chainId: number;

  constructor(chainId: number) {
    super(
      `Operation requires BattleChain (mainnet 626 / testnet 627); ` +
        `got chain ID ${chainId}`,
    );
    this.name = "NotBattleChainError";
    this.chainId = chainId;
  }
}

export class ZeroAddressError extends BattleChainError {
  constructor(message = "address cannot be the zero address") {
    super(message);
    this.name = "ZeroAddressError";
  }
}

export class ApiFailedError extends BattleChainError {
  readonly contractAddress: string;

  constructor(contractAddress: string, detail = "") {
    let msg = `Block explorer API failed for ${contractAddress}`;
    if (detail) msg = `${msg}: ${detail}`;
    super(msg);
    this.name = "ApiFailedError";
    this.contractAddress = contractAddress;
  }
}

export class UnsupportedChainForQueryError extends BattleChainError {
  readonly chainId: number;

  constructor(chainId: number) {
    super(
      `BattleChain block explorer query API not available for chain ID: ${chainId}`,
    );
    this.name = "UnsupportedChainForQueryError";
    this.chainId = chainId;
  }
}
