# Gonka AI — Полный анализ кодовой базы

## Репозитории

### 1. gonka-ai/gonka (основной блокчейн)
- **URL:** https://github.com/gonka-ai/gonka
- **Язык:** Go
- **Фреймворк:** Cosmos SDK v0.53.3 (кастомный форк gonka-ai/cosmos-sdk)
- **Лицензия:** есть (LICENSE.md)
- **Статус:** активная разработка, есть релизы

### 2. gonka-ai/gonka-openai (OpenAI-совместимый клиент)
- **URL:** https://github.com/gonka-ai/gonka-openai
- **Языки:** TypeScript, Python, Go (Rust и Java — скоро)
- **Назначение:** drop-in замена OpenAI SDK, маршрутизирующая запросы через сеть Gonka

### 3. gonka-ai/cosmos-sdk (форк Cosmos SDK)
- **URL:** https://github.com/gonka-ai/cosmos-sdk
- **Версия:** v0.53.3-ps15
- **Назначение:** кастомный Cosmos SDK с модификациями для Gonka

---

## Архитектура системы

Gonka состоит из 3 типов нод, каждая работает в Docker-контейнере:

### Chain Node (блокчейн)
- Подключается к сети, поддерживает консенсус
- Cosmos SDK + CometBFT (Tendermint)
- Хранит состояние блокчейна
- Управляет стейкингом, governance, токенами

### API Node (координация)
- REST/gRPC эндпоинты
- Принимает запросы от пользователей и разработчиков
- Оркестрация задач: маршрутизация, планирование, верификация
- Связывает блокчейн с ML-нодами

### ML Node (вычисления)
- Выполняет AI-задачи: инференс, обучение
- Работает на GPU (NVIDIA, минимум 8 ГБ VRAM)
- Proof of Work 2.0 / Proof of Compute
- Поддержка LLM (vLLM), генерации изображений

---

## Ключевые модули блокчейна (x/)

На основе анализа документации и кода, Gonka использует стандартные модули Cosmos SDK плюс кастомные:

### Стандартные модули Cosmos SDK:
- `x/auth` — аутентификация аккаунтов
- `x/bank` — токены и переводы
- `x/staking` — стейкинг и валидаторы
- `x/slashing` — наказание за даунтайм
- `x/gov` — governance / голосование
- `x/distribution` — распределение наград
- `x/upgrade` — обновления сети через Cosmovisor
- `x/mint` — эмиссия токенов

### Кастомные модули Gonka:
- **Collateral** — система залогов для нод
  - Гибридная модель: base weight (20%) + collateral-eligible weight (80%)
  - Слэшинг за: невалидные результаты, даунтайм, consensus faults
  - Интеграция с модулем стейкинга через hooks
- **Compute / Proof of Compute** — верификация AI-вычислений
  - Proof of Work 2.0: 100% ресурсов на полезную работу (не на хеши)
  - Weight = накопленный вклад ноды (nonces, задачи)
  - Влияет на governance и расчёт цены compute
- **Rewards** — распределение наград за эпоху
  - 323,000 GNK за эпоху (начальная эмиссия)
  - Экспоненциальный decay, халвинг каждые ~4 года

---

## Токеномика GNK

| Параметр | Значение |
|----------|---------|
| Тикер | GNK |
| Общее предложение | 1,000,000,000 |
| Награды хостам | 800M (80%) |
| — Core rewards | 680M (68%) |
| — Community Pool | 120M (12%) |
| Founders | 200M (20%) |
| Эмиссия/эпоха | 323,000 GNK (decay) |
| Халвинг | ~каждые 4 года |
| Burn | слэшинг → сожжение |

---

## Docker Compose

Запуск одной машины (Network + ML Node):
```bash
source config.env && docker compose -f docker-compose.yml -f docker-compose.mlnode.yml up -d
```

Файлы:
- `docker-compose.yml` — Chain Node + API Node
- `docker-compose.mlnode.yml` — ML Node (GPU)
- `config.env` — переменные окружения

Опционально SSL:
```bash
docker compose --profile ssl up -d
```
Запускает: nginx proxy + ACME issuer

---

## Тестирование

