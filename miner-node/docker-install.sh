#!/bin/bash
# ===========================================
#  Razum AI Miner — Docker Quick Install
#  Запуск: curl -fsSL https://airazum.com/docker-install.sh | bash
# ===========================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║       Razum AI Miner — Docker        ║"
echo "  ║     Зарабатывай RZM токены с GPU     ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# --- Проверка Docker ---
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker не установлен!${NC}"
  echo ""
  echo "Установи Docker:"
  echo "  curl -fsSL https://get.docker.com | sh"
  echo "  sudo usermod -aG docker \$USER"
  echo "  newgrp docker"
  echo ""
  exit 1
fi

if ! docker compose version &> /dev/null 2>&1; then
  echo -e "${RED}Docker Compose не найден!${NC}"
  echo "Обнови Docker до последней версии."
  exit 1
fi

echo -e "${GREEN}✓${NC} Docker найден: $(docker --version | head -1)"

# --- Проверка NVIDIA ---
HAS_GPU=false
if command -v nvidia-smi &> /dev/null; then
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "")
  if [ -n "$GPU_NAME" ]; then
    HAS_GPU=true
    echo -e "${GREEN}✓${NC} NVIDIA GPU: ${CYAN}$GPU_NAME${NC}"

    # Проверяем NVIDIA Container Toolkit
    if docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
      echo -e "${GREEN}✓${NC} NVIDIA Container Toolkit работает"
    else
      echo -e "${YELLOW}!${NC} NVIDIA Container Toolkit не настроен"
      echo ""
      echo "Установка NVIDIA Container Toolkit:"
      echo "  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg"
      echo "  curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list"
      echo "  sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit"
      echo "  sudo nvidia-ctk runtime configure --runtime=docker"
      echo "  sudo systemctl restart docker"
      echo ""
      read -p "Продолжить без GPU? (y/N) " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
      HAS_GPU=false
    fi
  fi
fi

if [ "$HAS_GPU" = false ]; then
  echo -e "${YELLOW}!${NC} GPU не обнаружен — будет использоваться CPU"
fi

# --- Создаём директорию ---
INSTALL_DIR="$HOME/razum-miner"
echo ""
echo -e "${CYAN}Установка в:${NC} $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# --- Скачиваем файлы ---
COORDINATOR="https://airazum.com"
echo -e "${CYAN}Скачиваю файлы...${NC}"

curl -fsSL "$COORDINATOR/miner.js" -o miner.js
echo -e "${GREEN}✓${NC} miner.js"

# Dockerfile
cat > Dockerfile << 'DOCKERFILE'
FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /root/.razum
COPY miner.js .
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD pgrep -f "node miner.js" > /dev/null || exit 1
ENV COORDINATOR=https://airazum.com
ENV OLLAMA_URL=http://ollama:11434
ENV MINER_NAME=docker-miner
ENV WALLET_ADDRESS=
ENV MODELS=
ENV GPU_MODEL=Docker
VOLUME ["/root/.razum"]
CMD ["node", "miner.js"]
DOCKERFILE
echo -e "${GREEN}✓${NC} Dockerfile"

# --- Кошелёк ---
echo ""
echo -e "${BOLD}Настройка кошелька${NC}"
echo -e "Нужен Ethereum-кошелёк (MetaMask) для получения RZM токенов."
echo ""

if [ -f .env ] && grep -q "WALLET_ADDRESS=0x" .env; then
  EXISTING_WALLET=$(grep "WALLET_ADDRESS=" .env | head -1 | cut -d= -f2)
  echo -e "Текущий кошелёк: ${CYAN}$EXISTING_WALLET${NC}"
  read -p "Оставить? (Y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Nn]$ ]]; then
    read -p "Введи адрес кошелька (0x...): " WALLET
  else
    WALLET="$EXISTING_WALLET"
  fi
else
  read -p "Введи адрес кошелька (0x...): " WALLET
fi

