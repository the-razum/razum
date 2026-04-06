# Razum AI — Текущий статус (5 апреля 2026)

## Что СДЕЛАНО

| Шаг | Статус | Детали |
|-----|--------|--------|
| Клонирование gonka | ГОТОВО | fork/gonka/ |
| Клонирование gonka-openai | ГОТОВО | fork/razum-openai/ |
| Ребрендинг gonka → razum | ГОТОВО | ~400 замен в файлах, 19 файлов переименовано |
| Ребрендинг gonka-openai → razum-openai | ГОТОВО | ~67 замен, 12 файлов переименовано |
| Установка Go | ГОТОВО | go1.26.1 darwin/arm64 |
| Сборка inference-chain | ГОТОВО | `go build ./...` → exit 0 |
| GitHub: the-razum/cosmos-sdk | ГОТОВО | Форк gonka-ai/cosmos-sdk |
| GitHub: the-razum/razum | СОЗДАН | Код запушен ЧАСТИЧНО |
| GitHub: the-razum/razum-openai | ГОТОВО | Полностью запушен |

## Что НЕ ДОПУШЕНО на GitHub (the-razum/razum)

### 1. Крупные файлы (HTTP 408 timeout)
Файлы >700KB не влезли в пуш:
- `pulsar.go` — сгенерированный код
- `*.ipynb` — Jupyter notebooks
- `genesis.json` — генезис-блок
- `poetry.lock` — Python зависимости

**Как починить:** запушить через Git LFS или загрузить через GitHub Web UI.

### 2. Workflow файлы (.github/workflows/*.yml)
11 файлов не запушены — нужен GitHub токен с `workflow` scope.

**Как починить:**
1. GitHub → Settings → Developer Settings → Personal Access Tokens
2. Создать/обновить токен, добавить scope `workflow`
3. `git push origin main`

## Открытые проблемы

### ISSUE-004: go.mod module paths не переименованы
```
inference-chain/go.mod:  module github.com/productscience/inference  ← НЕ RAZUM
decentralized-api/go.mod: module decentralized-api
proxy-ssl/go.mod:         module github.com/razum/proxy-ssl
subnet/go.mod:            module subnet
```
Это НЕ блокер для сборки (всё компилируется), но нужно исправить для чистоты.

### gonka-fresh — лишняя папка
`fork/gonka-fresh/` — старый клон, можно удалить.

---

## СЛЕДУЮЩИЕ ШАГИ (по порядку)

### Сейчас (на твоём компе, 30 мин):

1. **Допушить крупные файлы** на the-razum/razum:
   ```bash
   cd ~/Razum/fork/gonka

   # Добавить крупные файлы по одному
   git add genesis/genesis.json
   git commit -m "Add genesis.json"
   git push origin main

   # Или через LFS
   git lfs install
   git lfs track "*.ipynb" "*.lock"
   git add .gitattributes
   git commit -m "Add LFS tracking"
   git push origin main
   ```

2. **Допушить workflow файлы** (нужен новый токен):
   ```bash
   # Создай токен с workflow scope на GitHub
   # Settings → Developer Settings → Personal Access Tokens → Fine-grained
   # Repository permissions: Contents (Read/Write) + Actions (Read/Write)

   git push origin main
   ```

3. **Удалить лишнее:**
   ```bash
   rm -rf ~/Razum/fork/gonka-fresh
   ```

### Эта неделя (запуск тестнета):

4. **Арендовать VPS** (Hetzner, ~$20/мес):
   - 4 CPU, 8 ГБ RAM, 100 ГБ SSD
   - Ubuntu 22.04
   - Установить Docker + Docker Compose

5. **Деплой Chain + API Node** на VPS:
   ```bash
   ssh root@YOUR_VPS
   git clone https://github.com/the-razum/razum.git
   cd razum
   # Собрать и запустить
   docker compose up -d
   ```

6. **Арендовать GPU-сервер** (Vast.ai, ~$60/мес):
   - RTX 3060+ с 12 ГБ VRAM
   - Подключить ML Node к Chain Node

### После стабилизации:

7. Открыть тестнет для публики
8. Написать доку для нод-операторов
9. Запустить Block Explorer
