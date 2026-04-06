#!/bin/bash
# ============================================================
# Razum AI — Установка ноды майнера
# curl -fsSL https://razum.ai/install.sh | bash
# ============================================================

set -e

VERSION="0.1.0"
RAZUM_DIR="$HOME/.razum"
BIN_DIR="$RAZUM_DIR/bin"
MODELS_DIR="$RAZUM_DIR/models"
CONFIG_FILE="$RAZUM_DIR/config.yaml"

# Цвета
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════╗"
    echo "  ║           🧠 RAZUM AI NODE               ║"
    echo "  ║     Разум, который принадлежит тебе.     ║"
    echo "  ║              v${VERSION}                      ║"
    echo "  ╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_step() {
    echo -e "${GREEN}▸${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_ok() {
    echo -e "${GREEN}✓${NC} $1"
}

# ============================================================
# Определение системы
# ============================================================
detect_system() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$ARCH" in
        x86_64)  ARCH="amd64" ;;
        aarch64) ARCH="arm64" ;;
        arm64)   ARCH="arm64" ;;
        *)       log_error "Неподдерживаемая архитектура: $ARCH"; exit 1 ;;
    esac

    case "$OS" in
        darwin) OS_NAME="macOS" ;;
        linux)  OS_NAME="Linux" ;;
        *)      log_error "Неподдерживаемая ОС: $OS"; exit 1 ;;
    esac

    log_ok "Система: ${OS_NAME} (${ARCH})"

    # Определяем GPU
    GPU_INFO="CPU only"
    if [[ "$OS" == "darwin" ]]; then
        CHIP=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "unknown")
        if [[ "$CHIP" == *"Apple"* ]]; then
            RAM_BYTES=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
            RAM_GB=$((RAM_BYTES / 1073741824))
            GPU_INFO="Apple Silicon (${RAM_GB}GB unified)"
        fi
    elif command -v nvidia-smi &>/dev/null; then
        GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | head -1)
    fi
    log_ok "GPU: ${GPU_INFO}"
}

# ============================================================
# Создание директорий
# ============================================================
setup_directories() {
    log_step "Создаю директории..."
    mkdir -p "$BIN_DIR" "$MODELS_DIR" "$RAZUM_DIR/logs" "$RAZUM_DIR/data"
    log_ok "Директории готовы: $RAZUM_DIR"
}

# ============================================================
# Установка Ollama (inference engine)
# ============================================================
install_ollama() {
    # Проверяем работающую Ollama
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        log_ok "Ollama уже запущена и работает"
        return
    fi

    if command -v ollama &>/dev/null && ollama --version &>/dev/null; then
        log_ok "Ollama уже установлена: $(ollama --version 2>/dev/null)"
        return
    fi

    # Проверяем бинарник в приложении (macOS)
    if [[ "$OS" == "darwin" && -f "/Applications/Ollama.app/Contents/Resources/ollama" ]]; then
        cp /Applications/Ollama.app/Contents/Resources/ollama /usr/local/bin/ollama 2>/dev/null || true
        if /usr/local/bin/ollama --version &>/dev/null; then
            log_ok "Ollama восстановлена из приложения"
            return
        fi
    fi

    log_step "Устанавливаю Ollama (inference engine)..."

    if [[ "$OS" == "darwin" ]]; then
        curl -fsSL https://ollama.com/install.sh | sh
    elif [[ "$OS" == "linux" ]]; then
        curl -fsSL https://ollama.com/install.sh | sh
    fi

    if command -v ollama &>/dev/null; then
        log_ok "Ollama установлена"
    else
        log_warn "Ollama установлена, но не в PATH. Проверьте /usr/local/bin/ollama"
    fi
}

