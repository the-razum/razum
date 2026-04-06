#!/bin/bash
# =============================================================
# Razum AI — Скрипт ребрендинга Gonka → Razum
# =============================================================
# Использование:
#   1. Клонируй репо:  git clone https://github.com/gonka-ai/gonka.git
#   2. cd gonka
#   3. bash ../rebrand.sh
#
# Скрипт заменяет все упоминания Gonka/GNK на Razum/RZM
# и переименовывает файлы/папки где нужно.
# =============================================================

set -e

echo "🔄 Razum AI Rebranding Script"
echo "=============================="
echo ""

# Проверка что мы в правильной папке
if [ ! -f "go.mod" ] && [ ! -f "docker-compose.yml" ]; then
  echo "❌ Ошибка: запусти скрипт из корня репозитория Gonka"
  echo "   cd fork/gonka && bash ../rebrand.sh"
  exit 1
fi

# Создаём лог
LOG="../REBRAND_LOG.md"
echo "# Rebrand Log: Gonka → Razum" > $LOG
echo "" >> $LOG
echo "Дата: $(date)" >> $LOG
echo "" >> $LOG

# ----- ЗАМЕНЫ В СОДЕРЖИМОМ ФАЙЛОВ -----

echo "📝 Замена строк в файлах..."

# Порядок замен важен! Сначала длинные строки, потом короткие.
# Это предотвращает двойные замены.

declare -A REPLACEMENTS=(
  # GitHub org / module paths
  ["gonka-ai/gonka-openai"]="the-razum/razum-openai"
  ["gonka-ai/cosmos-sdk"]="the-razum/cosmos-sdk"
  ["gonka-ai/gonka"]="the-razum/razum"
  ["gonka-ai"]="the-razum"

  # Названия (CamelCase, Title)
  ["Gonka AI"]="Razum AI"
  ["GonkaAI"]="RazumAI"
  ["Gonka"]="Razum"

  # Тикер токена
  ["ugnk"]="urzm"
  ["GNK"]="RZM"

  # Нижний регистр (конфиги, пути)
  ["gonka_ai"]="razum_ai"
  ["gonka-openai"]="razum-openai"
  ["gonka"]="razum"

  # Бинарники
  ["gonkad"]="razumd"

  # Домены
  ["gonka.ai"]="razum.network"
  ["gonka.me"]="razum.network"
)

# Считаем общее количество замен
TOTAL_CHANGES=0

for OLD in "${!REPLACEMENTS[@]}"; do
  NEW="${REPLACEMENTS[$OLD]}"

  # Считаем совпадения (кроме бинарных файлов и .git)
  COUNT=$(grep -rl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor \
    --exclude='*.png' --exclude='*.jpg' --exclude='*.wasm' --exclude='*.pb.go' \
    "$OLD" . 2>/dev/null | wc -l || echo "0")

  if [ "$COUNT" -gt 0 ]; then
    echo "  $OLD → $NEW ($COUNT файлов)"
    echo "- \`$OLD\` → \`$NEW\` — $COUNT файлов" >> $LOG

    # Выполняем замену
    grep -rl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor \
      --exclude='*.png' --exclude='*.jpg' --exclude='*.wasm' --exclude='*.pb.go' \
      "$OLD" . 2>/dev/null | while read -r file; do
      sed -i "s|$OLD|$NEW|g" "$file"
    done

    TOTAL_CHANGES=$((TOTAL_CHANGES + COUNT))
  fi
done

echo "" >> $LOG
echo "**Итого:** $TOTAL_CHANGES файлов изменено" >> $LOG

# ----- ПЕРЕИМЕНОВАНИЕ ФАЙЛОВ И ПАПОК -----

echo ""
echo "📁 Переименование файлов и папок..."
echo "" >> $LOG
echo "## Переименованные файлы/папки" >> $LOG

# Переименовываем папки и файлы с "gonka" в названии
find . -not -path './.git/*' -name '*gonka*' | sort -r | while read -r filepath; do
  newpath=$(echo "$filepath" | sed 's/gonka/razum/g')
  if [ "$filepath" != "$newpath" ]; then
    # Создаём директорию если нужно
    mkdir -p "$(dirname "$newpath")"
    mv "$filepath" "$newpath"
    echo "  $filepath → $newpath"
    echo "- \`$filepath\` → \`$newpath\`" >> $LOG
  fi
done

# ----- ИТОГ -----

echo ""
echo "✅ Ребрендинг завершён!"
echo ""
echo "Следующие шаги:"
echo "  1. Проверь go.mod: модуль должен быть github.com/the-razum/razum"
echo "  2. Запусти: go build ./... (проверить компиляцию)"
echo "  3. Проверь docker-compose.yml: имена сервисов"
echo "  4. Проверь genesis.json: denom должен быть urzm"
echo "  5. Прочитай REBRAND_LOG.md для списка всех изменений"
echo ""
echo "📄 Лог сохранён в: $LOG"
