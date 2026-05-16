# Hermes Web UI Installer (Fractera-branded)

Idempotent installer for `nesquena/hermes-webui` that applies the Fractera
rebrand on top of the upstream project. Designed to be called from
`bootstrap.sh` during new-server provisioning.

## Layout

```
hermes-webui-installer/
├── README.md              this file
├── pinned-version.txt     upstream git tag to clone (e.g. v0.51.68)
├── install.sh             orchestrator — clone, copy assets, rebrand, write .env
├── rebrand.py             idempotent patch script (run after every install/upgrade)
└── assets/                Fractera-branded static files
    ├── apple-touch-icon.png   (180×180)
    ├── favicon-32.png         (32×32 PNG)
    ├── favicon-192.png        (192×192 PNG)
    ├── favicon-512.png        (512×512 PNG)
    ├── favicon.ico            (32×32 PNG as .ico fallback)
    └── fractera-logo.png      welcome-screen logo (same as apple-touch-icon)
```

## Usage

```bash
bash /opt/fractera/services/hermes-webui-installer/install.sh
```

Environment variables consumed by `install.sh`:

| Var | Default | Purpose |
|---|---|---|
| `HERMES_WEBUI_DIR` | `/opt/hermes-webui` | Install location |
| `HERMES_WEBUI_PORT` | `9120` | Server port (loopback only) |
| `HERMES_WEBUI_AGENT_DIR` | `/usr/local/lib/hermes-agent` | hermes-agent install path |
| `HERMES_HOME` | `/root/.hermes` | Hermes config home |

## Idempotency

Re-running `install.sh` on an already-installed system:
- Skips `git clone` (directory exists) — but does NOT auto-upgrade. Manual checkout required for upgrades.
- Always copies assets (overwrites — assets are deterministic).
- Runs `rebrand.py` which detects already-patched files and skips them.
- Preserves existing `.env` (does NOT overwrite).
- Re-registers PM2 process via `pm2 startOrRestart` (idempotent).

## Upgrade procedure

```bash
# Backup current state
tar czf /root/backups/hermes-webui-pre-upgrade-$(date +%s).tar.gz /opt/hermes-webui

cd /opt/hermes-webui
git fetch --tags
git checkout $(cat /opt/fractera/services/hermes-webui-installer/pinned-version.txt)
bash /opt/fractera/services/hermes-webui-installer/install.sh   # re-applies rebrand on new files
pm2 restart fractera-hermes-webui
```

## Auth model

`install.sh` does **not** set `HERMES_WEBUI_PASSWORD` or
`ONBOARDING_OPEN`. Authentication is handled at the nginx level via
`auth_request` against Fractera Auth — see `lib/bootstrap.sh` nginx
template for the `/chat/` location with `auth_request /auth-verify;`.
