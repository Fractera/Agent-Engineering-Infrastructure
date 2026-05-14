#!/usr/bin/env python3
"""
Universal PostToolUse/AfterTool hook — auto-ingest docs/reports into Company Brain.
Works for: Codex, Gemini CLI, Kimi Code, Qwen Code.
Claude Code uses .claude/hooks/brain-ingest.py (same logic, separate file).

Set AGENT_IDENTITY env var to the platform name before calling:
  AGENT_IDENTITY=codex python3 .agent-hooks/brain-ingest.py
"""
import json, sys, os, subprocess, time

IDENTITY = os.environ.get("AGENT_IDENTITY", "agent")
APP_ROOT = "/opt/fractera/app"
WATCHED = ("/docs/", "/reports/", "glossary.md", "old-steps/")

try:
    data = json.load(sys.stdin)
except Exception:
    data = {}

targets = []

# Strategy 1: extract file_path from tool_input (Claude/Kimi/Qwen style)
ti = data.get("tool_input", {})
file_path = ti.get("file_path", "") or ti.get("path", "") or ti.get("filename", "")

if file_path and any(p in file_path for p in WATCHED) and os.path.isfile(file_path):
    targets.append(file_path)
else:
    # Strategy 2: scan for recently modified files in watched dirs (Codex/Gemini fallback)
    now = time.time()
    for watch_dir in ["docs", "reports", "old-steps"]:
        full_dir = os.path.join(APP_ROOT, watch_dir)
        if not os.path.isdir(full_dir):
            continue
        for root, _, files in os.walk(full_dir):
            for fname in files:
                if fname.startswith("."):
                    continue
                fpath = os.path.join(root, fname)
                try:
                    if os.path.getmtime(fpath) > now - 10:
                        targets.append(fpath)
                except Exception:
                    pass
    glossary = os.path.join(APP_ROOT, "glossary.md")
    try:
        if os.path.isfile(glossary) and os.path.getmtime(glossary) > now - 10:
            targets.append(glossary)
    except Exception:
        pass

for target in targets:
    try:
        with open(target, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if len(content.strip()) < 50:
            continue
        description = target.replace(APP_ROOT + "/", "")
        payload = json.dumps({"text": content, "description": description})
        subprocess.Popen(
            ["curl", "-s", "-X", "POST", "http://localhost:3002/api/rag/ingest",
             "-H", "Content-Type: application/json",
             "-H", f"X-Agent-Identity: {IDENTITY}",
             "-d", payload],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"[Brain] {IDENTITY}: queued ingest for {description}", file=sys.stderr)
    except Exception:
        pass
