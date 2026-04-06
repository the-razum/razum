# Как форкнуть Gonka → Razum

## Требования

- Git
- Go 1.21+ (https://go.dev/dl/)
- Docker + Docker Compose
- Make
- Linux или macOS (WSL2 на Windows тоже подойдёт)

## Шаг 1: Клонировать репозитории

```bash
cd ~/Razum/fork

# Основной блокчейн
git clone https://github.com/gonka-ai/gonka.git

# OpenAI-совместимый SDK
git clone https://github.com/gonka-ai/gonka-openai.git

# Форк Cosmos SDK (опционально — подтянется автоматически через go.mod)
# git clone https://github.com/gonka-ai/cosmos-sdk.git
```

## Шаг 2: Ребрендинг

```bash
cd gonka
bash ../rebrand.sh
```

Скрипт автоматически заменит:
- `Gonka` → `Razum`
- `gonka` → `razum`
- `GNK` → `RZM`
- `gnk` → `rzm`
- `gonka-ai` → `the-razum`
- `gonkad` → `razumd`
- `ugnk` → `urzm` (минимальная единица токена)
- `gonka.ai` → `razum.network`

Лог всех изменений будет в `fork/REBRAND_LOG.md`.

## Шаг 3: Проверить компиляцию

```bash
# Обновить зависимости
go mod tidy

# Собрать
go build ./...

# Или через Make (если есть Makefile)
make build
```

Если ошибки — скорее всего нужно:
1. Обновить пути в `go.mod` (github.com/the-razum/razum)
2. Пересоздать протобуф-файлы: `make proto-gen`
3. Проверить что cosmos-sdk форк тоже обновлён

## Шаг 4: Запустить тестнет

```bash
# Инициализировать ноду
./razumd init test-node --chain-id razum-testnet-1

# Создать генезис-аккаунт
./razumd keys add validator

# Добавить в генезис
./razumd genesis add-genesis-account validator 1000000000urzm

# Создать генезис-транзакцию
./razumd genesis gentx validator 100000000urzm --chain-id razum-testnet-1

# Собрать генезис
./razumd genesis collect-gentxs

# Запустить
./razumd start
```

## Шаг 5: Ребрендинг gonka-openai

```bash
cd ../gonka-openai

# Замены в файлах
find . -type f -not -path './.git/*' -exec sed -i \
  -e 's/gonka-ai\/gonka-openai/the-razum\/razum-openai/g' \
  -e 's/gonka_openai/razum_openai/g' \
  -e 's/GonkaOpenAI/RazumOpenAI/g' \
  -e 's/gonka-openai/razum-openai/g' \
  -e 's/Gonka/Razum/g' \
  -e 's/gonka/razum/g' {} \;

# Переименовать папку
cd ..
mv gonka-openai razum-openai
```

## Шаг 6: Запушить на свой GitHub

```bash
# Создай репо the-razum/razum на GitHub

cd fork/gonka  # (уже переименован внутри)
git remote set-url origin https://github.com/the-razum/razum.git
git add -A
git commit -m "Rebrand: Gonka → Razum AI"
git push origin main
```

---

## Возможные проблемы

| Проблема | Решение |
|----------|---------|
| `go mod tidy` ошибки | Нужно опубликовать форк cosmos-sdk на the-razum/cosmos-sdk |
| Protobuf ошибки | `make proto-gen` после замен |
| Docker не стартует | Проверь имена сервисов в docker-compose.yml |
| Chain ID конфликт | Используй уникальный: `razum-testnet-1` |
| Cosmos SDK несовместимость | Используй точную версию: v0.53.3-ps15 |

## Что дальше

После успешного запуска тестнета:
1. Настроить Docker Compose для продакшена
2. Подключить ML-ноду с GPU
3. Протестировать инференс через razum-openai SDK
4. Развернуть API Gateway для веб-приложения

---

*Подробный анализ кодовой базы — в файле ANALYSIS.md*
