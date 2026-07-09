"use client";

import { useState, useEffect } from "react";

type RuntimeUrls = {
  authUrl: string;
  appUrl: string;
  mediaUrl: string;
  adminUrl: string;
  bridgeUrl: string;
  ptyUrl: string;
  claudeUrl: string;
  codexUrl: string;
  geminiUrl: string;
  qwenUrl: string;
  kimiUrl: string;
  hermesUrl: string;
  brainUrl: string;
};

const DEFAULTS: RuntimeUrls = {
  authUrl: "http://localhost:3001",
  appUrl: "http://localhost:3000",
  mediaUrl: "http://localhost:3300",
  adminUrl: "http://localhost:3002",
  bridgeUrl: "ws://localhost:3201/bridge/",
  ptyUrl: "ws://localhost:3201/bridge/",
  claudeUrl: "ws://localhost:3200/",
  codexUrl: "ws://localhost:3202/",
  geminiUrl: "ws://localhost:3203/",
  qwenUrl: "ws://localhost:3204/",
  kimiUrl: "ws://localhost:3205/",
  hermesUrl: "http://localhost:9119",
  brainUrl: "http://localhost:9621",
};

// Service subdomain prefixes — used to recover the apex from any service host
// (e.g. admin.aifa.dev → aifa.dev) in domain/Secure mode.
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "hermes", "lightrag"];

function compute(): RuntimeUrls {
  if (typeof window === "undefined") return DEFAULTS;
  const { protocol, hostname } = window.location;
  const ws = protocol === "https:" ? "wss:" : "ws:";

  // IP / localhost (demo) mode — same host, service-specific ports.
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
  if (isIp) {
    return {
      authUrl: `${protocol}//${hostname}:3001`,
      appUrl: `${protocol}//${hostname}:3000`,
      mediaUrl: `${protocol}//${hostname}:3300`,
      adminUrl: `${protocol}//${hostname}:3002`,
      bridgeUrl: `${ws}//${hostname}:3201/bridge/`,
      ptyUrl: `${ws}//${hostname}:3201/bridge/`,
      claudeUrl: `${ws}//${hostname}:3200/`,
      codexUrl: `${ws}//${hostname}:3202/`,
      geminiUrl: `${ws}//${hostname}:3203/`,
      qwenUrl: `${ws}//${hostname}:3204/`,
      kimiUrl: `${ws}//${hostname}:3205/`,
      // Brain (Hermes agent :9119) binds 127.0.0.1 ONLY and refuses a public bind
      // (June-2026 vendor hardening). With no nginx in IP mode, hitting :9119 direct
      // is refused (grey card), so we go through the bridge reverse proxy on :9118
      // (bridges/platforms/server.js) which rewrites Host → 127.0.0.1:9119. (step 207.15)
      hermesUrl: `${protocol}//${hostname}:9118`,
      brainUrl: `${protocol}//${hostname}:9621`,
    };
  }

  // Domain / Secure mode — sibling subdomains on standard 443, no ports.
  // Bridge WebSockets are proxied (wss) under the cert-covered admin host,
  // path-based (nginx maps /ws/<name>/ → 127.0.0.1:<port>). The PTY bridge
  // (/ws/pty/bridge/) drives every terminal; /ws/claude/ is the online check.
  const labels = hostname.split(".");
  const apex = KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
  const admin = `admin.${apex}`;
  return {
    authUrl: `${protocol}//auth.${apex}`,
    appUrl: `${protocol}//${apex}`,
    mediaUrl: `${protocol}//data.${apex}`,
    adminUrl: `${protocol}//${admin}`,
    bridgeUrl: `${ws}//${admin}/ws/pty/bridge/`,
    ptyUrl: `${ws}//${admin}/ws/pty/bridge/`,
    claudeUrl: `${ws}//${admin}/ws/claude/`,
    codexUrl: `${ws}//${admin}/ws/codex/`,
    geminiUrl: `${ws}//${admin}/ws/gemini/`,
    qwenUrl: `${ws}//${admin}/ws/qwen/`,
    kimiUrl: `${ws}//${admin}/ws/kimi/`,
    hermesUrl: `${protocol}//hermes.${apex}`,
    brainUrl: `${protocol}//lightrag.${apex}`,
  };
}

export function useRuntimeUrls(): RuntimeUrls {
  // Lazy init so the FIRST render already uses window.location, not the
  // localhost fallback. fetch() calls in the same render cycle would
  // otherwise hit localhost on the user's machine and fail (carousel grey,
  // Hermes empty). This is a client-only component so window is always
  // defined here at runtime, even though TS doesn't know it.
  const [urls, setUrls] = useState<RuntimeUrls>(() => compute());
  useEffect(() => { setUrls(compute()); }, []);
  return urls;
}

export function getRuntimeUrls(): RuntimeUrls {
  return compute();
}