# ============================================================
# Установка Razum CLI
# ============================================================
install_razum_cli() {
    log_step "Устанавливаю Razum CLI..."

    cat > "$BIN_DIR/razum" << 'RAZUM_CLI'
#!/bin/bash
# Razum AI — CLI для управления нодой майнера
# Version: 0.1.0

RAZUM_DIR="$HOME/.razum"
CONFIG_FILE="$RAZUM_DIR/config.yaml"
LOG_DIR="$RAZUM_DIR/logs"
PID_FILE="$RAZUM_DIR/razum.pid"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

# ---- Команды ----

cmd_help() {
    echo -e "${CYAN}${BOLD}Razum AI Node CLI v0.1.0${NC}"
    echo ""
    echo "Использование: razum <команда> [аргументы]"
    echo ""
    echo -e "${BOLD}Основные команды:${NC}"
    echo "  start                    Запустить ноду"
    echo "  stop                     Остановить ноду"
    echo "  status                   Статус ноды"
    echo "  logs                     Показать логи"
    echo ""
    echo -e "${BOLD}Модели:${NC}"
    echo "  models list              Список установленных моделей"
    echo "  models pull <model>      Скачать модель"
    echo "  models remove <model>    Удалить модель"
    echo "  models available         Список доступных моделей"
    echo ""
    echo -e "${BOLD}Кошелёк:${NC}"
    echo "  wallet create            Создать кошелёк"
    echo "  wallet balance           Баланс RZM"
    echo "  wallet address           Показать адрес"
    echo ""
    echo -e "${BOLD}Майнинг:${NC}"
    echo "  provider register        Зарегистрироваться как провайдер"
    echo "  provider info            Информация о ноде"
    echo "  stake <amount>           Застейкать RZM"
    echo ""
    echo -e "${BOLD}Система:${NC}"
    echo "  benchmark                Тест производительности"
    echo "  config                   Показать конфигурацию"
    echo "  update                   Обновить до последней версии"
    echo "  uninstall                Удалить Razum"
}

cmd_start() {
    echo -e "${CYAN}▸ Запускаю Razum Node...${NC}"

    # Проверяем Ollama
    if ! pgrep -f "ollama serve" > /dev/null 2>&1; then
        echo -e "  Запускаю Ollama..."
        if [[ "$(uname)" == "Darwin" ]]; then
            open /Applications/Ollama.app 2>/dev/null || ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
        else
            ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
        fi
        sleep 3
    fi

    # Проверяем что Ollama отвечает
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Ollama работает"
    else
        echo -e "  ${RED}✗${NC} Ollama не отвечает на localhost:11434"
        exit 1
    fi

    # Показываем модели
    MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//' | tr '\n' ', ' | sed 's/,$//')
    echo -e "  ${GREEN}✓${NC} Модели: ${MODELS:-нет моделей}"

    # Сохраняем PID
    echo $$ > "$PID_FILE"

    # Статус
    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Razum Node запущена!${NC}"
    echo -e "  Inference API: http://localhost:11434"
    echo -e "  Модели: $MODELS"

    # Если есть кошелёк
    if [[ -f "$RAZUM_DIR/wallet.json" ]]; then
        ADDR=$(grep -o '"address":"[^"]*"' "$RAZUM_DIR/wallet.json" | head -1 | sed 's/"address":"//;s/"//')
        echo -e "  Кошелёк: $ADDR"
    fi

    echo ""
    echo -e "  ${YELLOW}Нода готова к приёму запросов из сети Razum${NC}"
}

cmd_stop() {
    echo -e "${CYAN}▸ Останавливаю Razum Node...${NC}"
    if [[ -f "$PID_FILE" ]]; then
        kill $(cat "$PID_FILE") 2>/dev/null
        rm -f "$PID_FILE"
    fi
    pkill -f "ollama serve" 2>/dev/null
    echo -e "${GREEN}✓${NC} Нода остановлена"
}

cmd_status() {
    echo -e "${CYAN}${BOLD}Razum Node — Статус${NC}"
    echo ""

    # Ollama
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "  Ollama:     ${GREEN}●${NC} работает"
        MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//')
        echo -e "  Модели:     $MODELS"
    else
        echo -e "  Ollama:     ${RED}●${NC} не запущена"
    fi

    # Система
    if [[ "$(uname)" == "Darwin" ]]; then
        CHIP=$(sysctl -n machdep.cpu.brand_string 2>/dev/null)
        RAM_GB=$(( $(sysctl -n hw.memsize 2>/dev/null) / 1073741824 ))
        echo -e "  Железо:     $CHIP / ${RAM_GB}GB RAM"
    fi

    # Кошелёк
    if [[ -f "$RAZUM_DIR/wallet.json" ]]; then
        ADDR=$(grep -o '"address":"[^"]*"' "$RAZUM_DIR/wallet.json" | head -1 | sed 's/"address":"//;s/"//')
        echo -e "  Кошелёк:    $ADDR"
    else
        echo -e "  Кошелёк:    ${YELLOW}не создан${NC} (razum wallet create)"
    fi

    # Блокчейн (заглушка)
    echo -e "  Блокчейн:   ${YELLOW}●${NC} тестнет (скоро)"
    echo -e "  Стейк:      ${YELLOW}—${NC}"
    echo -e "  Заработок:  ${YELLOW}—${NC}"
    echo ""
}

cmd_models() {
    case "${1:-list}" in
        list)
            echo -e "${CYAN}${BOLD}Установленные модели:${NC}"
            echo ""
            if command -v ollama &>/dev/null || [[ -f /usr/local/bin/ollama ]]; then
                OLLAMA_CMD=$(command -v ollama || echo "/usr/local/bin/ollama")
                $OLLAMA_CMD list 2>/dev/null || curl -s http://localhost:11434/api/tags | python3 -c "
import sys,json
data=json.load(sys.stdin)
for m in data.get('models',[]):
    size=m['size']/1e9
    print(f\"  {m['name']:30s} {size:.1f} GB\")
" 2>/dev/null || echo "  Ollama не запущена. Запустите: razum start"
            fi
            ;;
        pull)
            if [[ -z "$2" ]]; then
                echo "Использование: razum models pull <model>"
                echo "Пример: razum models pull mistral:7b"
                exit 1
            fi
            echo -e "${CYAN}▸ Скачиваю модель $2...${NC}"
            OLLAMA_CMD=$(command -v ollama || echo "/usr/local/bin/ollama")
            $OLLAMA_CMD pull "$2"
            echo -e "${GREEN}✓${NC} Модель $2 установлена"
            ;;
        remove)
            if [[ -z "$2" ]]; then
                echo "Использование: razum models remove <model>"
                exit 1
            fi
            echo -e "${CYAN}▸ Удаляю модель $2...${NC}"
            OLLAMA_CMD=$(command -v ollama || echo "/usr/local/bin/ollama")
            $OLLAMA_CMD rm "$2"
            echo -e "${GREEN}✓${NC} Модель $2 удалена"
            ;;
        available)
            echo -e "${CYAN}${BOLD}Рекомендуемые модели для Razum:${NC}"
            echo ""
            echo -e "  ${BOLD}Модель               Размер   GPU RAM   Качество${NC}"
            echo "  ─────────────────────────────────────────────────"
            echo "  mistral:7b           4 GB    8 GB+     ★★★☆☆"
            echo "  llama3:8b            5 GB    8 GB+     ★★★☆☆"
            echo "  llama3:70b          40 GB   48 GB+     ★★★★★"
            echo "  qwen2.5:7b           4 GB    8 GB+     ★★★☆☆"
            echo "  qwen2.5:72b         40 GB   48 GB+     ★★★★★"
            echo "  gemma2:9b            6 GB   10 GB+     ★★★★☆"
            echo "  deepseek-r1:7b       4 GB    8 GB+     ★★★★☆"
            echo ""
            echo "  Установка: razum models pull <model>"
            ;;
        *)
            echo "Использование: razum models [list|pull|remove|available]"
            ;;
    esac
}

