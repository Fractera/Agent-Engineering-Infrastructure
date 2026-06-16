"""Fractera Access Control plugin for Hermes — runtime tier enforcement (MCP-REGISTRY §8.3/§8.6).

SECOND line of defense behind defense-by-construction. The owner Hermes and the (future)
public-consultant chat are SEPARATE agent processes, each with its own config + env. Each process
declares a tier CEILING via env `FRACTERA_AGENT_MAX_TIER` (owner | user | public; default owner).
This plugin registers a `pre_tool_call` hook that BLOCKS any tool whose required tier (from
mcp-access-manifest.json) exceeds this process's ceiling. A tool not in the manifest (third-party
MCP Hermes may install) requires 'owner' — strictest by default, so "ours vs theirs" is a rule.

Confirmed against the core (model_tools.py / hermes_cli/plugins.py):
  - pre_tool_call hook kwargs: tool_name, args, session_id, task_id, tool_call_id, turn_id, ...
  - to BLOCK, the hook returns {"action": "block", "message": "<reason>"}; else None.
The hook carries session_id but NOT identity; pre_gateway_dispatch carries identity but NOT
session_id — so there is no per-call identity join. The per-process ceiling needs none.

Per-USER distinction inside the public channel (anonymous vs authenticated end-user) is handled
later by data-scoping at the user-tier tools themselves (MCP-REGISTRY §8.3 point 3), not here.

Pure decision logic lives in access_policy.py (no Hermes imports, unit-testable).
"""
from __future__ import annotations

import logging

from . import access_policy

logger = logging.getLogger(__name__)

_manifest = access_policy.load_manifest()


def _pre_tool_call_gate(tool_name=None, args=None, **kwargs):
    """Block tools above this process's tier ceiling. Returns a block directive or None."""
    try:
        if not tool_name:
            return None
        allowed, need, ceiling = access_policy.evaluate(_manifest, tool_name)
        if allowed:
            return None
        return {
            "action": "block",
            "message": (
                f"Access denied: '{tool_name}' requires tier '{need}', but this agent runs at "
                f"tier '{ceiling}'. (Fractera access control, MCP-REGISTRY §8.3.)"
            ),
        }
    except Exception as exc:  # fail-open: never break the tool pipeline on a policy bug
        logger.warning("[fractera-access-control] gate error for %s: %s", tool_name, exc)
        return None


def register(ctx) -> None:
    ctx.register_hook("pre_tool_call", _pre_tool_call_gate)
    logger.info(
        "[fractera-access-control] loaded; ceiling=%s manifest_tools=%d",
        access_policy.agent_max_tier(), len(_manifest.get("tools", {})),
    )
