"use client";

// THE PTY URL (step 255.B1) — where the projects dev console reaches the interactive terminal bridge
// (:3201). Mirrors bridges/app/lib/runtime-urls.ts (ptyUrl only — the one URL this app needs):
//   IP / localhost mode: ws://<host>:3201/bridge/
//   Domain / secure mode: wss://admin.<apex>/ws/pty/bridge/ (nginx path-proxy under the admin cert).
const KNOWN_PREFIXES = ["projects", "admin", "auth", "design", "data", "hermes", "lightrag", "www"];

export function ptyUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:3201/bridge/";
  const { protocol, hostname } = window.location;
  const ws = protocol === "https:" ? "wss:" : "ws:";
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
  if (isIp) return `${ws}//${hostname}:3201/bridge/`;
  const labels = hostname.split(".");
  const apex = KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
  return `${ws}//admin.${apex}/ws/pty/bridge/`;
}
