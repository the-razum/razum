#!/usr/bin/env bash
# razum-smoke — full end-to-end smoke test.
# Run: bash scripts/smoke-test.sh
# Returns 0 on all pass, 1 on any failure.
set -uo pipefail

BASE=${BASE:-https://airazum.com}
TS=$(date -u +%s)
EMAIL="smoke+${TS}@airazum.com"
PASS="SmokeTest${TS}!"
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

green='\033[32m'; red='\033[31m'; yellow='\033[33m'; reset='\033[0m'
ok=0; fail=0
result() {
  if [ "$1" = "OK" ]; then
    printf '%b%-26s%b %s\n' "$green" "PASS $2" "$reset" "$3"
    ok=$((ok+1))
  else
    printf '%b%-26s%b %s\n' "$red" "FAIL $2" "$reset" "$3"
    fail=$((fail+1))
  fi
}

echo "=== Razum AI smoke test against $BASE — $(date -u) ==="

# 1. landing 200
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
[ "$code" = "200" ] && result OK "GET /" "$code" || result FAIL "GET /" "got $code"

# 2. health
H=$(curl -s "$BASE/api/health")
echo "$H" | grep -q '"status":"healthy"' && result OK "/api/health" "healthy" || result FAIL "/api/health" "$H"

# 3. chain status
H=$(curl -s "$BASE/api/chain/status")
echo "$H" | grep -q 'razum-testnet-1' && result OK "/api/chain/status" "chain_id ok" || result FAIL "/api/chain/status" "$H"

# 4. chain RPC
H=$(curl -s "$BASE/chain-rpc/status")
echo "$H" | grep -q latest_block_height && result OK "/chain-rpc/status" "blocks alive" || result FAIL "/chain-rpc/status" "$H"

# 5. chain REST
H=$(curl -s "$BASE/chain-api/cosmos/bank/v1beta1/supply/by_denom?denom=nrazum")
echo "$H" | grep -q nrazum && result OK "/chain-api supply" "nrazum exists" || result FAIL "/chain-api supply" "$H"

# 6. faucet GET (info)
H=$(curl -s "$BASE/api/faucet")
echo "$H" | grep -q '"ok":true' && result OK "/api/faucet GET" "info ok" || result FAIL "/api/faucet GET" "$H"

# 7. public pages
for p in /chain /faucet /miner /docs /terms /privacy /pricing /login /register; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")
  [ "$c" = "200" ] && result OK "GET $p" "$c" || result FAIL "GET $p" "$c"
done

# 8. register
REG=$(curl -s -c "$JAR" -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"name\":\"Smoke\",\"password\":\"$PASS\"}" "$BASE/api/auth/register")
echo "$REG" | grep -q '"id"' && result OK "register" "user created" || result FAIL "register" "$REG"

# 9. /api/auth/me with cookie
ME=$(curl -s -b "$JAR" "$BASE/api/auth/me")
echo "$ME" | grep -q "$EMAIL" && result OK "/api/auth/me" "logged in" || result FAIL "/api/auth/me" "$ME"

# 10. anon chat (single small prompt)
START=$(date +%s%3N)
CHAT=$(curl -s -N -X POST "$BASE/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"скажи hi"}],"model":"qwen3.5-9b","webSearch":false}' \
  -m 30 2>/dev/null)
END=$(date +%s%3N)
LATENCY=$((END - START))
TEXT=$(echo "$CHAT" | grep -oE '"content":"[^"]+"' | sed 's/"content":"//;s/"$//' | tr -d '\n' | head -c 200)
if [ -n "$TEXT" ]; then
  result OK "chat (anon)" "latency=${LATENCY}ms reply=\"${TEXT:0:60}...\""
else
  result FAIL "chat (anon)" "empty response in ${LATENCY}ms"
fi

# Summary
echo
echo "=== Summary: ${ok} pass, ${fail} fail ==="
[ $fail -eq 0 ]
