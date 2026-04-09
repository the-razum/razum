#!/bin/bash
echo "=== Дебаг майнера на Mac Mini ==="
echo ""

ssh -t -i ~/.ssh/id_ed25519_m4 svyat@192.168.0.107 'zsh -l -c "
echo \"--- Убиваю старый процесс ---\"
pkill -f \"node.*miner.js\" 2>/dev/null
sleep 1

echo \"--- Запускаю miner.js в foreground (15 сек) ---\"
cd ~/Razum
node miner.js &
MINER_PID=\$!
sleep 15
kill \$MINER_PID 2>/dev/null
wait \$MINER_PID 2>/dev/null
echo \"\"
echo \"--- Exit code: \$? ---\"

echo \"\"
echo \"--- Crash log ---\"
cat ~/.razum/crash.log 2>/dev/null || echo \"Нет crash.log\"

echo \"\"
echo \"--- Перезапускаю в background ---\"
NODE_BIN=\$(which node)
mkdir -p ~/.razum
nohup \$NODE_BIN miner.js > ~/.razum/miner.log 2>&1 &
echo \"PID: \$!\"
"'

echo ""
echo "=== Готово! ==="
read -p "Нажми Enter чтобы закрыть..."
