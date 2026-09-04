import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { readServerIp } from "@/lib/server-ip";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// The address of the GUEST APP as seen from outside this server — the answer to
// "what is this site's URL", used for canonical tags, sitemaps and robots.txt.
//
// Sibling of `publicDataUrl()` and built on the same rule: an address handed to
// someone else is resolved from THEIR point of view, never copied from our own
// configuration. Here the someone else is a search engine.
//
// 🔒 WHY THIS EXISTS AT ALL. App Settings shows Site URL, Canonical base and
// Sitemap URL as LOCKED fields, with the hint "follows this server's domain".
// The intent was written down (`DOMAIN_DERIVED` in app-settings/_lib/fields.ts)
// and never wired: nothing imported it, so the three fields stayed empty on
// every deployment. An empty site URL is not a cosmetic gap — the app's sitemap
// refuses to invent a host, so it returns NO urls at all, and robots.txt points
// at a path with no host. The site is then invisible to search engines while
// every page looks perfectly fine to a human.
export function publicAppUrl(): { url: string; mode: "domain" | "ip"; reason?: string } {
  // Secure mode: the app is published on the bare domain behind the certificate.
  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db
      .prepare("SELECT custom_domain, domain_status FROM site_settings WHERE id = 1")
      .get() as { custom_domain?: string | null; domain_status?: string } | undefined;
    db.close();
    if (row?.domain_status === "active" && row.custom_domain) {
      return { url: `https://${row.custom_domain}`, mode: "domain" };
    }
  } catch {
    // No settings table yet — a server that has never seen the domain wizard.
  }

  // IP mode (onboarding): the app answers on port 3000 of the server's own address.
  const ip = readServerIp();
  if (ip) return { url: `http://${ip}:3000`, mode: "ip" };

  return {
    url: "",
    mode: "ip",
    reason: "The server could not determine its own public address. Attach a domain first.",
  };
}

/**
 * Адрес ЧАТА (`:3600`) снаружи — брат `publicAppUrl()` и построен по тому же правилу
 * (BACKLOG 96-9, сделано 2026-09-04 по просьбе владельца).
 *
 * 🔒 АДРЕС ВЫВОДИТСЯ ИЗ ОДНОЙ БАЗЫ, А НЕ НАСТРАИВАЕТСЯ ОТДЕЛЬНО. Второе поле «адрес чата»
 * в конфиге разошлось бы с доменом при первой же его смене — и разошлось бы молча, потому
 * что кнопка продолжала бы вести куда-то. Поэтому здесь ровно те же два состояния, что у
 * приложения: домен есть → поддомен `chat.`; домена нет → IP и порт службы.
 *
 * 🔒 ПОДДОМЕН `chat` НЕ ПРИДУМАН ЗДЕСЬ, а взят из `SUBDOMAINS` (`lib/server-ip.ts`) — того же
 * списка, из которого берутся SAN-список сертификата, блоки nginx и проверка DNS. Вторая копия
 * имени поддомена дала бы кнопку в никуда на сервере, где сертификат выписан по первому списку.
 */
export function publicChatUrl(): { url: string; mode: "domain" | "ip"; reason?: string } {
  const base = publicAppUrl();
  if (!base.url) return { url: "", mode: base.mode, reason: base.reason };
  if (base.mode === "domain") {
    // `https://example.com` → `https://chat.example.com`
    return { url: base.url.replace(/^https:\/\//, "https://chat."), mode: "domain" };
  }
  // IP-режим: чат отвечает на своём порту того же адреса.
  return { url: base.url.replace(/:3000$/, ":3600"), mode: "ip" };
}

// ---- addresses that follow the server, not the typist --------------------------------
//
// The address of the app is a FACT of this deployment, not an opinion: it is whatever the
// domain panel has set up (or the IP, before a domain exists). Every field below is computed
// from that one base, so they cannot disagree with each other or go stale after a domain
// change.
//
// 🔒 APPLIED SERVER-SIDE, in `api/config/site` — not in the form. The panel is one writer of
// this config among several, and a rule enforced in a form is a rule the next writer skips.
// It lived here as a table nobody called for exactly that reason.
export const DOMAIN_DERIVED: Record<string, (base: string) => string> = {
  url: (base) => base,
  "seo.canonicalBase": (base) => base,
  "seo.sitemapUrl": (base) => `${base}/sitemap.xml`,
};

const CONFIG_PATH = process.env.APP_CONFIG_PATH ?? "/opt/fractera/app/APP-CONFIG/app-config.json";

/**
 * Rewrite the addresses inside the app's config FILE to match this server.
 *
 * Called after a domain activation: the app reads the file, not the panel, so without this
 * the site keeps advertising the address it had before the domain — and a canonical tag
 * pointing at an address the site no longer serves on is worse than none at all.
 *
 * Creates the file if it is absent (a fresh server has never saved settings): the app deep-
 * merges it over the code defaults, so a config holding only the addresses is valid.
 */
export function rewriteAppAddresses(): { ok: boolean; url: string } {
  const { url } = publicAppUrl();
  if (!url) return { ok: false, url: "" };

  const existing = fs.existsSync(CONFIG_PATH)
    ? (JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>)
    : {};
  const next = applyDerivedAddresses(existing);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  return { ok: true, url };
}

/** Write the derived addresses over whatever the caller sent. Returns a new object. */
export function applyDerivedAddresses<T extends Record<string, unknown>>(config: T): T {
  const { url: base } = publicAppUrl();
  if (!base) return config; // address unknown — leave the config untouched rather than guess

  const out: Record<string, unknown> = { ...config };
  // `dotPath`, not `path` — the node module of that name is imported above, and shadowing it
  // here would silently break `rewriteAppAddresses` the first time someone moved code around.
  for (const [dotPath, derive] of Object.entries(DOMAIN_DERIVED)) {
    const keys = dotPath.split(".");
    let cur = out;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      const next = cur[k];
      cur[k] = next && typeof next === "object" && !Array.isArray(next) ? { ...(next as object) } : {};
      cur = cur[k] as Record<string, unknown>;
    }
    cur[keys[keys.length - 1]] = derive(base);
  }
  return out as T;
}
