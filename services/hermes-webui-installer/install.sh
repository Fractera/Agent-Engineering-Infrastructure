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
PINNED="$(cat "${INSTALLER_DIR}/pinned-version.txt")"
REPO="https://github.com/nesquena/hermes-webui.git"

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

# --- 4. .env (preserve existing) ---
ENV_FILE="$INSTALL_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "[hermes-webui-installer] writing default .env"
    cat > "$ENV_FILE" <<ENV
HERMES_WEBUI_HOST=${HERMES_WEBUI_HOST}
HERMES_WEBUI_PORT=${HERMES_WEBUI_PORT}
HERMES_WEBUI_AGENT_DIR=${HERMES_WEBUI_AGENT_DIR}
HERMES_WEBUI_PYTHON=${HERMES_WEBUI_AGENT_DIR}/venv/bin/python
HERMES_HOME=${HERMES_HOME}
HERMES_CONFIG_PATH=${HERMES_HOME}/config.yaml
ENV
else
    echo "[hermes-webui-installer] .env exists — preserving"
fi

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
