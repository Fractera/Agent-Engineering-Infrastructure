# Hosting — Raspberry Pi

Source: https://docs.openclaw.ai/hosting/raspberry-pi
Models run in the cloud via API — even a modest Pi handles the workload well.

---

## Prerequisites

- Raspberry Pi 4 or 5, 2 GB+ RAM (4 GB recommended)
- MicroSD 16 GB+ or USB SSD (better performance)
- Official Pi power supply
- Network connection (Ethernet or WiFi)
- **64-bit Raspberry Pi OS** — do not use 32-bit
- ~30 minutes

---

## Step 1 — Flash the OS

Use Raspberry Pi OS Lite (64-bit) — no desktop needed.

In Raspberry Pi Imager settings:
- Hostname: `gateway-host`
- Enable SSH
- Set username + password
- Configure WiFi (if not using Ethernet)

Flash to SD/USB, insert, boot.

---

## Step 2 — Connect

```bash
ssh user@gateway-host
```

---

## Step 3 — Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

# Set timezone (important for cron and reminders)
sudo timedatectl set-timezone America/Chicago
```

---

## Step 4 — Install Node.js 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

---

## Step 5 — Add Swap (important for 2 GB or less)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Reduce swappiness for low-RAM devices
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Step 6 — Install OpenClaw (or Fractera)

```bash
# OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Fractera
curl -fsSL https://raw.githubusercontent.com/Fractera/Agent-Engineering-Infrastructure/main/install.sh | bash
```

---

## Step 7 — Run Onboarding

```bash
openclaw onboard --install-daemon
```

API keys recommended over OAuth for headless devices. Telegram is easiest to start.

---

## Step 8 — Verify

```bash
openclaw status
systemctl --user status openclaw-gateway.service
journalctl --user -u openclaw-gateway.service -f
```

---

## Step 9 — Access Control UI

```bash
# On Pi — get dashboard URL
ssh user@gateway-host 'openclaw dashboard --no-open'

# SSH tunnel on your computer
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

Open printed URL in local browser. For always-on remote access: use Tailscale.

---

## Performance Tips

### Use USB SSD

SD cards are slow and wear out. USB SSD dramatically improves performance.

### Enable module compile cache

```bash
grep -q 'NODE_COMPILE_CACHE' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

### Reduce memory usage (headless)

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Out of memory | `free -h` — verify swap; disable `cups bluetooth avahi-daemon`; use API models only |
| Slow performance | Use USB SSD; check CPU throttling: `vcgencmd get_throttled` (should return `0x0`) |
| Service won't start | `journalctl --user -u openclaw-gateway.service -n 100`; `openclaw doctor --non-interactive`; verify lingering: `sudo loginctl enable-linger "$(whoami)"` |
| ARM binary errors | Check for ARM64 build of the binary; verify arch: `uname -m` (should show `aarch64`) |
| WiFi drops | `sudo iwconfig wlan0 power off` |

---

## Fractera Notes

- Pi 4 (4 GB) runs Fractera comfortably — app + bridge + media = ~300–400 MB RAM
- Add 2 GB swap for safety
- Same `NODE_COMPILE_CACHE` tuning applies to Fractera Node.js services
- USB SSD strongly recommended — SQLite + media storage benefits from faster I/O
- Enable lingering: `sudo loginctl enable-linger "$(whoami)"` for PM2 to survive logout
- Fractera is a good Pi project — zero cloud cost, runs on your home network
