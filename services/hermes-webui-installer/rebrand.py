#!/usr/bin/env python3
"""Idempotent Fractera rebrand for nesquena/hermes-webui.

Patches:
  - static/index.html  — <title>, apple-mobile-web-app-title, remove SVG favicon,
                          replace caduceus SVG in .empty-logo with Fractera <img>
  - static/manifest.json — name, short_name, description; drop SVG icon entry
  - static/{boot,messages,panels,sessions}.js — 'Hermes' string fallbacks → 'Fractera'

Each patch detects if it has already been applied and skips. Run any
number of times — only modifies files when changes are actually needed.

Usage:
  python3 rebrand.py --target /opt/hermes-webui
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys


def patch_index_html(target: pathlib.Path) -> int:
    f = target / "static" / "index.html"
    if not f.exists():
        print(f"  [skip] {f} not found", file=sys.stderr)
        return 0
    text = f.read_text()
    orig = text
    changes = 0

    # 1) <title>
    if "<title>Hermes</title>" in text:
        text = text.replace("<title>Hermes</title>", "<title>Fractera</title>")
        changes += 1

    # 2) apple-mobile-web-app-title
    needle = 'apple-mobile-web-app-title" content="Hermes"'
    repl = 'apple-mobile-web-app-title" content="Fractera"'
    if needle in text:
        text = text.replace(needle, repl)
        changes += 1

    # 3) Remove SVG favicon link (we ship no Fractera SVG version)
    svg_line = '<link rel="icon" type="image/svg+xml" href="static/favicon.svg">\n'
    if svg_line in text:
        text = text.replace(svg_line, "")
        changes += 1

    # 4) Replace caduceus SVG inside .empty-logo with Fractera <img>
    old_open = ('<div class="empty-logo"><svg xmlns="http://www.w3.org/2000/svg" '
                'viewBox="0 0 64 64" width="80" height="80" aria-label="Hermes caduceus">')
    end_marker = "</svg></div>"
    start = text.find(old_open)
    if start >= 0:
        end_rel = text[start:].find(end_marker)
        if end_rel >= 0:
            end = start + end_rel + len(end_marker)
            new_block = (
                '<div class="empty-logo">'
                '<img src="static/fractera-logo.png" width="80" height="80" '
                'alt="Fractera" style="border-radius:16px;display:block;" />'
                "</div>"
            )
            text = text[:start] + new_block + text[end:]
            changes += 1

    if text != orig:
        f.write_text(text)
    print(f"  index.html: {changes} changes applied")
    return changes


def patch_manifest(target: pathlib.Path) -> int:
    m = target / "static" / "manifest.json"
    if not m.exists():
        print(f"  [skip] {m} not found", file=sys.stderr)
        return 0
    manifest = json.loads(m.read_text())
    changed = False

    if manifest.get("name") != "Fractera":
        manifest["name"] = "Fractera"
        manifest["short_name"] = "Fractera"
        manifest["description"] = "Fractera AI workspace"
        changed = True

    icons_before = len(manifest.get("icons", []))
    manifest["icons"] = [
        ic for ic in manifest.get("icons", []) if not ic.get("src", "").endswith(".svg")
    ]
    if len(manifest["icons"]) != icons_before:
        changed = True

    if changed:
        m.write_text(json.dumps(manifest, indent=2))
    print(f"  manifest.json: name={manifest.get('name')}, icons={len(manifest['icons'])}, "
          f"{'patched' if changed else 'already ok'}")
    return 1 if changed else 0


def patch_js_fallbacks(target: pathlib.Path) -> int:
    files = ["boot.js", "messages.js", "panels.js", "sessions.js"]
    # Order matters — longer patterns first to avoid partial matches.
    patches = [
        ("name=window._botName||'Hermes';", "name=window._botName||'Fractera';"),
        ("window._botName=s.bot_name||'Hermes';", "window._botName=s.bot_name||'Fractera';"),
        ("window._botName='Hermes';", "window._botName='Fractera';"),
        ("window._botName||'Hermes'", "window._botName||'Fractera'"),
        ("settings.bot_name||'Hermes'", "settings.bot_name||'Fractera'"),
        ("body.bot_name||'Hermes'", "body.bot_name||'Fractera'"),
        ("botName||'Hermes'", "botName||'Fractera'"),
        ("bot_name||'Hermes'", "bot_name||'Fractera'"),
    ]
    total = 0
    for fname in files:
        p = target / "static" / fname
        if not p.exists():
            continue
        t = p.read_text()
        orig = t
        hits = 0
        for old, new in patches:
            c = t.count(old)
            if c:
                t = t.replace(old, new)
                hits += c
        if t != orig:
            p.write_text(t)
        total += hits
        print(f"  {fname}: {hits} fallbacks patched")
    return total


PROVIDER_FILTER_MARKER = "// fractera:provider-filter v1"
PROVIDER_FILTER_SNIPPET = """
// fractera:provider-filter v1
// Hide providers without configured credentials from the WebUI. Auth lives
// in the original Hermes agent panel (hermes.<sub>.fractera.ai/env); WebUI
// should only surface providers the user has actually signed into. Done by
// wrapping fetch() so any GET /api/providers response is filtered to
// has_key === true entries before the UI sees it. Idempotent — guarded by
// the marker above; the rebrander skips a re-write when the marker exists.
(function () {
  if (typeof window === 'undefined' || !window.fetch) return;
  var _origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url) || '';
    if (typeof url !== 'string' || url.indexOf('/api/providers') === -1) {
      return _origFetch(input, init);
    }
    // Only filter the bare list endpoint, not /api/provider/quota etc.
    var u;
    try { u = new URL(url, window.location.origin); } catch (_) { return _origFetch(input, init); }
    if (u.pathname !== '/api/providers') return _origFetch(input, init);
    return _origFetch(input, init).then(function (res) {
      if (!res.ok) return res;
      return res.clone().json().then(function (data) {
        try {
          var list = Array.isArray(data) ? data : (data && Array.isArray(data.providers) ? data.providers : null);
          if (!list) return res;
          var filtered = list.filter(function (p) { return p && p.has_key === true; });
          var body = Array.isArray(data) ? filtered : Object.assign({}, data, { providers: filtered });
          return new Response(JSON.stringify(body), { status: res.status, statusText: res.statusText, headers: res.headers });
        } catch (_) { return res; }
      }).catch(function () { return res; });
    });
  };
})();
"""


def patch_provider_filter(target: pathlib.Path) -> int:
    """Prepend a fetch() wrapper to boot.js that hides non-authed providers.

    Auth happens in the original Hermes agent (`hermes.<sub>.fractera.ai/env`,
    OAuth for Codex / Claude Code). WebUI just consumes the credential pool
    via /api/providers — we filter that list client-side so the user never
    sees a provider they haven't signed into. Defensive: avoids editing
    panels.js whose line layout shifts between versions.
    """
    f = target / "static" / "boot.js"
    if not f.exists():
        print(f"  [skip] {f} not found", file=sys.stderr)
        return 0
    text = f.read_text()
    if PROVIDER_FILTER_MARKER in text:
        print("  provider-filter: already applied, skipping")
        return 0
    # Prepend — boot.js runs before any other module; the wrapper installs
    # before the UI's first fetch.
    f.write_text(PROVIDER_FILTER_SNIPPET.lstrip() + "\n" + text)
    print("  provider-filter: installed in boot.js")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Fractera rebrand for hermes-webui")
    parser.add_argument(
        "--target",
        required=True,
        help="Path to hermes-webui install dir (e.g. /opt/hermes-webui)",
    )
    args = parser.parse_args()
    target = pathlib.Path(args.target)
    if not (target / "static" / "index.html").exists():
        print(f"FATAL: {target} does not look like a hermes-webui install", file=sys.stderr)
        return 1

    print(f"Fractera rebrand → {target}")
    patch_index_html(target)
    patch_manifest(target)
    patch_js_fallbacks(target)
    patch_provider_filter(target)
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
