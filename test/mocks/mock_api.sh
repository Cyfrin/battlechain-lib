#!/usr/bin/env bash
# mock_api.sh - returns mock block explorer API responses for BCQuery tests
# Usage: mock_api.sh <address>

ADDR=$(echo "$1" | tr '[:upper:]' '[:lower:]')

# Agreement in UNDER_ATTACK state — isAttackable: true
if [ "$ADDR" = "0x0000000000000000000000000000000000000aaa" ]; then
    printf '{"agreements":[{"state":"UNDER_ATTACK"}],"hasCoverage":true,"isAgreementContract":false}'
# Agreement in PRODUCTION state — hasCoverage but not attackable
elif [ "$ADDR" = "0x0000000000000000000000000000000000000bbb" ]; then
    printf '{"agreements":[{"state":"PRODUCTION"}],"hasCoverage":true,"isAgreementContract":false}'
# Agreement in PROMOTION_REQUESTED state — isAttackable: true
elif [ "$ADDR" = "0x0000000000000000000000000000000000000ccc" ]; then
    printf '{"agreements":[{"state":"PROMOTION_REQUESTED"}],"hasCoverage":true,"isAgreementContract":false}'
# No coverage at all
elif [ "$ADDR" = "0x0000000000000000000000000000000000000eee" ]; then
    printf '{"agreements":[],"hasCoverage":false,"isAgreementContract":false}'
else
    # Simulate API error (empty output)
    exit 1
fi
