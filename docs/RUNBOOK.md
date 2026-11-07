# Runbook — the live instance

Everything an operator needs to know about the running deployment. Keep this file in sync with the
host; it is the first thing to read after a break of a few weeks.

## Where everything lives

| What | Path |
|---|---|
| Project folder | `/opt/shewiun` |
| Configuration (secrets) | `/opt/shewiun/.env` |
| Database (SQLite) | Docker volume `cfa-data` → `/data/cfa.db` inside the container |
| Backups (primary) | `/data/backups/` (volume) |
| Backups (second copy) | `/home/shpetim14/backup2/` |
| Caddy certificate data | Docker volume `caddy-data` |
| Compose stack | `/opt/shewiun/docker-compose.yml` + `Caddyfile` |

Public URL: `https://34.60.114.40.nip.io` (Caddy terminates TLS, proxies to the `cfa` container on
port 8000; the app port is intentionally not published).

## Daily operation

```bash
cd /opt/shewiun
docker compose ps                 # both services must be Up
docker compose logs --tail=50 cfa # application log
docker compose logs --tail=50 caddy
```

Restart after a config change:

```bash
cd /opt/shewiun && docker compose up -d
```

## Update to a new release

```bash
cd /opt/shewiun
./tools/backup.sh /home/shpetim14/backup2   # always back up first
git pull
docker compose up -d --build
docker compose ps
curl -s https://34.60.114.40.nip.io/api/health/ready
```

## Backups

- Cron runs daily at **03:15**: `./tools/backup.sh /home/shpetim14/backup2`
- Log: `/var/log/shewiun-backup.log`
- Retention: 14 days (`CFA_BACKUP_KEEP_DAYS`)
- Check: `crontab -l` and `tail /var/log/shewiun-backup.log`
- **Move the second copy off the VM regularly** (scp, rclone, object storage) — three copies,
  two media, one offsite.

Restore (drill it once and write the date here):

```bash
cd /opt/shewiun
docker compose stop cfa
docker compose run --rm cfa sh -c 'cp /data/backups/cfa-<stamp>.db /data/cfa.db'
docker compose start cfa
curl -s https://34.60.114.40.nip.io/api/health/ready
```

Restore drill performed on: ______________________

## Configuration changes

Edit `/opt/shewiun/.env`, then `docker compose up -d`. Important keys:

```bash
CFA_ENV=production                 # fail-closed mode
CFA_PUBLIC_URL=https://...         # used in email links
CFA_SECRET_KEY=...                 # encrypts stored provider keys; never change it without
                                   # re-saving the encrypted keys
CFA_ALLOW_SIGNUP=0                 # 1 only while onboarding a new owner
CFA_SEARCH_PROVIDER=tavily
CFA_SEARCH_API_KEY=...
DOMAIN=...                         # Caddy hostname
ACME_EMAIL=...
```

After changing `CFA_SECRET_KEY`, stored encrypted values (provider keys, MCP tokens, search key)
must be saved again — they cannot be decrypted with a new key.

## Common incidents

| Symptom | Check | Fix |
|---|---|---|
| Site unreachable | GCP VM stopped? `docker compose ps` | start the VM, `docker compose up -d` |
| 502 from Caddy | `docker compose logs cfa` | app crashed → check `.env`, restart |
| `authentication is not configured` | no account exists | create the owner account in the browser |
| Web search off | `docker compose exec cfa env \| grep CFA_SEARCH` | set the key in `.env`, restart |
| Certificate expired | `docker compose logs caddy \| grep -i cert` | `docker compose restart caddy` |
| Disk full | `df -h`, `du -sh /var/lib/docker/volumes` | prune old backups/logs |

## Free-tier guardrails (cost 0 €)

- exactly **one** e2-micro VM in `us-central1`/`us-west1`/`us-east1`
- 30 GB **standard** persistent disk — no SSD, no Hyperdisk, no second disk
- 1 GB North-America egress per month — keep downloads small
- no load balancer, no Cloud NAT, no managed database

## Security hygiene

- rotate `CFA_SEARCH_API_KEY` and model keys periodically; never paste them into chats or issues
- `.env` is git-ignored — keep it that way
- only ports 80/443 are open; SSH is browser-based from the GCP console
- review `/api/security/audit` (Control → Audit log) after any incident
