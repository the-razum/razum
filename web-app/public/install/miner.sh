#!/usr/bin/env bash
# Razum AI — one-command miner installer
# Usage:
#   curl -L https://airazum.com/install/miner.sh | bash
#   # or with wallet address:
#   WALLET=0xYOUR_ETH curl -L https://airazum.com/install/miner.sh | bash
set -euo pipefail

GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'; RESET='\033[0m'
echo -e "${GREEN}===> Razum AI miner installer${RESET}"

# Detect OS
OS=$(uname -s)
case "$OS" in
  Darwin) PLATFORM=mac ;;
  Linux)  PLATFORM=linux ;;
  *) echo -e "${RED}Unsupported OS: $OS${RESET}"; exit 1 ;;
esac
echo "Platform: $PLATFORM"

# 1. Install brew (Mac only, if missing)
if [ "$PLATFORM" = "mac" ] && ! command -v brew > /dev/null; then
  echo -e "${YELLOW}-> installing Homebrew${RESET}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# 2. Install Ollama
if ! command -v ollama > /dev/null; then
  echo -e "${YELLOW}-> installing Ollama${RESET}"
  if [ "$PLATFORM" = "mac" ]; then
    brew install ollama
    brew services start ollama
  else
    curl -fsSL https://ollama.com/install.sh | sh
    systemctl enable --now ollama || (nohup ollama serve > /tmp/ollama.log 2>&1 &)
  fi
fi
sleep 5

# 3. Install Node 22+
if ! command -v node > /dev/null || [ "$(node -v | sed 's/[^0-9]//g' | cut -c1-2)" -lt 18 ]; then
  echo -e "${YELLOW}-> installing Node${RESET}"
  if [ "$PLATFORM" = "mac" ]; then
    brew install node
  else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs || (curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && . ~/.nvm/nvm.sh && nvm install 22)
  fi
fi

# 4. Pull model — qwen2.5:7b fits 8-16 GB Macs comfortably
echo -e "${YELLOW}-> pulling qwen2.5:7b (~4.7 GB, this may take a few minutes)${RESET}"
ollama pull qwen2.5:7b

# 5. Download miner script
mkdir -p ~/.razum
echo -e "${YELLOW}-> downloading miner.js${RESET}"
curl -fsSL https://airazum.com/install/miner.js -o ~/.razum/miner.js

# 6. Wallet
WALLET=${WALLET:-${WALLET_ADDRESS:-}}
if [ -z "$WALLET" ]; then
  if [ -t 0 ]; then
    echo "Enter your ETH wallet (0x...) for RZM rewards:"
    read -r WALLET
  fi
fi
if [ -z "$WALLET" ] || ! echo "$WALLET" | grep -qE '^0x[0-9a-fA-F]{40}$'; then
  echo -e "${YELLOW}WARN: WALLET not provided. Setting placeholder (you can edit ~/.razum/config.json later).${RESET}"
  WALLET='0x0000000000000000000000000000000000000000'
fi

HOSTNAME=$(hostname -s 2>/dev/null || echo my-miner)
cat > ~/.razum/config.json <<JSON
{
  "coordinator": "https://airazum.com",
  "ollamaUrl": "http://127.0.0.1:11434",
  "minerName": "$HOSTNAME",
  "walletAddress": "$WALLET",
  "heartbeatInterval": 30000,
  "pollInterval": 1000
}
JSON

# 7. Run (foreground first to verify, then auto-start setup)
echo -e "${GREEN}===> testing miner connection${RESET}"
cd ~/.razum
node miner.js > miner.log 2>&1 &
MPID=$!
sleep 6
if kill -0 $MPID 2>/dev/null && grep -q 'Registered\|Loaded existing' miner.log; then
  echo -e "${GREEN}===> miner running OK (pid $MPID)${RESET}"
  echo
  if [ "$PLATFORM" = "mac" ]; then
    cat > ~/Library/LaunchAgents/com.razum.miner.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.razum.miner</string>
<key>ProgramArguments</key>
<array><string>$(which node)</string><string>$HOME/.razum/miner.js</string></array>
<key>WorkingDirectory</key><string>$HOME/.razum</string>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$HOME/.razum/miner.log</string>
<key>StandardErrorPath</key><string>$HOME/.razum/miner.err.log</string>
</dict></plist>
PLIST
    kill $MPID 2>/dev/null
    sleep 1
    launchctl load ~/Library/LaunchAgents/com.razum.miner.plist
    echo -e "${GREEN}===> LaunchAgent installed — miner will auto-start on reboot${RESET}"
  fi
  echo
  echo "You're a miner now. Useful commands:"
  echo "  tail -f ~/.razum/miner.log     # live logs"
  echo "  cat ~/.razum/state.json        # your miner ID + API key"
  echo
  echo "Track your rewards at: https://airazum.com/account"
else
  echo -e "${RED}===> miner failed to start. Logs:${RESET}"
  tail -30 ~/.razum/miner.log
  exit 1
fi
