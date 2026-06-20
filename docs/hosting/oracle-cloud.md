# Hosting — Oracle Cloud (Always Free ARM)

Source: https://docs.openclaw.ai/hosting/oracle-cloud
**Free tier: up to 4 OCPU, 24 GB RAM, 200 GB storage — $0/mo**

---

## Prerequisites

- Oracle Cloud account (signup at oracle.com/cloud/free)
- Tailscale account (free at tailscale.com)
- SSH key pair
- ~30 minutes

---

## Step 1 — Create OCI Instance

Oracle Cloud Console → Compute → Instances → Create Instance

| Setting | Value |
|---|---|
| Name | openclaw |
| Image | Ubuntu 24.04 (aarch64) |
| Shape | VM.Standard.A1.Flex (Ampere ARM) |
| OCPUs | 2 (up to 4 free) |
| Memory | 12 GB (up to 24 GB free) |
| Boot volume | 50 GB (up to 200 GB free) |
| SSH key | Add your public key |

Note public IP. If creation fails with "Out of capacity" — try different availability domain or retry later.

---

## Step 2 — Connect and Update

```bash
ssh ubuntu@YOUR_PUBLIC_IP

sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential  # required for ARM compilation
```

---

## Step 3 — Configure User and Hostname

```bash
sudo hostnamectl set-hostname openclaw
sudo passwd ubuntu
sudo loginctl enable-linger ubuntu  # keeps user services running after logout
```

---

## Step 4 — Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

From now on: `ssh ubuntu@openclaw` via Tailscale.

---

## Step 5 — Install OpenClaw (or Fractera)

```bash
# OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
# When prompted "How do you want to hatch your bot?" → select "Do this later"

# Fractera (same pattern)
curl -fsSL https://raw.githubusercontent.com/Fractera/Agent-Engineering-Infrastructure/main/install.sh | bash
```

---

## Step 6 — Configure Gateway (Tailscale Serve)

```bash
openclaw config set gateway.bind loopback
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway.service
```

---

## Step 7 — Lock Down VCN Security

Oracle Cloud Console → Networking → Virtual Cloud Networks → your VCN → Security Lists → Default Security List

**Remove all ingress rules except:**
- `0.0.0.0/0` UDP `41641` (Tailscale)

Keep default egress rules (allow all outbound).

This blocks SSH port 22, HTTP, HTTPS — only Tailscale access remains.

---

## Step 8 — Verify

```bash
openclaw --version
systemctl --user status openclaw-gateway.service
tailscale serve status
curl http://localhost:18789
```

Access Control UI from any Tailscale device:
```
https://openclaw.<tailnet-name>.ts.net/
```

---

## Fallback: SSH Tunnel

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
# Open http://localhost:18789
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Out of capacity" on instance creation | Try different availability domain or retry off-peak |
| Tailscale won't connect | `sudo tailscale up --ssh --hostname=openclaw --reset` |
| Gateway won't start | `openclaw doctor --non-interactive` + `journalctl --user -u openclaw-gateway.service -n 50` |
| ARM binary issues | Look for `linux-arm64` or `aarch64` releases; verify with `uname -m` |

---

## Fractera Notes

- **4 ARM vCPUs + 24GB RAM = free** — runs Fractera + LightRAG (v1.3) + OpenClaw (v1.4) simultaneously with headroom
- Node.js 20+ works fine on ARM64 (aarch64)
- `build-essential` needed for some npm native dependencies (same as OpenClaw)
- `loginctl enable-linger` = equivalent of PM2 startup for user services
- Tailscale Serve gives free HTTPS without Nginx + Let's Encrypt — simpler setup
- **Best free option for running the full Fractera stack**
