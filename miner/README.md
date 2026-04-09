# Razum Miner — Зарабатывайте на своей видеокарте

## Что это?

Razum Miner подключает вашу видеокарту к сети Razum AI.
Ваш GPU выполняет AI-задачи от пользователей, а вы получаете токены RZM.

## Требования

- **GPU**: NVIDIA с 8+ ГБ VRAM (RTX 3060 и выше)
- **RAM**: 16 ГБ+
- **Docker**: установлен с поддержкой NVIDIA GPU
- **Интернет**: стабильное подключение

## Быстрый старт (2 минуты)

### 1. Установите Docker + NVIDIA Container Toolkit

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# NVIDIA Container Toolkit (для GPU в Docker)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 2. Создайте `.env` файл

```bash
mkdir razum-miner && cd razum-miner

cat > .env << 'EOF'
# Обязательно — ваш ETH-кошелёк для получения RZM
WALLET_ADDRESS=0xВАШ_КОШЕЛЁК

# Имя ноды (будет видно в сети)
NODE_NAME=my-razum-node

# Какие модели обслуживать (через запятую)
MODELS=deepseek-r1:14b

# Макс. параллельных задач (зависит от VRAM)
MAX_CONCURRENT_TASKS=3
EOF
```

### 3. Запустите одной командой

```bash
docker run -d \
  --name razum-miner \
  --gpus all \
  --restart unless-stopped \
  --env-file .env \
  -p 8080:8080 \
  therazum/miner:latest
```

Или через docker-compose:
```bash
curl -O https://raw.githubusercontent.com/the-razum/razum/main/miner/docker-compose.yml
docker compose up -d
```

### 4. Проверьте статус

```bash
# Логи
docker logs -f razum-miner

# Статистика
curl http://localhost:8080/health
```

Вы увидите:
```
  ██████╗  █████╗ ███████╗██╗   ██╗███╗   ███╗
  ██╔══██╗██╔══██╗╚══███╔╝██║   ██║████╗ ████║
  ██████╔╝███████║  ███╔╝ ██║   ██║██╔████╔██║
  ██╔══██╗██╔══██║ ███╔╝  ██║   ██║██║╚██╔╝██║
  ██║  ██║██║  ██║███████╗╚██████╔╝██║ ╚═╝ ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝

[Razum] GPU detected: NVIDIA RTX 4070 (12 GB VRAM)
[Razum] Registered! Miner ID: abc123
[Razum] Polling for tasks every 5s...
[Razum] Waiting for tasks...
[Razum] Task received: task_001 (model: deepseek-r1:14b)
[Razum] Task task_001 completed in 2.3s. Reward: 0.15 RZM (total: 0.15)
```

## Сколько можно заработать?

| GPU | Задач/час | RZM/день | ~USD/день* |
|-----|-----------|----------|------------|
| RTX 3060 | 30-50 | 50-80 | $2-4 |
| RTX 3080 | 60-90 | 100-150 | $5-8 |
| RTX 4070 | 80-120 | 130-200 | $7-10 |
| RTX 4090 | 150-200 | 250-350 | $12-18 |
| A100 | 300+ | 500+ | $25+ |

*Оценочные данные, зависят от загрузки сети и цены токена.

## Все параметры

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `WALLET_ADDRESS` | (обязательно) | ETH-кошелёк для получения RZM |
| `NODE_NAME` | razum-node-xxxxx | Имя ноды в сети |
| `MODELS` | deepseek-r1:14b | Модели через запятую |
| `MAX_CONCURRENT_TASKS` | 3 | Макс. параллельных задач |
| `COORDINATOR_URL` | https://airazum.com | URL координатора сети |
| `POLL_INTERVAL` | 5000 | Интервал опроса задач (мс) |
| `MIN_REWARD` | 0.05 | Мин. награда за задачу |

## Рекомендации по моделям

| VRAM | Рекомендуемые модели |
|------|---------------------|
| 8 ГБ | `mistral:7b`, `llama3:8b` |
| 12 ГБ | `deepseek-r1:14b`, `mistral:7b` |
| 16 ГБ | `deepseek-r1:14b`, `llama3:8b`, `codellama:13b` |
| 24 ГБ+ | `deepseek-r1:32b`, `llama3:70b-q4` |

## Обновление

```bash
docker pull therazum/miner:latest
docker compose down && docker compose up -d
```

## Устранение неполадок

**GPU не обнаружена:**
```bash
nvidia-smi  # Должна показать карту
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi  # Тест в Docker
```

**Нет задач:**
Мало пользователей или все задачи уже разобраны. Нода автоматически продолжит ожидание.

**Ошибка регистрации:**
Проверьте интернет и доступность `https://airazum.com/api/health`

## Поддержка

- Telegram: [@razum_miners](https://t.me/razum_miners)
- GitHub: [github.com/the-razum/razum/issues](https://github.com/the-razum/razum/issues)
- Email: support@airazum.com
