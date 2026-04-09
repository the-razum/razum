#!/bin/bash
echo "=== Логи майнера на Mac Mini ==="
echo ""

ssh -t -i ~/.ssh/id_ed25519_m4 svyat@192.168.0.107 'zsh -l -c "
echo \"--- Процесс майнера ---\"
ps aux | grep miner.js | grep -v grep
echo \"\"

echo \"--- debug.log (последние 40 строк) ---\"
tail -40 ~/.razum/debug.log 2>/dev/null || echo \"Нет debug.log\"
echo \"\"

echo \"--- crash.log ---\"
cat ~/.razum/crash.log 2>/dev/null || echo \"Нет crash.log\"
echo \"\"

echo \"--- miner.log (последние 20 строк) ---\"
tail -20 ~/.razum/miner.log 2>/dev/null || echo \"Нет miner.log\"
echo \"\"

echo \"--- Проверка Ollama ---\"
curl -s http://127.0.0.1:11434/api/tags 2>/dev/null | head -c 200
echo \"\"
"'

echo ""
echo "=== Готово! ==="
read -p "Нажми Enter чтобы закрыть..."