cmd_wallet() {
    case "${1:-help}" in
        create)
            if [[ -f "$RAZUM_DIR/wallet.json" ]]; then
                echo -e "${YELLOW}⚠${NC} Кошелёк уже создан."
                ADDR=$(grep -o '"address":"[^"]*"' "$RAZUM_DIR/wallet.json" | head -1 | sed 's/"address":"//;s/"//')
                echo -e "  Адрес: $ADDR"
                return
            fi
            echo -e "${CYAN}▸ Создаю кошелёк...${NC}"
            # Генерируем простой адрес (в будущем - через Cosmos SDK)
            ADDR="razum1$(openssl rand -hex 20)"
            MNEMONIC=$(python3 -c "
import random
words=['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse',
'access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act',
'action','actor','actual','adapt','add','addict','address','adjust','admit','adult',
'advance','advice','aerobic','affair','afford','afraid','again','age','agent','agree',
'ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien',
'almost','alone','alpha','already','also','alter','always','amateur','amazing','among']
print(' '.join(random.sample(words, 24)))
" 2>/dev/null || echo "word1 word2 word3 ... (сохраните эту фразу!)")
            cat > "$RAZUM_DIR/wallet.json" << EOF
{
  "address": "$ADDR",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "network": "razum-testnet-1"
}
EOF
            echo ""
            echo -e "${GREEN}${BOLD}  ✓ Кошелёк создан!${NC}"
            echo ""
            echo -e "  Адрес: ${BOLD}$ADDR${NC}"
            echo ""
            echo -e "  ${YELLOW}${BOLD}Мнемоническая фраза (СОХРАНИТЕ!):${NC}"
            echo -e "  ${YELLOW}$MNEMONIC${NC}"
            echo ""
            echo -e "  ${RED}⚠ Никому не показывайте мнемоническую фразу!${NC}"
            echo -e "  ${RED}  Она даёт полный доступ к вашему кошельку.${NC}"
            echo ""
            ;;
        balance)
            if [[ ! -f "$RAZUM_DIR/wallet.json" ]]; then
                echo "Кошелёк не создан. Выполните: razum wallet create"
                exit 1
            fi
            ADDR=$(grep -o '"address":"[^"]*"' "$RAZUM_DIR/wallet.json" | head -1 | sed 's/"address":"//;s/"//')
            echo -e "${CYAN}${BOLD}Баланс кошелька${NC}"
            echo -e "  Адрес:   $ADDR"
            echo -e "  RZM:     ${BOLD}0.00${NC} (тестнет)"
            echo -e "  Стейк:   0.00 RZM"
            echo -e "  Награды: 0.00 RZM"
            echo ""
            echo -e "  ${YELLOW}Тестнет — токены скоро будут доступны${NC}"
            ;;
        address)
            if [[ ! -f "$RAZUM_DIR/wallet.json" ]]; then
                echo "Кошелёк не создан. Выполните: razum wallet create"
                exit 1
            fi
            grep -o '"address":"[^"]*"' "$RAZUM_DIR/wallet.json" | head -1 | sed 's/"address":"//;s/"//'
            ;;
        *)
            echo "Использование: razum wallet [create|balance|address]"
            ;;
    esac
}

