# Hosting — DigitalOcean Droplet

Source: https://docs.openclaw.ai/hosting/digitalocean
Applies to: OpenClaw (Fractera is lighter — same steps work)

---

## Prerequisites

- DigitalOcean account
- SSH key pair (or password auth)
- ~20 minutes

---

## Step 1 — Create a Droplet

Use Ubuntu 24.04 LTS. Avoid third-party Marketplace 1-click images.

Recommended specs:
- Region: closest to you
- Image: Ubuntu 24.04 LTS
- Size: Basic, 1 vCPU / 1 GB RAM / 25 GB SSD
- Auth: SSH key (recommended)

---

## Step 2 — Connect and Install

```bash
ssh root@YOUR_DROPLET_IP

apt update && apt upgrade -y

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw --version

# For Fractera instead:
curl -fsSL https://raw.githubusercontent.com/Fractera/Agent-Engineering-Infrastructure/main/install.sh | bash
```

---

## Step 3 — Run Onboarding

```bash
openclaw onboard --install-daemon
```

Wizard covers: model auth, channel setup, gateway token, systemd daemon.

---

## Step 4 — Add Swap (recommended for 1 GB Droplets)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Step 5 — Verify Gateway

```bash
openclaw status
systemctl --user status openclaw-gateway.service
journalctl --user -u openclaw-gateway.service -f
```

---

## Step 6 — Access Control UI

Gateway binds to loopback by default. Three options:

### Option A: SSH Tunnel (simplest)

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
```

Open: http://localhost:18789

### Option B: Tailscale Serve

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

Open: `https://<magicdns>/` from any device on your tailnet.

### Option C: Tailnet Bind

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

Open: `http://<tailscale-ip>:18789` (token required)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Gateway won't start | `openclaw doctor --non-interactive` + `journalctl --user -u openclaw-gateway.service -n 50` |
| Port in use | `lsof -i :18789` — find and stop the process |
| Out of memory | `free -h` — verify swap active; use API models (Claude/GPT) not local; or upgrade to 2 GB |

---

## Fractera Notes

- 1 GB RAM is enough for Fractera (app + bridge + media ~300–400 MB)
- Swap still recommended
- Fractera uses PM2 instead of systemd — `pm2 status` to verify
- Ports to open: 80/443 (Nginx), no need to expose 3000/3300/3200 directly
- Same SSH tunnel approach works for local development access
