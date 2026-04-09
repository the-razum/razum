#!/bin/bash
echo "=== Перезапускаю майнер на Mac Mini ==="
echo ""

ssh -t -i ~/.ssh/id_ed25519_m4 svyat@192.168.0.107 'zsh -l -c "
echo \"--- Ищу node ---\"
which node 2>&1
node --version 2>&1
echo \"PATH: \$PATH\" | head -c 500
echo \"\"
echo \"\"

# Get full path
NODE_BIN=\$(which node 2>/dev/null)
echo \"Node bin: \$NODE_BIN\"

if [ -z \"\$NODE_BIN\" ]; then
  echo \"Node не найден даже в login shell!\"
  echo \"Ищу через find...\"
  find /usr/local /opt/homebrew \$HOME/.nvm -name node -type f 2>/dev/null | head -5
  exit 1
fi

echo \"\"
echo \"--- Убиваю старый процесс ---\"
pkill -f \"node.*miner.js\" 2>/dev/null
sleep 1

echo \"--- Запускаю майнер ---\"
mkdir -p ~/.razum
cd ~/Razum
nohup \$NODE_BIN miner.js > ~/.razum/miner.log 2>&1 &
disown
echo \"PID: \$!\"
sleep 4

echo \"\"
echo \"--- Проверяю процесс ---\"
ps aux | grep miner.js | grep -v grep

echo \"\"
echo \"--- Лог ---\"
tail -20 ~/.razum/miner.log 2>/dev/null
"'

echo ""
echo "=== Готово! ==="
read -p "Нажми Enter чтобы закрыть..."
