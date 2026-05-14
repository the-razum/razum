#!/usr/bin/env bash
# razum-monitor — runs every 5 min via cron. Logs to /var/log/razum-monitor.log
# Status file at /var/log/razum-monitor.state — current state per check (OK / FAIL).
# Alerts: if a check transitions OK→FAIL, sends a TG message if TG_BOT_TOKEN+TG_CHAT_ID env set.

set -u
LOG=/var/log/razum-monitor.log
STATE_DIR=/var/log/razum-monitor.state
mkdir -p "$STATE_DIR"
NOW=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Load TG creds if file present
if [ -f /opt/razum-monitor/tg.env ]; then
  . /opt/razum-monitor/tg.env
fi

notify() {
  local msg="$1"
  echo "[$NOW] ALERT: $msg" >> "$LOG"
  if [ -n "${TG_BOT_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ]; then
    curl -s -o /dev/null --max-time 5 \
      -d chat_id="$TG_CHAT_ID" \
      --data-urlencode text="🚨 $msg" \
      "https://api.telegram.org/bot$TG_BOT_TOKEN/sendMessage"
  fi
}

check() {
  local name="$1" cmd="$2" expect="$3"
  local result
  result=$(eval "$cmd" 2>/dev/null || true)
  local status="FAIL"
  if echo "$result" | grep -q -- "$expect"; then status="OK"; fi
  echo "[$NOW] $name: $status" >> "$LOG"
  local sfile="$STATE_DIR/$name"
  local prev=""
  [ -f "$sfile" ] && prev=$(cat "$sfile")
  echo "$status" > "$sfile"
  if [ "$status" = "FAIL" ] && [ "$prev" != "FAIL" ]; then
    notify "$name DOWN — expected $expect, got: $(echo "$result" | head -c 200)"
  fi
  if [ "$status" = "OK" ] && [ "$prev" = "FAIL" ]; then
    notify "$name RECOVERED ✅"
  fi
}

check "web-health"  "curl -s --max-time 5 https://airazum.com/api/health"             '"status":"healthy"'
check "chain-rpc"   "curl -s --max-time 5 https://airazum.com/chain-rpc/status"      '"latest_block_height"'
check "chain-rest"  "curl -s --max-time 5 https://airazum.com/chain-api/cosmos/base/tendermint/v1beta1/blocks/latest" 'razum-testnet-1'
check "miner-online" "curl -s --max-time 5 https://airazum.com/api/health | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[\"stats\"][\"onlineMiners\"])'" '1'
check "systemd-razumd" "systemctl is-active razumd" 'active'
check "pm2-razum-web" "pm2 jlist | python3 -c 'import sys,json; d=json.load(sys.stdin); print([x[\"pm2_env\"][\"status\"] for x in d if x[\"name\"]==\"razum-web\"][0])'" 'online'

# rotate log if > 5MB
[ -f "$LOG" ] && [ "$(stat -c%s "$LOG")" -gt 5242880 ] && tail -1000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
