"use client";

// Client-side service URL derivation for the Shell app, based on the host the
// browser is actually on. Mirrors bridges/app/lib/runtime-urls.ts. We do NOT
// read NEXT_PUBLIC_* here: those are baked at build time and stay empty/stale
// across the IP→domain (Secure mode) switch, which has no app rebuild. Deriving
// from window.location works in both modes with one build.
//
// - IP / localhost (insecure mode): same host, service-specific ports.
// - Domain (Secure mode): sibling subdomains on 443, no ports. Building
//   `<host>:3001` on a domain yields https://admin.<domain>:3001 →
//   ERR_SSL_PROTOCOL_ERROR (3001 has no TLS).

// Service subdomain prefixes — used to recover the apex from any service host
// (e.g. admin.aifa.dev → aifa.dev) in domain/Secure mode.
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "hermes", "lightrag"];

function isIpHost(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
}

function apexFrom(hostname: string): string {
  const labels = hostname.split(".");
  return KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
}

// Public base URL of the Auth service as the BROWSER must reach it.
export function authBase(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  const { protocol, hostname } = window.location;
  if (isIpHost(hostname)) return `${protocol}//${hostname}:3001`;
  return `${protocol}//auth.${apexFrom(hostname)}`;
}

// Public base URL of the Admin/Bridges service as the BROWSER must reach it.
export function adminBase(): string {
  if (typeof window === "undefined") return "http://localhost:3002";
  const { protocol, hostname } = window.location;
  if (isIpHost(hostname)) return `${protocol}//${hostname}:3002`;
  return `${protocol}//admin.${apexFrom(hostname)}`;
}

// Build the auth redirect for an unauthorized click on a protected destination.
// `requireRole` lets the auth form know whether the target needs admin (Start
// Coding → admin panel) or just any authenticated user (Dashboard).
export function registerRedirectUrl(callbackUrl: string, requireRole: "user" | "admin"): string {
  const url = new URL(`${authBase()}/register`);
  url.searchParams.set("callbackUrl", callbackUrl);
  url.searchParams.set("requireRole", requireRole);
  return url.toString();
}
