"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CalRow, RowIntegration } from "../../../../_lib/components/calendar";
import type { Surface } from "../../../surface";
import { INTEGRATION_ICONS } from "../../../chrome/icons";
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
    <Sheet open={Boolean(row)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-96 max-w-[90vw] gap-0 overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle className="truncate text-sm font-medium">{`${row.time} · ${row.title}`}</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-4">
        <p className="text-xs text-muted-foreground">{L.integrationsHint}</p>

        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{L.noIntegrations}</p>
        ) : (
          <>
            {/* «Все сразу» — только когда каналов показано больше одного: у единственного это шум. */}
            {editable && shown.length > 1 ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="xs" onClick={() => setAll(true)}>
                  {L.allOn}
                </Button>
                <Button type="button" variant="outline" size="xs" onClick={() => setAll(false)}>
                  {L.allOff}
                </Button>
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
                        aria-label={L.active}
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
                      <Label key={field.key} className="block space-y-1 font-normal">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        {!editable ? (
                          <p className="whitespace-pre-line rounded-md border bg-muted/30 px-2 py-1 text-sm">{text || "—"}</p>
                        ) : field.type === "longtext" ? (
                          <Textarea
                            value={text}
                            rows={3}
                            onChange={(e) => setValue(integration.key, { [field.key]: e.target.value })}
                          />
                        ) : (
                          <Input
                            value={text}
                            onChange={(e) => setValue(integration.key, { [field.key]: e.target.value })}
                          />
                        )}
                      </Label>
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
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? L.saving : L.save}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {L.cancel}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{L.viewOnly}</p>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
