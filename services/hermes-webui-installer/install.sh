#!/bin/bash
# Hermes Web UI (Fractera-branded) installer
# Idempotent: safe to re-run. Designed for bootstrap.sh integration.
set -euo pipefail

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${HERMES_WEBUI_DIR:-/opt/hermes-webui}"
HERMES_WEBUI_PORT="${HERMES_WEBUI_PORT:-9120}"
# Bind 0.0.0.0 (mirrors the Hermes agent :9119 and LightRAG :9621). In IP/insecure
# mode the browser reaches the chat directly at http://<ip>:9120; in Secure mode the
# host firewall (ufw 22/80/443) closes :9120 externally and nginx proxies it over
# loopback via hermes.<domain>/chat/ — so 0.0.0.0 is correct in BOTH modes.
HERMES_WEBUI_HOST="${HERMES_WEBUI_HOST:-0.0.0.0}"
HERMES_WEBUI_AGENT_DIR="${HERMES_WEBUI_AGENT_DIR:-/usr/local/lib/hermes-agent}"
HERMES_HOME="${HERMES_HOME:-/root/.hermes}"
# Default workspace the webui chat operates in. Without it the webui falls back to
# /root/workspace (empty) and Hermes cannot see the coders' DEVELOPMENT-STEPS (step 182).
HERMES_WEBUI_DEFAULT_WORKSPACE="${HERMES_WEBUI_DEFAULT_WORKSPACE:-/opt/fractera/app}"
PINNED="$(cat "${INSTALLER_DIR}/pinned-version.txt")"
# Vendored fork — pulls from Fractera's copy, not upstream. See step 58.
REPO="https://github.com/Fractera/hermes-webui.git"

echo "[hermes-webui-installer] target = $INSTALL_DIR  pinned = $PINNED"

# --- 1. Clone if not present ---
if [ ! -d "$INSTALL_DIR" ]; then
    echo "[hermes-webui-installer] cloning $REPO @ $PINNED"
    git clone --branch "$PINNED" --depth 1 "$REPO" "$INSTALL_DIR"
else
    echo "[hermes-webui-installer] $INSTALL_DIR exists — skipping clone"
fi

# --- 2. Copy Fractera assets (overwrite — deterministic) ---
echo "[hermes-webui-installer] copying assets"
install -m 644 -t "$INSTALL_DIR/static/" \
    "$INSTALLER_DIR/assets/apple-touch-icon.png" \
    "$INSTALLER_DIR/assets/favicon-32.png" \
    "$INSTALLER_DIR/assets/favicon-192.png" \
    "$INSTALLER_DIR/assets/favicon-512.png" \
    "$INSTALLER_DIR/assets/favicon.ico" \
    "$INSTALLER_DIR/assets/fractera-logo.png"

# --- 3. Run rebrand (idempotent) ---
echo "[hermes-webui-installer] applying Fractera rebrand"
python3 "${INSTALLER_DIR}/rebrand.py" --target "$INSTALL_DIR"

# --- 4. .env (create, or top up missing keys — idempotent) ---
ENV_FILE="$INSTALL_DIR/.env"
# MCP_SECRET: the delegation plugin (fractera-platforms) reads it from the process
# environment to send the Bearer required by the platform bridges :3210-3214 (step 135
# gate). The webui is a separate PM2 process whose wrapper sources ONLY this .env —
# without the key here, delegation from the web chat fails with 401 (step 182).
MCP_SECRET_VALUE="$(grep -m1 -E '^MCP_SECRET=' "${HERMES_HOME}/.env" 2>/dev/null | cut -d= -f2- || true)"
if [ -z "$MCP_SECRET_VALUE" ]; then
    echo "[hermes-webui-installer] WARNING: MCP_SECRET not found in ${HERMES_HOME}/.env — webui delegation will rely on the plugin's own .env fallback"
fi
if [ ! -f "$ENV_FILE" ]; then
    echo "[hermes-webui-installer] writing default .env"
    cat > "$ENV_FILE" <<ENV
