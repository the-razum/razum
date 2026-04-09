#!/bin/bash
echo "=== Обновляю майнер на Mac Mini ==="
echo ""

ssh -t -i ~/.ssh/id_ed25519_m4 svyat@192.168.0.107 'zsh -l -c "
echo \"--- Git pull ---\"
cd ~/Razum
git pull origin main 2>&1
echo \"\"

echo \"--- Убиваю старый процесс ---\"
pkill -f \"node.*miner.js\" 2>/dev/null
sleep 2

echo \"--- Запускаю новый майнер ---\"
NODE_BIN=\$(which node)
mkdir -p ~/.razum
nohup \$NODE_BIN miner.js > ~/.razum/miner.log 2>&1 &
disown
echo \"PID: \$!\"
sleep 4

echo \"\"
echo \"--- Проверяю процесс ---\"
ps aux | grep miner.js | grep -v grep

echo \"\"
echo \"--- Лог ---\"
tail -30 ~/.razum/miner.log 2>/dev/null
"'

echo ""
echo "=== Готово! ==="
read -p "Нажми Enter чтобы закрыть..."
