"use client";

import { useEffect, useState } from "react";
import type { CalRow, RowIntegration } from "../../../../_lib/components/calendar";
import type { Surface } from "../../../surface";
import { INTEGRATION_ICONS } from "../../../chrome/icons";
import SideDrawer from "../../../shared/side-drawer.client";
import Switch from "../../../chrome/switch.client";
import { pick } from "../../../shared/localized";
import type { Integration } from "../../integrations";
import { calendarStrings } from "../../i18n";

// ЯЩИК ИНТЕГРАЦИЙ ЗАПИСИ — то, что открывается по клику на синей строке дневного планера.
//
// ДВА ВХОДА, ОДИН ЯЩИК (владелец, шаг 292):
//   • клик по ИКОНКЕ канала  → `only = <ключ канала>`: в ящике одна запись — та, что уйдёт в этот канал;
//   • клик по ЗАГОЛОВКУ      → `only = null`: в ящике все объявленные каналы сразу, каждый со своим
//     переключателем активности, плюс «включить все» и «выключить все».
// Второго ящика заводить нельзя: это один и тот же объект, показанный с разной глубиной, и две
// реализации неизбежно разойдутся в том, что считается сохранённым.
//
// ПРАВКА — ТОЛЬКО У ВЛАДЕЛЬЦА (решение владельца). На витрине ящик открывается и читается: посетитель
// видит, что автоматизация умеет, но не переписывает текст, который уйдёт в чужой Telegram.
//
// ⚠ ОТПРАВКИ ПОКА НЕТ: здесь объявляют и правят содержимое, наружу оно ещё не уходит.
export default function IntegrationDrawer({
  row,
  table,
  integrations,
  only,
  surface,
  lang,
  onClose,
  onSaved,
}: {
  row: CalRow | null;
  table: string;
  integrations: Integration[];
  /** Ключ единственного показываемого канала, либо `null` — показать все. */
  only: string | null;
  surface: Surface;
  lang: string;
  onClose: () => void;
  onSaved: (row: CalRow) => void;
}) {
  const L = calendarStrings(lang);
  const editable = surface === "admin";
  const shown = only ? integrations.filter((i) => i.key === only) : integrations;

  // Черновик правки — копия записи, живущая, пока ящик открыт. Пишем в ядро только по «Сохранить»:
  // случайный клик по переключателю не должен уходить в файл.
  const [draft, setDraft] = useState<Record<string, RowIntegration>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDraft(row ? structuredClone(row.integrations) : {});
    setFailed(false);
  }, [row]);

  if (!row) return null;

  const valueOf = (key: string): RowIntegration => draft[key] ?? { active: false };
  const setValue = (key: string, patch: Partial<RowIntegration>) =>
    setDraft((d) => ({ ...d, [key]: { ...valueOf(key), ...patch } }));

  const setAll = (active: boolean) =>
    setDraft((d) => {
      const next = { ...d };
      for (const i of shown) next[i.key] = { ...(next[i.key] ?? { active }), active };
      return next;
    });

  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/rows`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ table, id: row!.id, set: { integrations: draft } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      onSaved({ ...row!, integrations: draft });
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SideDrawer open={Boolean(row)} title={`${row.time} · ${row.title}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{L.integrationsHint}</p>

        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{L.noIntegrations}</p>
        ) : (
          <>
            {/* «Все сразу» — только когда каналов показано больше одного: у единственного это шум. */}
            {editable && shown.length > 1 ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setAll(true)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">
                  {L.allOn}
                </button>
                <button type="button" onClick={() => setAll(false)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">
                  {L.allOff}
                </button>
              </div>
            ) : null}

            {shown.map((integration) => {
              const Icon = INTEGRATION_ICONS[integration.key];
              const value = valueOf(integration.key);
              return (
                <section key={integration.key} className="space-y-2 rounded-md border p-3" data-integration={integration.key}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
                      <span className="truncate">{pick(integration.label, lang) || integration.key}</span>
                    </span>
                    {editable ? (
                      <Switch
                        checked={Boolean(value.active)}
                        ariaLabel={L.active}
                        onCheckedChange={(v) => setValue(integration.key, { active: v })}
                      />
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">{value.active ? L.active : "—"}</span>
                    )}
                  </div>

                  {integration.fields.map((field) => {
                    const text = String(value[field.key] ?? "");
                    const label = pick(field.label, lang) || field.key;
                    return (
                      <label key={field.key} className="block space-y-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        {!editable ? (
                          <p className="whitespace-pre-line rounded-md border bg-muted/30 px-2 py-1 text-sm">{text || "—"}</p>
                        ) : field.type === "longtext" ? (
                          <textarea
                            value={text}
                            rows={3}
                            onChange={(e) => setValue(integration.key, { [field.key]: e.target.value })}
                            className="w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <input
                            value={text}
                            onChange={(e) => setValue(integration.key, { [field.key]: e.target.value })}
                            className="h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                        )}
                      </label>
                    );
                  })}
                </section>
              );
            })}
          </>
        )}

        {failed ? <p className="text-sm text-rose-700 dark:text-rose-400">{L.loadFailed}</p> : null}

        {editable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? L.saving : L.save}
            </button>
            <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
              {L.cancel}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{L.viewOnly}</p>
        )}
      </div>
    </SideDrawer>
  );
}
