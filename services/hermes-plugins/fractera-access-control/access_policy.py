"""Pure access-policy logic for Fractera L2-MCP tools. NO Hermes imports — unit-testable.

Reads the authoritative manifest (bridges/platforms/mcp-access-manifest.json): per tool
{tier, first_party, mutating}. Decides whether a requester of a given tier may call a tool.

Tier order is cumulative: public <= user <= owner (MCP-REGISTRY §8.3). A tool NOT in the
manifest (i.e. not first-party Fractera — e.g. a future third-party MCP Hermes installs) gets
the STRICTEST default: owner-only. That is how "ours vs theirs" is enforced — unknown ⇒ locked.
"""
from __future__ import annotations
import json
import os

TIER_ORDER = {"public": 0, "user": 1, "owner": 2}

DEFAULT_MANIFEST = os.environ.get(
    "FRACTERA_MCP_MANIFEST",
    "/opt/fractera/bridges/platforms/mcp-access-manifest.json",
)


def load_manifest(path: str | None = None) -> dict:
    try:
        with open(path or DEFAULT_MANIFEST, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def canonical_tool_name(manifest: dict, tool_name: str) -> str:
    """Map the name the agent calls back to a manifest key.

    Hermes exposes MCP tools to the model PREFIXED as ``mcp_<server>_<tool>`` (e.g.
    ``mcp_client_actions_bridge_public_view_set_theme``), but the manifest is keyed by the
    bare tool name (``public_view_set_theme``). So an exact lookup misses every MCP tool and
    the strict default (owner-only) would wrongly block them for a sub-owner process. Resolve
    by exact match first, else the manifest key that the called name ends with (``_<key>``),
    longest key wins to avoid a short key shadowing a longer one. Non-MCP core tools (clarify,
    execute_code, …) and genuine unknowns match nothing → stay owner-only by default.
    """
    tools = manifest.get("tools") or {}
    if tool_name in tools:
        return tool_name
    best = ""
    for key in tools:
        if tool_name == key or tool_name.endswith("_" + key):
            if len(key) > len(best):
                best = key
    return best or tool_name


def _tool_entry(manifest: dict, tool_name: str) -> dict | None:
    return (manifest.get("tools") or {}).get(canonical_tool_name(manifest, tool_name))


def required_tier(manifest: dict, tool_name: str) -> str:
    """Tier needed to call a tool. Unknown / non-first-party ⇒ 'owner' (strictest)."""
    e = _tool_entry(manifest, tool_name)
    if not e or not e.get("first_party"):
        return "owner"
    return e.get("tier", "owner")


def is_tool_allowed(manifest: dict, tool_name: str, requester_tier: str) -> bool:
    req = TIER_ORDER.get(requester_tier, -1)
    need = TIER_ORDER.get(required_tier(manifest, tool_name), 2)
    return req >= need


def is_mutating(manifest: dict, tool_name: str) -> bool:
    e = _tool_entry(manifest, tool_name)
    return bool(e and e.get("mutating"))


def tier_satisfies(required_tier: str, ceiling_tier: str) -> bool:
    """True if an agent whose ceiling is `ceiling_tier` may call a `required_tier` tool."""
    return TIER_ORDER.get(ceiling_tier, -1) >= TIER_ORDER.get(required_tier, 2)


# Per-PROCESS tier ceiling. Enforcement is by construction at the agent level: the owner
# Hermes and the (future) public-consultant chat are SEPARATE agent processes, each launched
# with its own config + env. The owner process runs at ceiling 'owner' (all tools); the
# public-consultant process at 'user' (no owner tools). Confirmed against the core: the
# pre_tool_call hook carries session_id but NOT identity, and pre_gateway_dispatch carries
# identity but NOT session_id — so there is no per-call identity join. A per-process ceiling
# needs none: it blocks any tool whose required tier exceeds this process's ceiling.
DEFAULT_CEILING = "owner"


def agent_max_tier() -> str:
    t = (os.environ.get("FRACTERA_AGENT_MAX_TIER") or DEFAULT_CEILING).strip().lower()
    return t if t in TIER_ORDER else DEFAULT_CEILING


def evaluate(manifest: dict, tool_name: str, ceiling_tier: str | None = None):
    """Decide whether this agent process may run `tool_name`.

    Returns (allowed: bool, required_tier: str, ceiling: str). Strictest-by-default: a tool not
    in the manifest (non-first-party / third-party MCP Hermes may install) needs 'owner'.
    """
    ceiling = ceiling_tier or agent_max_tier()
    need = required_tier(manifest, tool_name)
    return tier_satisfies(need, ceiling), need, ceiling
