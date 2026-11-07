# Deploy Shewiun CFA on Google Cloud "Always Free" (e2-micro)

Free forever: **1 × e2-micro** (2 vCPU shared / 1 GB RAM) in `us-west1`, `us-central1` or `us-east1`,
**30 GB standard persistent disk** and 1 GB North-America egress per month. No VM needed on your
own machine, data survives reboots.

Your existing `docker-compose.yml`, `Caddyfile` and `tools/backup.sh` work unchanged.

> Card is required for identity verification only; the free tier does not charge.

## 1. Create the VM (10 min)

1. <https://console.cloud.google.com> → project wählen/erstellen (z. B. `shewiun`).
2. **Compute Engine → VM instances → Create instance**
   - **Name:** `shewiun`
   - **Region:** `us-central1` (Iowa), Zone `us-central1-a` — must be one of the free regions
   - **Machine family:** General purpose → **Series E2** → **e2-micro**
   - **Boot disk:** Change → **Ubuntu 22.04 LTS**, Boot disk type **Standard persistent disk**, Size **30 GB**
   - **Firewall:** check **Allow HTTP traffic** and **Allow HTTPS traffic**
   - **Create**
3. **Reserve the IP** so it does not change when you stop/start the VM:
   **VPC network → IP addresses** → the VM's address → **Reserve** (static, free while attached).

## 2. Firewall (2 min)

If HTTP/HTTPS were not enabled at creation:

**VPC network → Firewall → Create firewall rule**
- Name `allow-web`
- Targets: All instances in the network (or tag `http-server`)
- Source IPv4 ranges: `0.0.0.0/0`
- Protocols and ports: **TCP 80, 443** → Create

Do **not** open port 8000.

## 3. Domain (optional, 5 min)

DNS `A` record `cfa.deine-domain.de` → reserved **external IP**.
Without a domain, Caddy cannot get a certificate; then run the app on plain HTTP only for a test.

## 4. SSH + Docker (5 min)

In the console: **VM instances → SSH** (browser shell, nothing to install). Then:

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
sudo mkdir -p /opt/shewiun && sudo chown $USER /opt/shewiun
git clone https://github.com/Shpetim-dot/shewiunCFG.git /opt/shewiun
cd /opt/shewiun && cp .env.example .env && nano .env
```

`.env` (minimum):

```bash
CFA_ENV=production
CFA_PUBLIC_URL=https://cfa.deine-domain.de
CFA_SECRET_KEY=<fernety-key>
CFA_ALLOW_SIGNUP=1
CFA_SEARCH_PROVIDER=tavily
CFA_SEARCH_API_KEY=tvly-...
DOMAIN=cfa.deine-domain.de
ACME_EMAIL=deine@mail.de
```

Fernet key locally: `python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"`

## 5. Start (3 min)

```bash
cd /opt/shewiun
docker compose up -d --build
docker compose logs -f caddy     # wait for "certificate obtained", then Ctrl+C
```

The 1 GB RAM is enough for one worker: the compose file already pins `--workers 1`.

## 6. Verify

```bash
curl -s https://cfa.deine-domain.de/api/health         # status ok
curl -s https://cfa.deine-domain.de/api/health/ready   # ready true
curl -s https://cfa.deine-domain.de/api/search/status  # provider tavily, configured true
```

Browser: open the URL → **Create your workspace** → create a note → run a council call.
**Persistence test:** *VM instances → Stop → Start*, reload the page: still signed in.
Then set `CFA_ALLOW_SIGNUP=0` in `.env` and `docker compose up -d`.

## 7. Backups

```bash
chmod +x tools/backup.sh
./tools/backup.sh /home/$USER/backup2
crontab -e
# add: 15 3 * * * cd /opt/shewiun && ./tools/backup.sh /home/$USER/backup2 >> /var/log/shewiun-backup.log 2>&1
```

Copy `/home/$USER/backup2` off the VM occasionally (Google Cloud Storage free tier, rclone, or your
own machine). Restore procedure: see `docs/DEPLOY-ORACLE.md` section 7 (identical).

## 8. Free-tier limits to respect

- **1 GB RAM** — one worker, no replicas. Fine for a handful of users; council calls with live
  streams are the heaviest load.
- **1 GB egress/month in North America.** A public demo is fine; heavy file downloads are not.
- **30 GB disk** — database plus backups stay far below that.
- Do not attach a second VM or increase the machine type, otherwise billing starts.
- Idle VMs are not suspended automatically; keep it running (that is what you want).

## 9. Updates

```bash
cd /opt/shewiun
./tools/backup.sh /home/$USER/backup2
git pull
docker compose up -d --build
```
