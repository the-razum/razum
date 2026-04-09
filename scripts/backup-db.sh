#!/bin/bash
# Razum AI — SQLite backup script
# Run via cron every 6 hours:
#   0 */6 * * * /root/Razum/scripts/backup-db.sh >> /root/Razum/data/backup.log 2>&1

set -e

DATA_DIR="${DATA_DIR:-/root/Razum/web-app/data}"
BACKUP_DIR="${DATA_DIR}/backups"
DB_FILE="${DATA_DIR}/razum.db"
KEEP_DAYS=7  # keep backups for 7 days

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if DB exists
if [ ! -f "$DB_FILE" ]; then
  echo "[$(date -Iseconds)] ERROR: Database not found at $DB_FILE"
  exit 1
fi

# Use SQLite's .backup command for a safe, consistent backup
# This works even while the DB is being written to (WAL mode)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/razum_${TIMESTAMP}.db"

sqlite3 "$DB_FILE" ".backup '${BACKUP_FILE}'"

# Compress
gzip "$BACKUP_FILE"

# Get file size
SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "[$(date -Iseconds)] Backup created: razum_${TIMESTAMP}.db.gz (${SIZE})"

# Clean up old backups
find "$BACKUP_DIR" -name "razum_*.db.gz" -mtime +${KEEP_DAYS} -delete 2>/dev/null
REMAINING=$(ls "$BACKUP_DIR"/razum_*.db.gz 2>/dev/null | wc -l)
echo "[$(date -Iseconds)] Backups on disk: ${REMAINING}"
