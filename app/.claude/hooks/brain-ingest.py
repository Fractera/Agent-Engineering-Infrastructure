#!/usr/bin/env python3
"""
PostToolUse hook — auto-ingest docs/reports into Company Brain.
Fires after every Write or Edit. Only acts on docs/, reports/, glossary.md.
"""
import json, sys, os, subprocess

try:
    data = json.load(sys.stdin)
    file_path = data.get("tool_input", {}).get("file_path", "")
except Exception:
    sys.exit(0)

WATCHED = ("/docs/", "/reports/", "glossary.md", "old-steps/")
if not any(p in file_path for p in WATCHED):
    sys.exit(0)

if not os.path.isfile(file_path):
    sys.exit(0)

try:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
except Exception:
    sys.exit(0)

if len(content.strip()) < 50:
    sys.exit(0)

description = file_path.replace("/opt/fractera/app/", "")
payload = json.dumps({"text": content, "description": description})

subprocess.Popen(
    ["curl", "-s", "-X", "POST", "http://localhost:3002/api/rag/ingest",
     "-H", "Content-Type: application/json",
     "-H", "X-Agent-Identity: claude",
     "-d", payload],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

print(f"[Brain] queued ingest: {description}")
