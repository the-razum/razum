# Razum Miner — Зарабатывайте на своей видеокарте

## Что это?

Razum Miner — программа, которая подключает вашу видеокарту к сети Razum AI.
Ваш GPU выполняет AI-задачи от пользователей, а вы получаете токены RZM.

## Требования

- **GPU**: NVIDIA с 8+ ГБ VRAM (RTX 3060 и выше)
- **RAM**: 16 ГБ+
- **ОС**: Linux, macOS, Windows
- **Docker**: установлен и запущен
- **Интернет**: стабильное подключение

## Быстрый старт

### 1. Установите Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Запустите ноду
```bash
docker run -d \
  --name razum-miner \
  --gpus all \
  -e WALLET_ADDRESS=ваш_eth_кошелёк \
  -e NODE_NAME=моя-нода \
  -p 8080:8080 \
  therazum/miner:latest
```

### 3. Проверьте статус
```bash
docker logs razum-miner
```

Вы увидите:
```
[Razum Miner] GPU: NVIDIA RTX 4070 (12GB)
[Razum Miner] Models loaded: deepseek-r1:14b, mistral:7b
[Razum Miner] Connected to network. Waiting for tasks...
[Razum Miner] Task received: chat_completion (user_abc123)
[Razum Miner] Task completed in 2.3s. Reward: 0.15 RZM
```

## Сколько можно заработать?

| GPU | Задач/час | RZM/день | ~USD/день* |
|-----|-----------|----------|------------|
| RTX 3060 | 30-50 | 50-80 RZM | $2-4 |
| RTX 3080 | 60-90 | 100-150 RZM | $5-8 |
| RTX 4070 | 80-120 | 130-200 RZM | $7-10 |
| RTX 4090 | 150-200 | 250-350 RZM | $12-18 |
| A100 | 300+ | 500+ RZM | $25+ |

*Оценочные данные, зависят от загрузки сети и цены токена.

## Конфигурация

Файл `.env` рядом с docker-compose:

```env
# Обязательно
WALLET_ADDRESS=0x...ваш_кошелёк
NODE_NAME=my-razum-node

# Опционально
MAX_CONCURRENT_TASKS=3        # Сколько задач одновременно
MODELS=deepseek-r1:14b,mistral:7b  # Какие модели обслуживать
MIN_REWARD=0.05                # Минимальная награда за задачу
STAKING_AMOUNT=1000            # Стейк для повышения репутации
```

## Репутация и стейкинг

Чем выше ваша репутация — тем больше задач вы получаете:

- **Новая нода**: базовый приоритет
- **100+ задач без ошибок**: средний приоритет (+20% задач)
- **1000+ задач + стейк 1000 RZM**: высокий приоритет (+50% задач)
- **10000+ задач + стейк 10000 RZM**: элитный (+100% задач)

Стейкинг защищает сеть: если нода жульничает (неверные ответы), стейк сгорает (слэшинг).

## Поддержка

- Telegram: @razum_miners
- GitHub Issues: github.com/the-razum/razum/issues
- Email: miners@airazum.com
