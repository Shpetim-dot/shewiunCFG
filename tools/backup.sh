#!/usr/bin/env bash
# Consistent online backup of the Shewiun SQLite database, taken from inside the container
# (python's sqlite3 backup API, so a running app is safe) and verified afterwards.
#
#   ./tools/backup.sh                 # writes /data/backups/cfa-YYYYmmdd-HHMMSS.db in the volume
#   ./tools/backup.sh /srv/copies     # also copies the file to a second location
#
# Cron (daily 03:15, output appended to a log):
#   15 3 * * * cd /opt/shewiun && ./tools/backup.sh >> /var/log/shewiun-backup.log 2>&1
#
# 3-2-1 rule: three copies, two media, one offsite. This script makes copy one and two;
# copy the second path to external storage yourself (rclone, scp, S3, Backblaze B2).
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECOND_COPY="${1:-}"
KEEP_DAYS="${CFA_BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
NAME="cfa-${STAMP}.db"

cd "$COMPOSE_DIR"

echo "[backup] $(date -u +%FT%TZ) starting ${NAME}"
docker compose exec -T cfa python - "$NAME" <<'PY'
import sqlite3, sys, pathlib
name = sys.argv[1]
src = sqlite3.connect("/data/cfa.db")
dst_path = pathlib.Path("/data/backups") / name
dst_path.parent.mkdir(parents=True, exist_ok=True)
dst = sqlite3.connect(dst_path)
with dst:
    src.backup(dst)
check = dst.execute("PRAGMA integrity_check").fetchone()[0]
if check != "ok":
    raise SystemExit(f"[backup] integrity_check failed: {check}")
size = dst_path.stat().st_size
dst.close(); src.close()
print(f"[backup] wrote {dst_path} ({size} bytes)")
print(f"[backup] integrity_check ok")
PY

echo "[backup] pruning backups older than ${KEEP_DAYS} days"
docker compose exec -T cfa sh -c "find /data/backups -name 'cfa-*.db' -mtime +${KEEP_DAYS} -print -delete" || true

if [ -n "$SECOND_COPY" ]; then
  mkdir -p "$SECOND_COPY"
  docker compose cp "cfa:/data/backups/${NAME}" "${SECOND_COPY}/${NAME}"
  echo "[backup] copied to ${SECOND_COPY}/${NAME} - move this copy offsite"
fi

echo "[backup] done"