- **Testermint** — интеграционное тестирование
  - Работает на живых API и Chain нодах
  - Эмулирует ML-ноды через WireMock
  - Запускает локальный кластер через Docker
  - Папка: `testermint/`

---

## gonka-openai (SDK для разработчиков)

Drop-in замена OpenAI SDK. Вместо запросов на api.openai.com — маршрутизация через Gonka.

### Фичи:
- Автоматическая подпись запросов (ECDSA)
- Генерация Gonka-адреса из приватного ключа
- Динамический выбор эндпоинта
- Полная совместимость с оригинальным OpenAI API

### Поддерживаемые языки:
- **Go** (`gonka-openai/go`) — v0.2.6
- **Python** (`gonka-openai/python`)
- **TypeScript** (`gonka-openai/typescript`)
- Rust, Java — в разработке

### Пример использования (концептуально):
```python
# Вместо:
from openai import OpenAI
client = OpenAI(api_key="...")

# Используется:
from gonka_openai import GonkaOpenAI
client = GonkaOpenAI(private_key="...")
# Остальной код идентичен
```

---

## Зависимости для запуска

### Для Chain + API ноды:
- Docker + Docker Compose
- Linux (Ubuntu рекомендуется)
- Cosmovisor (для апгрейдов)
- Go 1.21+ (для сборки из исходников)

### Для ML ноды:
- NVIDIA GPU с 8+ ГБ VRAM (RTX 3060+)
- NVIDIA Docker runtime
- CUDA drivers
- Docker + Docker Compose

### Для разработки:
- Go 1.21+
- Make
- Protocol Buffers (protoc)
- Docker

---

## Что нужно изменить для Razum

### Ребрендинг (простые замены):
1. `Gonka` → `Razum` (во всех файлах)
2. `gonka` → `razum` (пакеты, пути, конфиги)
3. `GNK` → `RZM` (тикер токена)
4. `gnk` → `rzm` (строчные)
5. `gonka-ai` → `the-razum` (GitHub org)
6. Domain: `gonka.ai` → `razum.ai` / `razum.network`

### Файлы конфигурации (ключевые):
- `config.env` — переменные окружения
- `docker-compose.yml` — имена сервисов
- `docker-compose.mlnode.yml` — ML-нода
- `go.mod` — модуль Go (github.com/gonka-ai/gonka → github.com/the-razum/razum)
- `app.go` — инициализация блокчейна
- `genesis.json` — генезис-блок (denom: ugnk → urzm)
- `Makefile` — команды сборки

### Кастомные фичи Razum (добавить поверх Gonka):
1. **Stripe Integration** — новый модуль для подписок
2. **Subscription Tiers** — Free/Basic/Pro/Enterprise
3. **Chat API Gateway** — OpenAI-совместимый endpoint с авторизацией
4. **Geographic Routing** — выбор ближайшей ноды по геолокации
5. **Semantic Caching** — кэширование похожих запросов
6. **Mobile API** — эндпоинты для мобильных приложений

---

## Оценка сложности

| Задача | Сложность | Кто делает |
|--------|-----------|-----------|
| Ребрендинг (замены строк) | Низкая | Claude / скрипт |
| Запуск тестнета | Средняя | Нужен сервер с GPU |
| Stripe интеграция | Средняя | Web-разработчик |
| Чат-интерфейс | Средняя | Frontend + API |
| Мобильное приложение | Высокая | React Native dev |
| Geographic routing | Высокая | Backend + инфра |
| Semantic caching | Высокая | ML-инженер |
| Модификация консенсуса | Очень высокая | Blockchain dev |

---

*Анализ выполнен 5 апреля 2026. Основан на публичной документации, GitHub и web search.*

Источники:
- [gonka-ai/gonka](https://github.com/gonka-ai/gonka)
- [gonka-ai/gonka-openai](https://github.com/gonka-ai/gonka-openai)
- [Gonka Tokenomics](https://github.com/gonka-ai/gonka/blob/main/docs/tokenomics.md)
- [Gonka Quickstart](https://gonka.ai/host/quickstart/)
- [Gonka Developer Quickstart](https://gonka.ai/developer/quickstart/)
