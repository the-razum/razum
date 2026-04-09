#!/bin/bash
set -e

echo "========================================="
echo "  Razum AI Miner v1.0"
echo "========================================="

# Start Ollama server in background
echo "[Razum] Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "[Razum] Waiting for Ollama to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "[Razum] Ollama is ready!"
    break
  fi
  sleep 1
done

# Pull configured models
IFS=',' read -ra MODEL_LIST <<< "${MODELS:-deepseek-r1:14b}"
for model in "${MODEL_LIST[@]}"; do
  model=$(echo "$model" | xargs)  # trim whitespace
  echo "[Razum] Pulling model: $model"
  ollama pull "$model" || echo "[Razum] Warning: Failed to pull $model"
done

echo "[Razum] All models ready. Starting miner agent..."

# Start the miner agent
exec node /app/miner.js