# Валидация кошелька
if [[ ! "$WALLET" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo -e "${RED}Неверный формат кошелька!${NC}"
  echo "Должен быть: 0x + 40 hex символов"
  echo "Пример: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
  exit 1
fi

# --- Выбор модели ---
echo ""
echo -e "${BOLD}Выбор модели${NC}"
echo ""
echo "  Рекомендации по VRAM:"
echo -e "  ${CYAN}8 GB${NC}   → mistral:7b, qwen2.5:7b"
echo -e "  ${CYAN}16 GB${NC}  → deepseek-r1:14b ${GREEN}(рекомендуется)${NC}"
echo -e "  ${CYAN}24 GB${NC}  → deepseek-r1:32b"
echo -e "  ${CYAN}48 GB+${NC} → llama3:70b"
echo -e "  ${YELLOW}CPU${NC}    → qwen2.5:7b"
echo ""

if [ "$HAS_GPU" = true ]; then
  DEFAULT_MODEL="deepseek-r1:14b"
else
  DEFAULT_MODEL="qwen2.5:7b"
fi

read -p "Модель [$DEFAULT_MODEL]: " MODEL
MODEL=${MODEL:-$DEFAULT_MODEL}

# --- Имя майнера ---
DEFAULT_NAME="miner-$(hostname | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | head -c 16)"
read -p "Имя майнера [$DEFAULT_NAME]: " MINER_NAME
MINER_NAME=${MINER_NAME:-$DEFAULT_NAME}

# --- Создаём .env ---
cat > .env << ENVFILE
WALLET_ADDRESS=$WALLET
MINER_NAME=$MINER_NAME
OLLAMA_MODEL=$MODEL
GPU_MODEL=${GPU_NAME:-CPU}
COORDINATOR=https://airazum.com
MODELS=
POLL_INTERVAL=2000
HEARTBEAT_INTERVAL=20000
ENVFILE
echo -e "${GREEN}✓${NC} .env"

# --- Docker Compose ---
if [ "$HAS_GPU" = true ]; then
  cat > docker-compose.yml << 'COMPOSE'
services:
  ollama:
    image: ollama/ollama:latest
    container_name: razum-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  ollama-pull:
    image: curlimages/curl:latest
    container_name: razum-ollama-pull
    depends_on:
      ollama:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      sh -c '
        echo "=== Pulling model: ${OLLAMA_MODEL:-deepseek-r1:14b} ==="
        curl -s http://ollama:11434/api/pull -d "{\"name\": \"${OLLAMA_MODEL:-deepseek-r1:14b}\"}"
        echo "=== Model ready ==="
      '

  miner:
    build: .
    image: razum/miner:latest
    container_name: razum-miner
    restart: unless-stopped
    depends_on:
      ollama:
        condition: service_healthy
    volumes:
      - miner_data:/root/.razum
    env_file: .env
    environment:
      OLLAMA_URL: http://ollama:11434

volumes:
  ollama_data:
    name: razum-ollama-data
  miner_data:
    name: razum-miner-data
COMPOSE
else
  cat > docker-compose.yml << 'COMPOSE'
services:
  ollama:
    image: ollama/ollama:latest
    container_name: razum-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  ollama-pull:
    image: curlimages/curl:latest
    container_name: razum-ollama-pull
    depends_on:
      ollama:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      sh -c '
        echo "=== Pulling model: ${OLLAMA_MODEL:-qwen2.5:7b} ==="
        curl -s http://ollama:11434/api/pull -d "{\"name\": \"${OLLAMA_MODEL:-qwen2.5:7b}\"}"
        echo "=== Model ready ==="
      '

  miner:
    build: .
    image: razum/miner:latest
    container_name: razum-miner
    restart: unless-stopped
    depends_on:
      ollama:
        condition: service_healthy
    volumes:
      - miner_data:/root/.razum
    env_file: .env
    environment:
      OLLAMA_URL: http://ollama:11434

volumes:
  ollama_data:
    name: razum-ollama-data
  miner_data:
    name: razum-miner-data
COMPOSE
fi
echo -e "${GREEN}✓${NC} docker-compose.yml"

# --- Запуск ---
echo ""
echo -e "${BOLD}Запускаю Razum Miner...${NC}"
echo ""

docker compose up -d --build

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║        Razum Miner запущен!          ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  ${CYAN}Кошелёк:${NC}  $WALLET"
echo -e "  ${CYAN}Модель:${NC}   $MODEL"
echo -e "  ${CYAN}Имя:${NC}      $MINER_NAME"
echo -e "  ${CYAN}GPU:${NC}      ${GPU_NAME:-CPU}"
echo ""
echo -e "  ${BOLD}Полезные команды:${NC}"
echo "    docker compose logs -f miner    # логи майнера"
echo "    docker compose logs -f ollama   # логи Ollama"
echo "    docker compose ps               # статус"
echo "    docker compose down             # остановить"
echo "    docker compose up -d            # запустить"
echo ""
echo -e "  ${CYAN}Дашборд:${NC} https://airazum.com/miner"
echo ""
