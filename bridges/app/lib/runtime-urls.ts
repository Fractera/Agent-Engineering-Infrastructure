"use client";

import { useState, useEffect } from "react";

type RuntimeUrls = {
  authUrl: string;
  appUrl: string;
  mediaUrl: string;
  adminUrl: string;
};

const DEFAULTS: RuntimeUrls = {
  authUrl: "http://localhost:3001",
  appUrl: "http://localhost:3000",
  mediaUrl: "http://localhost:3300",
  adminUrl: "http://localhost:3002",
};

// Service subdomain prefixes — used to recover the apex from any service host
// (e.g. admin.aifa.dev → aifa.dev) in domain/Secure mode.
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "chat"]; // "chat" — восьмая служба, шаг 96

function compute(): RuntimeUrls {
  if (typeof window === "undefined") return DEFAULTS;
  const { protocol, hostname } = window.location;

  // IP / localhost (demo) mode — same host, service-specific ports.
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
  if (isIp) {
    return {
      authUrl: `${protocol}//${hostname}:3001`,
      appUrl: `${protocol}//${hostname}:3000`,
      mediaUrl: `${protocol}//${hostname}:3300`,
      adminUrl: `${protocol}//${hostname}:3002`,
    };
  }

  // Domain / Secure mode — sibling subdomains on standard 443, no ports.
  const labels = hostname.split(".");
  const apex = KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
  const admin = `admin.${apex}`;
  return {
    authUrl: `${protocol}//auth.${apex}`,
    appUrl: `${protocol}//${apex}`,
    mediaUrl: `${protocol}//data.${apex}`,
    adminUrl: `${protocol}//${admin}`,
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
