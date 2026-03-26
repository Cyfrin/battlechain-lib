# BattleChain justfile targets
# Import into your project's justfile with:
#   import "lib/battlechain-lib/battlechain.just"
#
# Requires these variables (set in your justfile or .env):
#   ACCOUNT  — Foundry keystore account name (e.g. "battlechain")
#   SENDER   — Deployer's public address

bc-rpc := "https://testnet.battlechain.com"
bc-explorer-api := "https://block-explorer-api.testnet.battlechain.com/api"
bc-chain-id := "627"
bc-verify-flags := "--verifier-url " + bc-explorer-api + " --verifier custom --etherscan-api-key 1234"

# Verify a single contract on the BattleChain block explorer.
# Usage: just bc-verify 0xAbC... src/MyVault.sol:MyVault
[group('battlechain')]
bc-verify contract_address path_and_name:
    forge verify-contract {{ contract_address }} {{ path_and_name }} \
        --chain-id {{ bc-chain-id }} \
        {{ bc-verify-flags }} \
        --rpc-url {{ bc-rpc }}

# Verify all contracts from a forge broadcast JSON file.
# Handles both direct creates and factory creates (CreateX/BCDeploy)
# by parsing ContractCreation events from receipts.
# Usage: just bc-verify-broadcast script/Deploy.s.sol
[group('battlechain')]
bc-verify-broadcast script:
    #!/usr/bin/env bash
    set -euo pipefail
    BROADCAST="broadcast/$(basename {{ script }})/{{ bc-chain-id }}/run-latest.json"
    if [ ! -f "$BROADCAST" ]; then
        echo "No broadcast found at $BROADCAST"
        exit 1
    fi
    echo "Parsing $BROADCAST..."

    # ContractCreation(address indexed) event topic (CreateX)
    CREATEX_TOPIC="0x4db17dd5e4732fb6da34a148104a592783ca119a1e7bb8829eba6cbadef0b511"

    # Match initCode prefix against compiled artifacts.
    # Prints "src/path:ContractName" on match, empty otherwise.
    match_initcode() {
        local initcode="${1#0x}"
        for artifact in out/*.sol/*.json; do
            local bytecode
            bytecode=$(jq -r '.bytecode.object // empty' "$artifact" 2>/dev/null)
            [ -z "$bytecode" ] && continue
            bytecode="${bytecode#0x}"
            if [ "${#bytecode}" -gt 4 ] && \
               [ "${#initcode}" -ge "${#bytecode}" ] && \
               [ "${initcode:0:${#bytecode}}" = "$bytecode" ]; then
                local match
                match=$(jq -r '
                    .metadata.settings.compilationTarget // {} |
                    to_entries[0] // empty |
                    "\(.key):\(.value)"
                ' "$artifact" 2>/dev/null)
                [ -n "$match" ] && echo "$match" && return
            fi
        done
    }

    verify_contract() {
        local addr="$1" initcode="$2"
        local match
        match=$(match_initcode "$initcode")
        if [ -n "$match" ]; then
            echo "Verifying $match at $addr"
            just bc-verify "$addr" "$match" || echo "  FAILED (may need manual verification)"
        else
            echo "Could not match artifact for $addr — verify manually"
        fi
    }

    # 1. Direct creates (additionalContracts in broadcast)
    jq -r '
        [.transactions[].additionalContracts[]? |
         select(.transactionType == "CREATE" or .transactionType == "CREATE2")] |
        .[] | "\(.address) \(.initCode)"
    ' "$BROADCAST" | while IFS=' ' read -r addr initcode; do
        [ -n "$addr" ] && verify_contract "$addr" "$initcode"
    done

    # 2. Factory creates (ContractCreation events from CreateX/BCDeploy)
    jq -r --arg topic "$CREATEX_TOPIC" '
        ([.transactions[] | {key: .hash, value: .transaction.input}] | from_entries) as $inputs |
        .receipts[] |
        .transactionHash as $txhash |
        .logs[] |
        select(.topics[0] == $topic) |
        ("0x" + .topics[1][-40:]) + " " + ($inputs[$txhash] // "")
    ' "$BROADCAST" | while IFS=' ' read -r addr callinput; do
        [ -z "$addr" ] || [ -z "$callinput" ] && continue
        initcode=""
        for sig in \
            "deployCreate(bytes)" \
            "deployCreate2(bytes32,bytes)" \
            "deployCreate3(bytes32,bytes)"; do
            initcode=$(cast calldata-decode "$sig" "$callinput" 2>/dev/null | tail -1) && break
            initcode=""
        done
        if [ -n "$initcode" ]; then
            verify_contract "$addr" "$initcode"
        else
            echo "Could not decode factory calldata for $addr — verify manually"
        fi
    done

# Deploy a forge script to BattleChain with standard flags.
# Usage: just bc-deploy script/Deploy.s.sol
[group('battlechain')]
bc-deploy script account sender:
    forge script {{ script }} \
        --rpc-url {{ bc-rpc }} \
        --broadcast \
        --account {{ account }} \
        --sender {{ sender }} \
        --skip-simulation \
        -g 300

# Deploy and verify in one step.
# Usage: just bc-deploy-verify script/Deploy.s.sol
[group('battlechain')]
bc-deploy-verify script account sender:
    forge script {{ script }} \
        --rpc-url {{ bc-rpc }} \
        --broadcast \
        --account {{ account }} \
        --sender {{ sender }} \
        --skip-simulation \
        -g 300 \
        --verify {{ bc-verify-flags }}

# Check agreement state (2=ATTACK_REQUESTED, 3=UNDER_ATTACK, 5=PRODUCTION)
[group('battlechain')]
bc-check-state agreement_address:
    cast call {{ agreement_address }} "getAgreementState(address)(uint8)" {{ agreement_address }} \
        --rpc-url {{ bc-rpc }}
