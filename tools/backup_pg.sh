#!/usr/bin/env bash
# Consistent PostgreSQL backup of the Shewiun database (pg_dump custom format), taken from the db container.
#
#   ./tools/backup_pg.sh                 # writes ./backups/cfa-YYYYmmdd-HHMMSS.dump
#   ./tools/backup_pg.sh /srv/copies     # also copies the file to a second location
#
# Cron (daily 03:15):  15 3 * * * cd /opt/shewiun && ./tools/backup_pg.sh >> /var/log/shewiun-backup.log 2>&1
# Restore into an empty database:
#   docker compose exec -T db pg_restore -U cfa -d cfa --clean --if-exists --no-owner < backups/cfa-XXXX.dump
# 3-2-1 rule: this makes copy one and two; copy the second path off the machine yourself (rclone, scp, S3, B2).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECOND_COPY="${1:-}"
KEEP_DAYS="${CFA_BACKUP_KEEP_DAYS:-14}"
NAME="cfa-$(date -u +%Y%m%d-%H%M%S).dump"
mkdir -p backups
echo "[backup] $(date -u +%FT%TZ) starting ${NAME}"
docker compose exec -T db pg_dump -U cfa --format=custom --no-owner cfa > "backups/${NAME}"
# verify: the archive must be readable and contain the audit table
docker compose exec -T db pg_restore --list < "backups/${NAME}" | grep -q "audit_events" || { echo "[backup] verification FAILED" >&2; rm -f "backups/${NAME}"; exit 1; }
echo "[backup] ok: $(du -h "backups/${NAME}" | cut -f1) $(sha256sum "backups/${NAME}" | cut -d' ' -f1)"
[ -n "$SECOND_COPY" ] && { mkdir -p "$SECOND_COPY"; cp "backups/${NAME}" "$SECOND_COPY/"; echo "[backup] copied to $SECOND_COPY"; }
find backups -name 'cfa-*.dump' -mtime +"$KEEP_DAYS" -delete
