"""LightRAG memory plugin for Hermes Agent (Fractera Company Brain).

Provides cross-session memory via the LightRAG backend running locally.
Each conversation turn is ingested asynchronously; relevant context is
fetched before each LLM call via hybrid graph + vector search.

Config (read from ~/.hermes/.env):
  LIGHTRAG_URL      — LightRAG server URL (default: http://localhost:9621)
  LIGHTRAG_API_KEY  — API key matching LIGHTRAG_API_KEY in services/rag/.env
"""

from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any, Dict, List
from urllib.request import urlopen, Request
from urllib.error import URLError

from agent.memory_provider import MemoryProvider

logger = logging.getLogger(__name__)

_URL = os.environ.get("LIGHTRAG_URL", "http://localhost:9621").rstrip("/")
_KEY = os.environ.get("LIGHTRAG_API_KEY", "")


def _post(path: str, body: dict, timeout: int = 20) -> dict | None:
    try:
        data = json.dumps(body).encode()
        req = Request(
            f"{_URL}{path}",
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": _KEY,
                "X-Agent-Identity": "hermes",
            },
            method="POST",
        )
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except (URLError, Exception) as exc:
        logger.debug("[lightrag-memory] POST %s failed: %s", path, exc)
        return None


class LightRagMemoryProvider(MemoryProvider):
    """Hermes memory backed by Fractera Company Brain (LightRAG)."""

    @property
    def name(self) -> str:
        return "lightrag-memory"

    def is_available(self) -> bool:
        return bool(_URL)

    def initialize(self, session_id: str, **kwargs) -> None:
        self._session_id = session_id
        self._platform = kwargs.get("platform", "cli")
        logger.info("[lightrag-memory] initialized session=%s platform=%s", session_id, self._platform)

    def system_prompt_block(self) -> str:
        return (
            "Your architectural decisions, past feedback, and project knowledge are stored in "
            "the Fractera Company Brain. Relevant context is injected before each turn via "
            "<brain_context> tags. Treat it as the authoritative source on project state."
        )

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        if not query.strip():
            return ""
        result = _post("/query", {"query": query[:800], "mode": "hybrid"}, timeout=15)
        if not result:
            return ""
        text = result.get("response") or result.get("answer") or ""
        if not text or len(text.strip()) < 20:
            return ""
        return f"<brain_context>\n{text.strip()}\n</brain_context>"

    def sync_turn(self, user_content: str, assistant_content: str, *, session_id: str = "") -> None:
        if not (user_content.strip() or assistant_content.strip()):
            return

        def _ingest() -> None:
            doc = (
                f"# Hermes decision log\n"
                f"**Session:** {self._session_id}\n\n"
                f"## User prompt\n{user_content}\n\n"
                f"## Hermes response\n{assistant_content}"
            )
            _post("/documents/text", {
                "text": doc,
                "description": (
                    f"hermes-memory | session={self._session_id} | platform={self._platform}"
                ),
            }, timeout=30)

        threading.Thread(target=_ingest, daemon=True).start()

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        return []  # context-only — no explicit LLM tools

    def shutdown(self) -> None:
        pass


def register(ctx) -> None:
    ctx.register_memory_provider(LightRagMemoryProvider())
