# Issues: Razum AI Build

Дата: 2026-04-05

## ISSUE-001: Go не установлен — сборка невозможна

**Severity:** BLOCKER
**Статус:** ЗАКРЫТ (2026-04-05 — установлен go1.26.1 via `brew install go`)

### Описание
На macOS (Darwin 25.3.0) компилятор Go не найден ни в одном стандартном расположении:
- `/usr/local/go/bin/go` — нет
- `/opt/homebrew/bin/go` — нет
- `$HOME/go/bin/go` — нет

Команда `go build ./...` не может быть выполнена.

### Решение
```bash
# Установить Go через Homebrew
brew install go

# Или скачать с https://go.dev/dl/
# Требуется Go 1.21+
```

---

## ISSUE-002: Структура репо отличается от ожидаемой

**Severity:** INFO
**Статус:** Решён вручную

### Описание
Скрипт `rebrand.sh` ожидал `go.mod` или `docker-compose.yml` в корне `gonka/`,
но проект имеет монорепо-структуру: отдельные Go-модули в поддиректориях:

```
gonka/
  inference-chain/go.mod      # github.com/productscience/inference
  decentralized-api/go.mod    # ?
  subnet/go.mod               # ?
  proxy-ssl/go.mod            # ?
  test-net-cloud/razum-client-testing/go.mod
```

Нет единого `go.mod` в корне. Ребрендинг выполнен через Python-скрипт.

---

## ISSUE-003: Замена gnk → rzm может затронуть сторонние идентификаторы

**Severity:** LOW
**Статус:** Требует проверки

### Описание
Паттерн `gnk` является частью названий некоторых сторонних пакетов Cosmos SDK.
Замена выполнялась только в Go/YAML/JSON/MD файлах, исключая `*.pb.go` и `vendor/`.
Рекомендуется проверить `go build` на ошибки с импортами.

---

## ISSUE-004: go.mod модуль не переименован в the-razum/razum

**Severity:** MEDIUM
**Статус:** Открыт

### Описание
Основной модуль `inference-chain/go.mod` имеет:
```
module github.com/productscience/inference
```
Это сторонний путь (не gonka-ai), который не был изменён при ребрендинге.
Остальные `go.mod` используют `the-razum/razum` после замен — нужна проверка.

### Решение
```bash
# Проверить все go.mod
grep -r "^module" fork/gonka/*/go.mod
# После установки Go:
cd fork/gonka/inference-chain && go mod tidy
```

---

## ISSUE-005: gonka-fresh — лишняя папка

**Severity:** INFO
**Статус:** На рассмотрении

### Описание
В `fork/` присутствует папка `gonka-fresh` (предположительно старый клон).
Ребрендинг к ней не применялся. Рекомендуется удалить или применить те же замены.

---

## ISSUE-006: Приватный репозиторий github.com/the-razum/cosmos-sdk недоступен

**Severity:** BLOCKER
**Статус:** Открыт (2026-04-05)

### Описание
`go.mod` содержит replace-директивы на приватный GitHub-форк:
```
replace (
    cosmossdk.io/store           => github.com/the-razum/cosmos-sdk/store v1.1.2-ps1
    github.com/cosmos/cosmos-sdk => github.com/the-razum/cosmos-sdk v0.53.3-ps17
)
```
Репо `github.com/the-razum/cosmos-sdk` приватное. SSH-ключи не добавлены в GitHub.
`go mod tidy` и `go build ./...` падают с ошибкой аутентификации.

### Решение
Добавить в `~/.netrc`:
```
machine github.com
  login <github_username>
  password <personal_access_token>
```
Или добавить SSH-ключ `~/.ssh/id_ed25519.pub` в GitHub-аккаунт the-razum.

---

## Следующие шаги для успешной сборки

1. ~~Установить Go 1.21+~~ ГОТОВО (go1.26.1 установлен)
2. Получить доступ к `github.com/the-razum/cosmos-sdk` (BLOCKER — ISSUE-006)
3. Запустить `go mod tidy` в `inference-chain/`
4. Собрать: `go build ./...`
5. Проверить остальные подмодули: `decentralized-api/`, `subnet/`, `proxy-ssl/`
