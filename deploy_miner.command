#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== Деплою обновлённый miner.js на Mac Mini ==="
echo "Из: $SCRIPT_DIR/miner.js"
echo ""

# Copy updated miner.js via scp
echo "--- Копирую miner.js через SCP ---"
scp -i ~/.ssh/id_ed25519_m4 "$SCRIPT_DIR/miner.js" svyat@192.168.0.107:~/Razum/miner.js
if [ $? -ne 0 ]; then
  echo "ОШИБКА: не удалось скопировать файл!"
  read -p "Нажми Enter чтобы закрыть..."
  exit 1
fi
echo "Файл скопирован!"
echo ""

# Restart miner
echo "--- Перезапускаю майнер ---"
ssh -t -i ~/.ssh/id_ed25519_m4 svyat@192.168.0.107 'zsh -l -c "
pkill -f \"node.*miner.js\" 2>/dev/null
sleep 2

cd ~/Razum
NODE_BIN=\$(which node)
mkdir -p ~/.razum
nohup \$NODE_BIN miner.js > ~/.razum/miner.log 2>&1 &
disown
echo \"PID: \$!\"
sleep 5

echo \"\"
echo \"--- Проверяю процесс ---\"
ps aux | grep miner.js | grep -v grep

echo \"\"
echo \"--- Лог (30 строк) ---\"
tail -30 ~/.razum/miner.log 2>/dev/null
"'

echo ""
echo "=== Готово! ==="
read -p "Нажми Enter чтобы закрыть..."
