#!/usr/bin/env bash
# Razum Miner installer
# Usage:
#   curl -fsSL https://airazum.com/install.sh | WALLET=0xYOURWALLET bash
# or:
#   bash install.sh
set -euo pipefail

COORD="${COORDINATOR:-https://airazum.com}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.razum}"
MINER_URL="${MINER_URL:-$COORD/miner.js}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
err()  { printf '\033[31m✗\033[0m %s\n' "$*" >&2; }

bold "═══════════════════════════════════════"
bold "  Razum Miner Installer"
bold "═══════════════════════════════════════"

# 1. Node.js
if ! command -v node >/dev/null 2>&1; then
  err "Node.js не найден. Установи Node.js 18+ → https://nodejs.org"
  exit 1
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Нужен Node.js 18+, у тебя $(node -v)"
  exit 1
fi
ok "Node.js $(node -v)"

# 2. Ollama
if ! command -v ollama >/dev/null 2>&1; then
  warn "Ollama не найдена. Установить?"
  read -p "Установить Ollama сейчас? [y/N] " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    curl -fsSL https://ollama.com/install.sh | sh
  else
    err "Ollama обязательна. Прерываю."
    exit 1
  fi
fi
ok "Ollama: $(ollama --version 2>&1 | head -1)"

# 3. Скачать miner.js
mkdir -p "$INSTALL_DIR"
bold "Скачиваю miner.js → $INSTALL_DIR/miner.js"
curl -fsSL "$MINER_URL" -o "$INSTALL_DIR/miner.js"
chmod +x "$INSTALL_DIR/miner.js"
ok "miner.js установлен"

# 4. Wallet
if [ -z "${WALLET:-}" ] && [ ! -f "$INSTALL_DIR/config.json" ]; then
  echo
  bold "Введи Ethereum-адрес своего кошелька (на него будут начисляться награды):"
  read -p "Wallet (0x...): " WALLET
fi
if [ -n "${WALLET:-}" ]; then
  cat > "$INSTALL_DIR/config.json" <<EOF
{
  "coordinator": "$COORD",
  "walletAddress": "$WALLET",
  "minerName": "$(hostname)"
}
EOF
  ok "Конфиг сохранён в $INSTALL_DIR/config.json"
fi

# 5. Models
echo
bold "Какие модели у тебя есть в Ollama:"
ollama list || true
echo
warn "Если нужной модели нет — выполни: ollama pull deepseek-r1:14b"

# 6. Service install
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.razum.miner.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  NODE_BIN="$(command -v node)"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.razum.miner</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$INSTALL_DIR/miner.js</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$INSTALL_DIR/miner.log</string>
  <key>StandardErrorPath</key><string>$INSTALL_DIR/miner.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load "$PLIST"
  ok "launchd сервис установлен и запущен"
  echo "  Логи:    tail -f $INSTALL_DIR/miner.log"
  echo "  Стоп:    launchctl unload $PLIST"

elif [ "$OS" = "Linux" ]; then
  if command -v systemctl >/dev/null 2>&1; then
    UNIT="/etc/systemd/system/razum-miner.service"
    NODE_BIN="$(command -v node)"
    sudo tee "$UNIT" > /dev/null <<EOF
[Unit]
Description=Razum Miner
After=network-online.target

[Service]
ExecStart=$NODE_BIN $INSTALL_DIR/miner.js
Restart=always
RestartSec=5
User=$USER
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable --now razum-miner
    ok "systemd сервис razum-miner запущен"
    echo "  Логи:  journalctl -u razum-miner -f"
    echo "  Стоп:  sudo systemctl stop razum-miner"
  else
    warn "systemd не найден. Запусти вручную: node $INSTALL_DIR/miner.js"
  fi
fi

echo
bold "═══════════════════════════════════════"
ok "Готово! Майнер запущен."
echo "  Статус кошелька:  $COORD/account"
echo "  Логи:             $INSTALL_DIR/miner.log"
bold "═══════════════════════════════════════"
