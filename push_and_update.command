#!/bin/bash
cd "$(dirname "$0")"
echo "=== Razum: Push & Update ==="
echo ""
echo "1. Pushing to GitHub..."
git push origin main
echo ""
echo "2. Stopping old miner (if running)..."
pkill -f "node.*miner.js" 2>/dev/null || true
sleep 1
echo ""
echo "3. Starting miner with streaming..."
nohup node miner.js > ~/.razum/miner.log 2>&1 &
echo "   Miner PID: $!"
echo ""
echo "=== Done! ==="
echo "Miner log: ~/.razum/miner.log"
echo ""
echo "Press any key to close..."
read -n 1
