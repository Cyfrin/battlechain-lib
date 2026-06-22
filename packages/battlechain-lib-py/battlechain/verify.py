"""Contract source verification on the BattleChain block explorer.

Submits compiled source for verification via the explorer's Etherscan-compatible
API and polls until the verification result is known. Works for any compiler the
explorer supports — Vyper (`vyper-json`) and Solidity (`solidity-standard-json-input`)
are the two common formats.

Boa-first: the chain is read from `boa.env`, and addresses can be passed directly.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Literal

from battlechain import _boa, config

# The explorer doesn't validate API keys for verify endpoints; any non-empty
# string works. We use a stable placeholder so logs don't show "None".
_DEFAULT_API_KEY = "not-required"

# Polling parameters — match the starter's behavior so users don't see regressions.
_INDEX_TIMEOUT_SECONDS = 60
_INDEX_POLL_INTERVAL_SECONDS = 3
_VERIFY_TIMEOUT_SECONDS = 120
_VERIFY_POLL_INTERVAL_SECONDS = 5

CodeFormat = Literal["vyper-json", "solidity-standard-json-input"]


def _api_url(chain_id: int) -> str:
    return config.explorer_api(chain_id)


def _http_get(url: str) -> dict[str, Any]:
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())


def _http_post_form(url: str, data: dict[str, str]) -> dict[str, Any]:
    body = urllib.parse.urlencode(data).encode()
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(request) as resp:
        return json.loads(resp.read())


def _wait_for_indexing(
    api_url: str,
    address: str,
    chain_id: int,
    api_key: str,
) -> None:
    """Poll until the explorer has indexed the contract, or time out."""
    deadline = time.time() + _INDEX_TIMEOUT_SECONDS
    params = urllib.parse.urlencode({
        "module": "contract",
        "action": "getabi",
        "address": address,
        "chainId": str(chain_id),
        "apikey": api_key,
    })
    while time.time() < deadline:
        data = _http_get(f"{api_url}?{params}")
        # The explorer returns this string once the contract is indexed but
        # before any source is verified — that's our signal to submit.
        if data.get("result") == "Contract source code not verified":
            return
        time.sleep(_INDEX_POLL_INTERVAL_SECONDS)
    print(f"  ⚠ Timed out waiting for indexer at {address} — submitting anyway")


def _poll_verification(api_url: str, guid: str, chain_id: int, api_key: str) -> str:
    """Poll the verification status endpoint until it returns a terminal result."""
    deadline = time.time() + _VERIFY_TIMEOUT_SECONDS
    params = urllib.parse.urlencode({
        "module": "contract",
        "action": "checkverifystatus",
        "guid": guid,
        "chainId": str(chain_id),
        "apikey": api_key,
    })
    while time.time() < deadline:
        time.sleep(_VERIFY_POLL_INTERVAL_SECONDS)
        data = _http_get(f"{api_url}?{params}")
        result = data.get("result", "")
        if result not in ("Pending in queue", "In progress"):
            return result
    return "Timed out waiting for verification result"


def _build_vyper_payload(contract_file: str, source_code: str) -> dict[str, Any]:
    return {
        "language": "Vyper",
        "sources": {contract_file: {"content": source_code}},
        "settings": {
            "outputSelection": {"*": ["evm.bytecode", "evm.deployedBytecode", "abi"]},
        },
    }


def verify_contract(
    address: str,
    contract_fqn: str,
    compiler_version: str,
    *,
    source_path: str | Path | None = None,
    chain_id: int | None = None,
    code_format: CodeFormat = "vyper-json",
    api_key: str = _DEFAULT_API_KEY,
) -> bool:
    """Verify a deployed contract on the BattleChain block explorer.

    Args:
        address: Deployed contract address.
        contract_fqn: File path and contract name, e.g. "src/MockToken.vy:MockToken".
        compiler_version: Compiler version string (e.g. "0.4.0" — the leading
            "v" is added automatically).
        source_path: Override path to the source file. Defaults to the path
            component of `contract_fqn`.
        chain_id: Override chain ID. Defaults to the active boa environment.
        code_format: Either "vyper-json" or "solidity-standard-json-input".
            Currently only `vyper-json` is implemented in the payload builder.
        api_key: Explorer API key. The BattleChain explorer doesn't validate it,
            but the field is required.

    Returns:
        True on a successful or already-verified result, False otherwise.
    """
    if code_format != "vyper-json":
        raise NotImplementedError(
            f"verify_contract currently only supports 'vyper-json'; got {code_format!r}"
        )

    contract_file, _ = contract_fqn.split(":", 1)
    src = Path(source_path) if source_path is not None else Path(contract_file)
    if not src.is_file():
        print(f"  ⚠ Source file not found: {src} — skipping verification")
        return False

    chain_id = chain_id if chain_id is not None else _boa.chain_id()
    api_url = _api_url(chain_id)

    std_json = _build_vyper_payload(contract_file, src.read_text())

    print(f"  ⏳ Waiting for explorer to index {address}...")
    _wait_for_indexing(api_url, address, chain_id, api_key)

    submit_url = (
        f"{api_url}?module=contract&action=verifysourcecode"
        f"&chainId={chain_id}&apikey={api_key}"
    )
    try:
        submit_data = _http_post_form(submit_url, {
            "contractaddress": address,
            "sourceCode": json.dumps(std_json),
            "codeformat": code_format,
            "contractname": contract_fqn,
            "compilerversion": f"v{compiler_version}",
        })
    except urllib.error.URLError as exc:
        print(f"  ✗ Verification submission failed: {exc}")
        return False

    if submit_data.get("status") != "1":
        print(f"  ✗ Verification submission rejected: {submit_data.get('result')}")
        return False

    print(f"  📤 Submitted for verification: {contract_fqn} at {address}")
    result = _poll_verification(api_url, submit_data["result"], chain_id, api_key)

    lowered = result.lower()
    if "already verified" in lowered or "pass" in lowered:
        print(f"  ✅ Verified: {address}")
        return True

    print(f"  ✗ Verification failed: {result}")
    return False


__all__ = ["verify_contract"]
