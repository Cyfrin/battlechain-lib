"""Custom exceptions mirroring custom errors from cyfrin/battlechain-lib (Solidity)."""


class BattleChainError(Exception):
    """Base class for all battlechain-lib-py errors."""


class UnsupportedChainIdError(BattleChainError):
    """Raised when the active chain has no BattleChain config registered.

    Mirrors `BCConfig__UnsupportedChainId(uint256 chainId)`.
    """

    def __init__(self, chain_id: int) -> None:
        super().__init__(f"Unsupported chain ID: {chain_id}")
        self.chain_id = chain_id


class CreateXNotAvailableError(BattleChainError):
    """Raised when CreateX is not deployed at the well-known address on this chain.

    Mirrors `BCConfig__CreateXNotAvailable(uint256 chainId)`.
    """

    def __init__(self, chain_id: int) -> None:
        super().__init__(f"CreateX not available on chain ID: {chain_id}")
        self.chain_id = chain_id


class NotBattleChainError(BattleChainError):
    """Raised when a BattleChain-only operation is attempted on another chain.

    Mirrors `BCSafeHarbor__NotBattleChain()`.
    """

    def __init__(self, chain_id: int) -> None:
        super().__init__(
            f"Operation requires BattleChain (mainnet 626 / testnet 627); got chain ID {chain_id}"
        )
        self.chain_id = chain_id


class ZeroAddressError(BattleChainError):
    """Raised when a required address override is the zero address.

    Mirrors `BCBase__ZeroAddress()`.
    """


class ApiFailedError(BattleChainError):
    """Raised when the block explorer agreement-by-contract API call fails.

    Mirrors `BCQuery__ApiFailed(address contractAddress)`.
    """

    def __init__(self, contract_address: str, detail: str = "") -> None:
        msg = f"Block explorer API failed for {contract_address}"
        if detail:
            msg = f"{msg}: {detail}"
        super().__init__(msg)
        self.contract_address = contract_address


class UnsupportedChainForQueryError(BattleChainError):
    """Raised when the active chain has no block explorer query API registered.

    Mirrors `BCQuery__UnsupportedChainForQuery(uint256 chainId)`.
    """

    def __init__(self, chain_id: int) -> None:
        super().__init__(
            f"BattleChain block explorer query API not available for chain ID: {chain_id}"
        )
        self.chain_id = chain_id