cmd_provider() {
    case "${1:-info}" in
        register)
            echo -e "${CYAN}▸ Регистрация провайдера в сети Razum...${NC}"
            if [[ ! -f "$RAZUM_DIR/wallet.json" ]]; then
                echo -e "${RED}✗${NC} Сначала создайте кошелёк: razum wallet create"
                exit 1
            fi

            # Определяем GPU
            if [[ "$(uname)" == "Darwin" ]]; then
                GPU=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "unknown")
                RAM_GB=$(( $(sysctl -n hw.memsize 2>/dev/null) / 1073741824 ))
            else
                GPU=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "CPU")
                RAM_GB=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "?")
            fi

            # Модели
            MODELS=$(curl -s http://localhost:11434/api/tags 2>/dev/null | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//' | tr '\n' ',' | sed 's/,$//')

            cat > "$RAZUM_DIR/provider.json" << EOF
{
  "gpu": "$GPU",
  "ram_gb": $RAM_GB,
  "models": "$(echo $MODELS | tr ',' '\n' | sed 's/^/"/;s/$/"/' | tr '\n' ',' | sed 's/,$//')",
  "registered": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "active"
}
EOF
            echo ""
            echo -e "${GREEN}${BOLD}  ✓ Провайдер зарегистрирован!${NC}"
            echo ""
            echo -e "  GPU:      $GPU"
            echo -e "  RAM:      ${RAM_GB} GB"
            echo -e "  Модели:   ${MODELS:-нет}"
            echo ""
            echo -e "  ${YELLOW}Ожидание подключения к тестнету...${NC}"
            ;;
        info)
            if [[ -f "$RAZUM_DIR/provider.json" ]]; then
                echo -e "${CYAN}${BOLD}Информация о провайдере${NC}"
                cat "$RAZUM_DIR/provider.json" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"  GPU:          {d['gpu']}\")
