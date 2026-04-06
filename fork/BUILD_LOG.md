# Build Log: Razum (форк Gonka)

Дата: 2026-04-05
Платформа: macOS Darwin 25.3.0 (arm64)

---

## Шаг 1: Установка Go

**Команда:** `brew install go`
**Результат:** УСПЕХ
**Версия:** go1.26.1 darwin/arm64
**Путь:** `/opt/homebrew/bin/go`

ISSUE-001 (Go не установлен) — **ЗАКРЫТ**.

---

## Шаг 2: go mod tidy

**Команда:** `cd fork/gonka/inference-chain && go mod tidy`
**Результат:** ОШИБКА — приватный репозиторий

### Ошибка:
```
cosmossdk.io/store@v1.1.2: reading github.com/the-razum/cosmos-sdk/store/go.mod
at revision store/v1.1.2-ps1:
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

**Причина:** `go.mod` содержит replace-директиву на приватный форк:
```
replace (
    cosmossdk.io/store           => github.com/the-razum/cosmos-sdk/store v1.1.2-ps1
    github.com/cosmos/cosmos-sdk => github.com/the-razum/cosmos-sdk v0.53.3-ps17
)
```

Репозиторий `github.com/the-razum/cosmos-sdk` — **приватный** (HTTP 404 без аутентификации).
SSH-ключи на машине не добавлены в GitHub-аккаунт с доступом к `the-razum`.

---

## Шаг 3: go build ./...

**Команда:** `go build ./...`
**Результат:** ОШИБКА — та же причина (зависимость от приватного репо)

```
app/ante.go:12:2: reading github.com/the-razum/cosmos-sdk/store/go.mod
at revision store/v1.1.2-ps1: [...] fatal: could not read Username
```

---

## Шаг 3 (повторный): Фикс replace-директив — the-razum → gonka-ai

**Дата:** 2026-04-05

**Проблема:** `github.com/the-razum/cosmos-sdk` не существует на GitHub (организация не создана).

**Решение:** Заменить в replace-директивах `the-razum` → `gonka-ai` (оригинальный форк), так как gonka-ai является публичным.

### Изменённые файлы:

**`inference-chain/go.mod`** (строки 6–7):
```diff
- cosmossdk.io/store => github.com/the-razum/cosmos-sdk/store v1.1.2-ps1
- github.com/cosmos/cosmos-sdk => github.com/the-razum/cosmos-sdk v0.53.3-ps17
+ cosmossdk.io/store => github.com/gonka-ai/cosmos-sdk/store v1.1.2-ps1
+ github.com/cosmos/cosmos-sdk => github.com/gonka-ai/cosmos-sdk v0.53.3-ps17
```

**`decentralized-api/go.mod`** (строка 307):
```diff
- github.com/cosmos/cosmos-sdk => github.com/the-razum/cosmos-sdk v0.53.3-ps15
+ github.com/cosmos/cosmos-sdk => github.com/gonka-ai/cosmos-sdk v0.53.3-ps15
```

---

## Шаг 4: go mod tidy (после фикса)

**Команда:** `cd fork/gonka/inference-chain && go mod tidy`
**Результат:** УСПЕХ

---

## Шаг 5: go build ./...

**Команда:** `go build ./...`
**Результат:** ОШИБКА — несовместимость bytedance/sonic с Go 1.26

```
# github.com/bytedance/sonic/internal/rt
stubs.go:33:22: undefined: GoMapIterator
stubs.go:36:54: undefined: GoMapIterator
```

**Причина:** `github.com/bytedance/sonic v1.14.0` использует внутренний тип `GoMapIterator`, удалённый в Go 1.24+.

**Фикс:** `go get github.com/bytedance/sonic@v1.15.0`
- sonic v1.14.0 → v1.15.0
- sonic/loader v0.3.0 → v0.5.0

---

## Шаг 6: go build ./... (после апгрейда sonic)

**Команда:** `go build ./...`
**Результат:** УСПЕХ ✓

---

## Итог

| Шаг | Статус | Примечание |
|-----|--------|------------|
| brew install go | УСПЕХ | go1.26.1 |
| Фикс replace the-razum → gonka-ai | УСПЕХ | inference-chain + decentralized-api |
| go mod tidy | УСПЕХ | — |
| Апгрейд bytedance/sonic 1.14 → 1.15 | УСПЕХ | несовместимость с Go 1.24+ |
| go build ./... | УСПЕХ | inference-chain собирается |

---

## 2026-04-05: Миграция gonka-ai → the-razum

### GitHub-операции

| Действие | Результат | Ссылка |
|----------|-----------|--------|
| `gh repo fork gonka-ai/cosmos-sdk --org the-razum` | УСПЕХ | https://github.com/the-razum/cosmos-sdk |
| `gh repo create the-razum/razum --public` | УСПЕХ | https://github.com/the-razum/razum |

### Изменения в go.mod

**`inference-chain/go.mod`** (replace-директивы):
```diff
- cosmossdk.io/store => github.com/gonka-ai/cosmos-sdk/store v1.1.2-ps1
- github.com/cosmos/cosmos-sdk => github.com/gonka-ai/cosmos-sdk v0.53.3-ps17
+ cosmossdk.io/store => github.com/the-razum/cosmos-sdk/store v1.1.2-ps1
+ github.com/cosmos/cosmos-sdk => github.com/the-razum/cosmos-sdk v0.53.3-ps17
```

**`decentralized-api/go.mod`** (replace-директивы):
```diff
- github.com/cosmos/cosmos-sdk => github.com/gonka-ai/cosmos-sdk v0.53.3-ps15
+ github.com/cosmos/cosmos-sdk => github.com/the-razum/cosmos-sdk v0.53.3-ps15
```

**`razum-openai/go/go.mod`** (module path):
```diff
- module github.com/the-razum/razum-openai/go
+ module github.com/the-razum/razum-openai/go
```

### Сборка inference-chain

```
export PATH="/opt/homebrew/bin:$PATH"
export GOPRIVATE="github.com/the-razum/*"
cd fork/gonka/inference-chain
go mod tidy  → УСПЕХ (скачаны the-razum/cosmos-sdk, the-razum/cosmos-sdk/store)
go build ./... → УСПЕХ (exit 0)
```

---

## 2026-04-05: Пуш кода и финальный ребрендинг

### GitHub-операции

| Действие | Результат | Ссылка |
|----------|-----------|--------|
| `gh repo create the-razum/razum-openai --public` | УСПЕХ | https://github.com/the-razum/razum-openai |
| `git push the-razum/razum-openai main` | УСПЕХ | commit: "Rebrand: Gonka OpenAI → Razum OpenAI SDK" |
| `git push the-razum/razum main` | УСПЕХ (частичный) | Код запушен, workflow файлы пропущены (нет `workflow` scope) |

### Замена razum-ai → the-razum

Найдено и обновлено 49 файлов:
- `.go`, `.mod`, `.md`, `.yaml`, `.yml`, `.json`, `.toml`, `.sh`
- Охвачены: `fork/gonka/`, `fork/razum-openai/`, корневые docs/, marketing/

### Исключение бинарников из git

Cosmovisor pre-built binaries (>60MB каждый) добавлены в `.gitignore`:
```
# Cosmovisor pre-built binaries (download separately)
*/cosmovisor
```
Файлы убраны из git tracking: 8 бинарников (~300MB суммарно)

### Пересборка после замен

```
cd fork/gonka/inference-chain
go mod tidy  → УСПЕХ
go build ./... → УСПЕХ (exit 0)
```

### Итог пуша the-razum/razum

GitHub коммиты:
- `17c028fb` chore: init repo (создан через API)
- `6d1355a6` Razum AI blockchain — source code (~2200 файлов, малые файлы <200KB)
- `585a63cc` Merge init
- `ed1448e3` chore: skip workflow files

**Что НЕ запушено:**
- `.github/workflows/*.yml` — нужен токен с `workflow` scope
- Крупные файлы (>700KB): pulsar.go, notebooks, genesis.json, poetry.lock — GitHub HTTP 408 timeout при пуше (~15MB дельта)

**Как добавить позже:**
1. GitHub Settings → Developer Settings → Personal Access Tokens → добавь `workflow` scope
2. `cd /tmp/razum-small && git push origin main` (для workflow файлов нужен новый токен)
3. Или загрузи крупные файлы через GitHub Web UI
