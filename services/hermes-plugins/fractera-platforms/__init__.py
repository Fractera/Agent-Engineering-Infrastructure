"""Fractera AI Platforms plugin for Hermes.

Provides high-level delegation tools for AI coding platforms:
  delegate_to_platform  — send prompt to specific platform, wait for result
  delegate_to_best      — auto-select best platform and delegate

Platform MCP ports (ports 3210-3214 served by bridges/platforms/server.js):
  claude-code: 3210  |  codex: 3211  |  gemini-cli: 3212
  qwen-code: 3213    |  kimi-code: 3214
"""

from __future__ import annotations

import json
import logging
import os
import time
from urllib.request import urlopen, Request
from urllib.error import URLError

logger = logging.getLogger(__name__)

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
        "to work on a task. Returns the platform's full response."
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
        "Claude Code, Codex, Gemini CLI, Qwen Code, and Kimi Code."
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