HERMES_WEBUI_HOST=${HERMES_WEBUI_HOST}
HERMES_WEBUI_PORT=${HERMES_WEBUI_PORT}
HERMES_WEBUI_AGENT_DIR=${HERMES_WEBUI_AGENT_DIR}
HERMES_WEBUI_PYTHON=${HERMES_WEBUI_AGENT_DIR}/venv/bin/python
HERMES_HOME=${HERMES_HOME}
HERMES_CONFIG_PATH=${HERMES_HOME}/config.yaml
HERMES_WEBUI_DEFAULT_WORKSPACE=${HERMES_WEBUI_DEFAULT_WORKSPACE}
ENV
    if [ -n "$MCP_SECRET_VALUE" ]; then
        echo "MCP_SECRET=${MCP_SECRET_VALUE}" >> "$ENV_FILE"
    fi
else
    echo "[hermes-webui-installer] .env exists — preserving, topping up missing keys"
    if ! grep -qE '^HERMES_WEBUI_DEFAULT_WORKSPACE=' "$ENV_FILE"; then
        echo "HERMES_WEBUI_DEFAULT_WORKSPACE=${HERMES_WEBUI_DEFAULT_WORKSPACE}" >> "$ENV_FILE"
        echo "[hermes-webui-installer]   + HERMES_WEBUI_DEFAULT_WORKSPACE"
    fi
    if [ -n "$MCP_SECRET_VALUE" ] && ! grep -qE '^MCP_SECRET=' "$ENV_FILE"; then
        echo "MCP_SECRET=${MCP_SECRET_VALUE}" >> "$ENV_FILE"
        echo "[hermes-webui-installer]   + MCP_SECRET"
    fi
fi

# --- 4b. Seed WebUI settings (language + brand + skip onboarding) ---
# load_settings() in hermes-webui merges a partial settings.json with its
# built-in defaults, so writing just these keys is safe.
# - language: seeded only if absent (preserve customer's later choice).
# - bot_name: always enforced to keep the Fractera brand.
# - onboarding_completed: skip webui's own provider-setup wizard. We funnel
#   the user into the original Hermes agent at /env for subscription OAuth
#   (Codex / Claude Code), and webui just reads the resulting credential
#   pool from auth.json. Two onboarding flows for one credential store
#   would just confuse partners.
echo "[hermes-webui-installer] seeding WebUI settings (language=en, bot_name=Fractera, skip onboarding)"
python3 - <<'PYSETTINGS'
import json, pathlib
d = pathlib.Path('/root/.hermes/webui')
d.mkdir(parents=True, exist_ok=True)
f = d / 'settings.json'
data = {}
if f.exists():
    try:
        data = json.loads(f.read_text())
        if not isinstance(data, dict):
            data = {}
    except Exception:
        data = {}
data.setdefault('language', 'en')         # seed only if absent
data['bot_name'] = 'Fractera'              # always enforce brand
data['onboarding_completed'] = True        # always skip webui's setup wizard
f.write_text(json.dumps(data, indent=2))
print('  settings.json seeded:', json.dumps({k: data[k] for k in ('language', 'bot_name', 'onboarding_completed')}))
PYSETTINGS

# --- 5. PM2 wrapper ---
WRAPPER="$INSTALL_DIR/pm2-start.sh"
cat > "$WRAPPER" <<'WRAPPER_EOF'
#!/bin/bash
# PM2 wrapper: sources .env then exec's server.py
cd "$(dirname "${BASH_SOURCE[0]}")"
set -a
[ -f .env ] && . ./.env
set +a
PYTHON="${HERMES_WEBUI_PYTHON:-/usr/local/lib/hermes-agent/venv/bin/python3}"
exec "$PYTHON" "$(dirname "${BASH_SOURCE[0]}")/server.py"
WRAPPER_EOF
chmod +x "$WRAPPER"

# --- 6. PM2 register (idempotent: startOrRestart-style via delete+start) ---
if command -v pm2 >/dev/null 2>&1; then
    if pm2 jlist 2>/dev/null | grep -q '"name":"fractera-hermes-webui"'; then
        echo "[hermes-webui-installer] PM2 fractera-hermes-webui exists — reloading"
        pm2 reload fractera-hermes-webui --update-env
    else
        echo "[hermes-webui-installer] PM2 starting fractera-hermes-webui"
        pm2 start "$WRAPPER" --name fractera-hermes-webui --cwd "$INSTALL_DIR"
    fi
    pm2 save
else
    echo "[hermes-webui-installer] WARNING: pm2 not in PATH — process not started"
fi

echo "[hermes-webui-installer] done."
