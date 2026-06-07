"""Fractera AI Platforms plugin for Hermes.

Provides high-level delegation tools for AI coding platforms:
  delegate_to_platform  — send prompt to specific platform, wait for result
  delegate_to_best      — auto-select best platform and delegate

Platform MCP ports (ports 3210-3214 served by bridges/platforms/server.js):
  claude-code: 3210  |  codex: 3211  |  gemini-cli: 3212
  qwen-code: 3213    |  kimi-code: 3214
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from urllib.request import urlopen, Request
from urllib.error import URLError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Owner trust-on-first-use (TOFU) pairing
# ---------------------------------------------------------------------------
# Fractera's Hermes settings panel writes a one-time owner secret here when the
# user saves a Telegram bot token (see bridges/app .../api/config/hermes). It
# also surfaces a deep link  https://t.me/<bot>?start=<secret>  so the user can
# message their own bot in one tap. When that /start arrives, this hook
# auto-approves the sender as the owner — eliminating the manual
# "ask the bot owner to run `hermes pairing approve …`" pairing-code dance that
# blocked every first-time user. Everyone AFTER the owner still goes through the
# normal pairing flow, so the bot stays secure-by-default (terminal access).
OWNER_PAIRING_FILE = os.environ.get(
    "FRACTERA_OWNER_PAIRING_FILE", "/root/.hermes/fractera-owner-pairing.json"
)


def _read_owner_file() -> dict:
    try:
        with open(OWNER_PAIRING_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _write_owner_file(data: dict) -> None:
    try:
        tmp = f"{OWNER_PAIRING_FILE}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, OWNER_PAIRING_FILE)
    except OSError as exc:
        logger.warning("[fractera-platforms] could not persist owner-pairing file: %s", exc)


def _owner_pairing_hook(event=None, gateway=None, **kwargs):
    """pre_gateway_dispatch: auto-approve the owner on `/start <secret>`.

    Synchronous by contract — invoke_hook() never awaits callbacks — so the
    confirmation reply is scheduled on the running gateway event loop via
    create_task() and we return {"action": "skip"} (no pairing code, no agent
    turn). Any non-match returns None so the normal auth/pairing chain runs.
    """
    try:
        if event is None or gateway is None:
            return None
        source = getattr(event, "source", None)
        if source is None or getattr(source, "chat_type", None) != "dm":
            return None
        platform = getattr(source, "platform", None)
        platform_name = platform.value if platform is not None else ""
        if platform_name != "telegram":
            return None

        text = (getattr(event, "text", "") or "").strip()
        if not text.startswith("/start"):
            return None
        parts = text.split(maxsplit=1)
        payload = parts[1].strip() if len(parts) > 1 else ""
        if not payload:
            return None

        owner = _read_owner_file()
        secret = owner.get("secret")
        if not secret or owner.get("claimed"):
            return None  # no pending claim → fall through to normal pairing
        if payload != secret:
            return None  # wrong secret → normal pairing

        user_id = getattr(source, "user_id", None)
        if not user_id:
            return None

        # Approve the sender as an authorized user. _approve_user must run under
        # the store lock (see gateway/pairing.py).
        store = getattr(gateway, "pairing_store", None)
        if store is None:
            return None
        with store._lock:
            store._approve_user(platform_name, user_id, getattr(source, "user_name", "") or "")

        owner["claimed"] = True
        owner["owner_user_id"] = str(user_id)
        owner["claimed_at"] = time.time()
        _write_owner_file(owner)
        logger.info("[fractera-platforms] owner claimed via /start: user_id=%s", user_id)

        # Confirmation reply — scheduled on the gateway loop (we can't await here).
        adapter = gateway.adapters.get(platform) if hasattr(gateway, "adapters") else None
        if adapter is not None:
            msg = (
                "✅ You're connected — I now recognize you as the owner. "
                "Send me anything to get started.\n\n"
                "✅ Готово — теперь я узнаю вас как владельца. "
                "Напишите мне что угодно, чтобы начать."
            )
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(adapter.send(source.chat_id, msg))
            except RuntimeError:
                # No running loop (shouldn't happen inside the gateway) — skip
                # the confirmation; the user is approved regardless.
                pass

        return {"action": "skip", "reason": "fractera-owner-claimed"}
    except Exception as exc:  # never break the gateway pipeline
        logger.warning("[fractera-platforms] owner-pairing hook error: %s", exc)
        return None

PLATFORM_PORTS = {
    "claude-code": int(os.environ.get("CLAUDE_MCP_PORT", 3210)),
    "codex":       int(os.environ.get("CODEX_MCP_PORT",  3211)),
    "gemini-cli":  int(os.environ.get("GEMINI_MCP_PORT", 3212)),
    "qwen-code":   int(os.environ.get("QWEN_MCP_PORT",   3213)),
    "kimi-code":   int(os.environ.get("KIMI_MCP_PORT",   3214)),
}

_SECRET = os.environ.get("MCP_SECRET", "")
_POLL_S = 5
_MAX_POLLS = 60  # 5 minutes


def _mcp(port: int, tool: str, args: dict) -> dict:
    body = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {"name": tool, "arguments": args},
    }).encode()
    hdrs = {"Content-Type": "application/json"}
    if _SECRET:
        hdrs["Authorization"] = f"Bearer {_SECRET}"
    req = Request(f"http://127.0.0.1:{port}", data=body, headers=hdrs, method="POST")
    try:
        with urlopen(req, timeout=30) as resp:
            rpc = json.loads(resp.read())
            content = rpc.get("result", {}).get("content", [{}])
            text = content[0].get("text", "{}") if content else "{}"
            return json.loads(text)
    except (URLError, Exception) as exc:
        return {"error": str(exc)}


def _select(prompt: str, criteria: str) -> str:
    combined = (prompt + " " + criteria).lower()
    if any(k in combined for k in ("claude", "anthropic", "opus", "sonnet")):
        return "claude-code"
    if any(k in combined for k in ("codex", "openai", "gpt")):
        return "codex"
    if any(k in combined for k in ("gemini", "google")):
        return "gemini-cli"
    if any(k in combined for k in ("qwen", "alibaba")):
        return "qwen-code"
    if any(k in combined for k in ("kimi", "moonshot")):
        return "kimi-code"
    return "claude-code"


def _delegate(platform: str, prompt: str) -> str:
    port = PLATFORM_PORTS.get(platform)
    if not port:
        return json.dumps({"error": f"Unknown platform '{platform}'. Valid: {list(PLATFORM_PORTS)}"})

    start = _mcp(port, "send_prompt", {"prompt": prompt})
    task_id = start.get("task_id")
    if not task_id:
        return json.dumps({"error": f"Could not start task on {platform}", "detail": start})

    logger.info("[fractera-platforms] %s task_id=%s", platform, task_id)

    for _ in range(_MAX_POLLS):
        time.sleep(_POLL_S)
        resp = _mcp(port, "get_response", {"task_id": task_id})
        if resp.get("status") in ("done", "error", "cancelled"):
            return json.dumps({"platform": platform, **resp})

    _mcp(port, "cancel_task", {"task_id": task_id})
    return json.dumps({"platform": platform, "status": "timeout", "task_id": task_id})


_DELEGATE_SCHEMA = {
    "name": "delegate_to_platform",
    "description": (
        "Delegate a coding task to a specific AI platform and wait for the result. "
        "Use this when you want a particular agent (Claude, Codex, Gemini, Qwen, Kimi) "
        "to work on a task. Returns the platform's full response as JSON including "
        "`tokens` (total tokens the agent spent on this task) — pass that value to "
        "`record_deployment` after you deploy so the deployment log tracks real cost."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "platform": {
                "type": "string",
                "enum": list(PLATFORM_PORTS.keys()),
                "description": "Target AI coding platform.",
            },
            "prompt": {
                "type": "string",
                "description": "The task or question to send to the platform.",
            },
        },
        "required": ["platform", "prompt"],
    },
}

_BEST_SCHEMA = {
    "name": "delegate_to_best",
    "description": (
        "Automatically select the most suitable AI platform for a task and delegate to it. "
        "Analyses the prompt and optional criteria to pick between "
        "Claude Code, Codex, Gemini CLI, Qwen Code, and Kimi Code. "
        "Returns JSON including `platform` (the one chosen) and `tokens` (total tokens "
        "spent) — pass both to `record_deployment` after deploying."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "The coding task or question.",
            },
            "criteria": {
                "type": "string",
                "description": "Optional selection hints, e.g. 'use gemini' or 'prefer free tier'.",
            },
        },
        "required": ["prompt"],
    },
}


def register(ctx) -> None:
    ctx.register_tool(
        name="delegate_to_platform",
        toolset="fractera-platforms",
        schema=_DELEGATE_SCHEMA,
        handler=lambda args, **kw: _delegate(args["platform"], args["prompt"]),
        emoji="🤝",
    )
    ctx.register_tool(
        name="delegate_to_best",
        toolset="fractera-platforms",
        schema=_BEST_SCHEMA,
        handler=lambda args, **kw: _delegate(
            _select(args["prompt"], args.get("criteria", "")),
            args["prompt"],
        ),
        emoji="🎯",
    )
    # Owner trust-on-first-use: auto-approve the owner on `/start <secret>`
    # before the pairing-code flow can fire. See _owner_pairing_hook above.
    ctx.register_hook("pre_gateway_dispatch", _owner_pairing_hook)