print(f\"  RAM:          {d['ram_gb']} GB\")
print(f\"  Модели:       {d['models']}\")
print(f\"  Статус:       {d['status']}\")
print(f\"  Зарегистр.:   {d['registered']}\")
" 2>/dev/null
            else
                echo "Провайдер не зарегистрирован. Выполните: razum provider register"
            fi
            ;;
        *)
            echo "Использование: razum provider [register|info]"
            ;;
    esac
}

cmd_benchmark() {
    echo -e "${CYAN}${BOLD}Razum Benchmark${NC}"
    echo ""
    echo -e "  Тестирую inference..."

    # Простой бенчмарк через Ollama
    START=$(date +%s%N)
    RESULT=$(curl -s http://localhost:11434/v1/chat/completions \
        -H "Content-Type: application/json" \
        -d '{"model":"mistral:7b","messages":[{"role":"user","content":"Write a haiku about AI"}],"stream":false,"max_tokens":50}' 2>/dev/null)
    END=$(date +%s%N)

    if echo "$RESULT" | grep -q "choices"; then
        ELAPSED=$(( (END - START) / 1000000 ))
        TOKENS=$(echo "$RESULT" | grep -o '"total_tokens":[0-9]*' | sed 's/"total_tokens"://')
        echo -e "  ${GREEN}✓${NC} Ответ получен за ${ELAPSED}ms"
        echo -e "  ${GREEN}✓${NC} Токенов: ${TOKENS:-?}"
        if [[ -n "$TOKENS" && "$ELAPSED" -gt 0 ]]; then
            TPS=$(( TOKENS * 1000 / ELAPSED ))
            echo -e "  ${GREEN}✓${NC} Скорость: ~${TPS} tokens/sec"
        fi
    else
        echo -e "  ${RED}✗${NC} Ollama не отвечает. Запустите: razum start"
    fi
    echo ""
}

cmd_config() {
    echo -e "${CYAN}${BOLD}Конфигурация Razum${NC}"
    echo ""
    echo "  Директория:    $RAZUM_DIR"
    echo "  Inference URL: http://localhost:11434"
    echo "  Сеть:          razum-testnet-1"
    echo ""
    if [[ -f "$CONFIG_FILE" ]]; then
        cat "$CONFIG_FILE"
    fi
}

cmd_logs() {
    if [[ -f "$LOG_DIR/ollama.log" ]]; then
        tail -50 "$LOG_DIR/ollama.log"
    else
        echo "Логов пока нет. Запустите ноду: razum start"
    fi
}

# ---- Роутинг команд ----
case "${1:-help}" in
    start)          cmd_start ;;
    stop)           cmd_stop ;;
    status)         cmd_status ;;
    logs)           cmd_logs ;;
    models)         cmd_models "$2" "$3" ;;
    wallet)         cmd_wallet "$2" ;;
    provider)       cmd_provider "$2" ;;
    stake)          echo -e "${YELLOW}⚠${NC} Стейкинг будет доступен в тестнете. Следите за обновлениями." ;;
    benchmark)      cmd_benchmark ;;
    config)         cmd_config ;;
    update)         echo -e "${CYAN}▸ Обновление...${NC}"; curl -fsSL https://razum.ai/install.sh | bash ;;
    uninstall)
        echo -e "${RED}Удалить Razum? (y/N)${NC}"
        read -r confirm
        if [[ "$confirm" == "y" ]]; then
            rm -rf "$RAZUM_DIR"
            echo -e "${GREEN}✓${NC} Razum удалён"
        fi
        ;;
    help|--help|-h) cmd_help ;;
    version|--version|-v) echo "Razum CLI v0.1.0" ;;
    *)              echo "Неизвестная команда: $1"; echo "Выполните: razum help"; exit 1 ;;
