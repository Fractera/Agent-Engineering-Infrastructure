"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assistantStrings } from "../i18n";

// АККОРДЕОН «ДОСТУП» (шаг 309, требование владельца) — какие РОЛИ видят РЕАЛЬНУЮ автоматизацию на
// ПУБЛИЧНОМ приложении (3000), а не превью. Пишет прямо в паспорт (`passport.access: Role[]`) дверью
// `api/patch` (address {object:"passport"}); публичный слой (`api/projects/public-catalog`) читает этот
// список и гейтит тело. Пустой список = полностью публично (как было). Словарь ролей — общий (RoleSchema).
export const PUBLIC_FACING_ROLES = [
  "guest", "user", "buyer", "vip_user",
  "subscriber_lite", "subscriber_standard", "subscriber_max",
] as const;

const ROLE_LABEL: Record<string, string> = {
  guest: "Guest", user: "User", buyer: "Buyer", vip_user: "VIP",
  subscriber_lite: "Subscriber Lite", subscriber_standard: "Subscriber Standard", subscriber_max: "Subscriber Max",
};

export default function AccessRoles({ access, lang }: { access: string[]; lang: string }) {
  const L = assistantStrings(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<string[]>(Array.isArray(access) ? access : []);

  async function save(next: string[]) {
    setRoles(next);
    setBusy(true);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { access: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      router.refresh();
    } catch {
      /* оставляем локальный выбор */
    } finally {
      setBusy(false);
    }
  }

  const toggle = (role: string) =>
    save(roles.includes(role) ? roles.filter((x) => x !== role) : [...roles, role]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{L.access}</label>
      <p className="text-xs text-muted-foreground">{L.accessHint}</p>
      <p className="text-xs">
        {roles.length === 0 ? (
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">{L.accessPublic}</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {PUBLIC_FACING_ROLES.map((role) => {
          const on = roles.includes(role);
          return (
            <button
              key={role}
              type="button"
              disabled={busy}
              onClick={() => toggle(role)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {ROLE_LABEL[role] ?? role}
            </button>
          );
        })}
      </div>
    </div>
  );
}
