# Deploy Shewiun CFA on Oracle Cloud "Always Free" — persistent, 0 €

This is the recommended free setup: a small ARM VM with Docker, a named volume for SQLite and
Caddy for automatic HTTPS. The data survives reboots, deploys and idle periods, unlike Vercel or
Render Free. Budget: **Oracle Always Free** (4 ARM cores / 24 GB RAM total, 200 GB block storage).

## 1. Create the VM (10 minutes)

1. <https://cloud.oracle.com> → sign up (card is used for identity verification only, not charged).
2. **Menu → Compute → Instances → Create instance**
   - Name: `shewiun`
   - Image: **Ubuntu 22.04** (or 24.04)
   - Shape: **Ampere → VM.Standard.A1.Flex**, **1 OCPU / 6 GB** is plenty
   - **Add SSH key**: upload your public key (or generate one in the dialog)
   - Boot volume: 50 GB is fine (up to 200 GB free)
3. **Create**, then note the **public IP**.
4. **Networking → Virtual Cloud Networks → your VCN → Security Lists → Default Security List**
   Add ingress rules: **TCP 80** and **TCP 443** from `0.0.0.0/0`. (Do **not** open 8000.)

## 2. Point a domain at it (optional but recommended)

At your DNS provider: `A` record `cfa.your-domain.com` → VM public IP.
Without a domain the app works on `http://<ip>:8000` only after you publish the port, so Caddy +
DNS is the clean path (HTTPS is required for secure cookies in production).

## 3. Install Docker (5 minutes)

```bash
ssh ubuntu@<VM-IP>
sudo apt-get update && sudo apt-get install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable
docker --version && docker compose version
```

## 4. Get the code and configure (5 minutes)

```bash
sudo mkdir -p /opt/shewiun && sudo chown $USER /opt/shewiun
git clone https://github.com/Shpetim-dot/shewiunCFG.git /opt/shewiun
cd /opt/shewiun
cp .env.example .env
```

Edit `.env` — the minimum for a real instance:

```bash
CFA_ENV=production
CFA_PUBLIC_URL=https://cfa.your-domain.com
CFA_SECRET_KEY=<python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())">
CFA_ALLOW_SIGNUP=1              # set to 0 after you created your owner account
CFA_SEARCH_PROVIDER=tavily
CFA_SEARCH_API_KEY=tvly-...
# optional but strongly recommended: attach a model so answers are generated, not scripted
# CFA_MODEL_BASE_URL=https://api.openai.com/v1
# CFA_MODEL_API_KEY=...
# CFA_MODEL_NAME=gpt-4o-mini
# email (invitations, password reset, verification)
# SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=... SMTP_FROM=no-reply@your-domain.com
```

Caddy needs the domain too, so add to `.env`:

```bash
DOMAIN=cfa.your-domain.com
ACME_EMAIL=you@your-domain.com
```

## 5. Start (3 minutes)

```bash
cd /opt/shewiun
docker compose up -d --build
docker compose logs -f caddy      # wait for "certificate obtained" then Ctrl+C
```

## 6. Verify — the checklist that proves it works

```bash
curl -s https://cfa.your-domain.com/api/health        # {"status":"ok", "version":..., "database":...}
curl -s https://cfa.your-domain.com/api/health/ready  # {"ready":true,"errors":[]}
curl -s https://cfa.your-domain.com/api/search/status # {"provider":"tavily","configured":true}
```

In the browser:

1. Open the URL, create the workspace (owner account).
2. Create a note, start a council call, run a research question — everything must work.
3. **Persistence test:** `sudo reboot`, wait 60 s, reload → still signed in, notes still there.
4. **Persistence test 2:** `docker compose down && docker compose up -d` → data still there.
5. Then set `CFA_ALLOW_SIGNUP=0` in `.env` and `docker compose up -d` again.

## 7. Backups (2 minutes)

```bash
chmod +x tools/backup.sh
./tools/backup.sh /home/ubuntu/backup2                 # one run, with a second copy
crontab -e
# add:
15 3 * * * cd /opt/shewiun && ./tools/backup.sh /home/ubuntu/backup2 >> /var/log/shewiun-backup.log 2>&1
```

The script uses SQLite's online backup API inside the container, runs `integrity_check`, prunes
backups older than 14 days (`CFA_BACKUP_KEEP_DAYS`) and copies the file to the second path.
**Move that second copy offsite** (rclone to Backblaze B2, `scp` to another machine, or Oracle
Object Storage) — three copies, two media, one offsite.

**Restore drill (do it once, write down the date):**

```bash
docker compose stop cfa
docker compose run --rm cfa sh -c 'mkdir -p /data/restore && cp /data/backups/cfa-<stamp>.db /data/restore/'
# then copy it over the live file inside the volume:
docker compose run --rm cfa sh -c 'cp /data/backups/cfa-<stamp>.db /data/cfa.db'
docker compose start cfa
curl -s https://cfa.your-domain.com/api/health/ready
```

## 8. Updates

```bash
cd /opt/shewiun
./tools/backup.sh /home/ubuntu/backup2      # always back up first
git pull
docker compose up -d --build
```

## 9. What to keep out of the repo

Never commit `.env`. It contains `CFA_SECRET_KEY` (encrypts provider keys and MCP tokens),
`CFA_SEARCH_API_KEY`, model keys and SMTP credentials. `.gitignore` already excludes it.

## 10. Known limits of this single-node setup

- **One worker only.** SQLite + the in-process runtime worker assume a single process. Do not scale
  replicas on this volume.
- The free ARM VM is small: fine for tens of users, not for hundreds of concurrent council calls.
- No managed failover. Take the backups seriously; the restore drill above is the proof.
- For multi-node or multi-region you need Postgres and an external worker (see `docs/ROADMAP-SAAS.md`).