esac
RAZUM_CLI

    chmod +x "$BIN_DIR/razum"
    log_ok "Razum CLI установлен: $BIN_DIR/razum"
}

# ============================================================
# Настройка PATH
# ============================================================
setup_path() {
    SHELL_RC=""
    if [[ -f "$HOME/.zshrc" ]]; then
        SHELL_RC="$HOME/.zshrc"
    elif [[ -f "$HOME/.bashrc" ]]; then
        SHELL_RC="$HOME/.bashrc"
    elif [[ -f "$HOME/.bash_profile" ]]; then
        SHELL_RC="$HOME/.bash_profile"
    fi

    if [[ -n "$SHELL_RC" ]]; then
        if ! grep -q "RAZUM" "$SHELL_RC" 2>/dev/null; then
            echo "" >> "$SHELL_RC"
            echo "# Razum AI Node" >> "$SHELL_RC"
            echo "export PATH=\"\$HOME/.razum/bin:\$PATH\"" >> "$SHELL_RC"
            log_ok "PATH обновлён в $SHELL_RC"
        fi
    fi

    export PATH="$BIN_DIR:$PATH"
}

# ============================================================
# Создание конфигурации
# ============================================================
create_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << EOF
# Razum AI Node — Конфигурация
# Версия: $VERSION

node:
  name: "razum-node-$(hostname -s)"
  network: "razum-testnet-1"

inference:
  engine: "ollama"
  url: "http://localhost:11434"
  max_concurrent: 4

provider:
  auto_register: true
  min_stake: 1000
EOF
        log_ok "Конфигурация создана: $CONFIG_FILE"
    fi
}

# ============================================================
# Скачивание стартовой модели
# ============================================================
pull_default_model() {
    echo ""
    log_step "Скачиваю стартовую модель (mistral:7b, ~4 GB)..."
    echo "  Это может занять несколько минут..."
    echo ""

    OLLAMA_CMD=$(command -v ollama || echo "/usr/local/bin/ollama")

    # Убеждаемся что Ollama запущена
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        if [[ "$(uname)" == "Darwin" ]]; then
            open /Applications/Ollama.app 2>/dev/null || $OLLAMA_CMD serve > /dev/null 2>&1 &
        else
            $OLLAMA_CMD serve > /dev/null 2>&1 &
        fi
        sleep 3
    fi

    $OLLAMA_CMD pull mistral:7b

    if [[ $? -eq 0 ]]; then
        log_ok "Модель mistral:7b установлена"
    else
        log_warn "Не удалось скачать модель. Скачайте позже: razum models pull mistral:7b"
    fi
}

# ============================================================
# Финальный отчёт
# ============================================================
print_success() {
    echo ""
    echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════════╗"
    echo "  ║       ✓ Razum Node установлена!          ║"
    echo -e "  ╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Начните с этих команд:"
    echo ""
    echo -e "    ${BOLD}razum start${NC}              — запустить ноду"
    echo -e "    ${BOLD}razum wallet create${NC}      — создать кошелёк"
    echo -e "    ${BOLD}razum provider register${NC}  — стать провайдером"
    echo -e "    ${BOLD}razum models available${NC}   — доступные модели"
    echo -e "    ${BOLD}razum benchmark${NC}          — тест скорости"
    echo -e "    ${BOLD}razum status${NC}             — статус ноды"
    echo ""
    echo -e "  Документация: ${CYAN}https://docs.razum.ai${NC}"
    echo -e "  GitHub:        ${CYAN}https://github.com/the-razum${NC}"
    echo -e "  Telegram:      ${CYAN}https://t.me/razum_ai${NC}"
    echo ""
    echo -e "  ${YELLOW}Перезапустите терминал или выполните:${NC}"
    echo -e "    source ${SHELL_RC:-~/.zshrc}"
    echo ""
}

# ============================================================
# Main
# ============================================================
main() {
    print_banner
    detect_system
    setup_directories
    install_ollama
    install_razum_cli
    setup_path
    create_config
    pull_default_model
    print_success
}

main "$@"
