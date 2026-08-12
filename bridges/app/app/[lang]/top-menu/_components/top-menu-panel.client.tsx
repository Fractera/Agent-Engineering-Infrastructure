"use client";

import { useState } from "react";
import { GripVertical, Trash2, CornerDownRight, ArrowUpLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { valueForLang, hasTranslation, setTranslation, type I18nMap } from "@/lib/per-lang";
import type { NavItem, NavState, RouteCandidate } from "../_lib/types";
import { LangStrip } from "./lang-strip.client";

// Островок настройки верхнего меню. Слова приезжают пропсами — словарь
// серверный (закон шага 501: 82 языка в браузер не уезжают).
//
// 🔒 ПЕРЕТАСКИВАНИЕ — НА РОДНЫХ СОБЫТИЯХ БРАУЗЕРА, без библиотеки. Список здесь
// короткий (пункты меню, а не тысяча строк), а лишняя зависимость в панели
// живёт годами и обновляется вручную.
//
// 🔒 ВЛОЖЕННОСТЬ РОВНО ОДНА. «Вкладка может стать группой вкладок» — это FES, и
// там второго уровня нет. Разрешить третий значит показать посетителю меню,
// которое не помещается на телефоне.

export type Labels = {
  candidates: string; add: string; empty: string; dragHint: string;
  labelPlaceholder: string; makeChild: string; makeTop: string; remove: string;
  save: string; saving: string; savedNow: string; savedLater: string; failed: string;
  authSide: string; authLeft: string; authRight: string;
  baseLang: string; translated: string; notTranslated: string; langHint: string;
};

const rid = () => Math.random().toString(36).slice(2, 8);
const key = (id: string) => `nav.top.${id}.label`;

export function TopMenuPanel(
  { initial, candidates, labels, langs, base, initialI18n }:
  {
    initial: NavState; candidates: RouteCandidate[]; labels: Labels;
    langs: string[]; base: string; initialI18n: I18nMap;
  },
) {
  const [items, setItems] = useState<NavItem[]>(initial.top);
  const [authSide, setAuthSide] = useState<"left" | "right">(initial.authSide);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [editLang, setEditLang] = useState(base);
  const [i18n, setI18n] = useState<I18nMap>(initialI18n);

  // Языки, у которых записан хоть один перевод подписи, — для отметки в полосе.
  const done = new Set(
    langs.filter((l) => items.some((it) => hasTranslation(i18n, key(it.id), l))),
  );

  /** Что показать в поле подписи: на языке-основе — само значение, иначе перевод. */
  function shown(item: NavItem): string {
    return editLang === base ? item.label : valueForLang("", i18n, key(item.id), editLang);
  }

  const flat = items.flatMap((it, i) => [
    { item: it, index: i, child: false },
    ...(it.children ?? []).map((c) => ({ item: c as NavItem, index: i, child: true })),
  ]);

  function commit(next: NavItem[]) {
    setItems(next.map((it, i) => ({ ...it, order: (i + 1) * 10 })));
  }

  function add(href: string, title: string) {
    commit([...items, { id: rid(), href, order: 0, label: title }]);
  }

  function drop(to: number) {
    if (drag === null || drag === to) return;
    const next = [...items];
    const [moved] = next.splice(drag, 1);
    next.splice(to, 0, moved);
    setDrag(null);
    commit(next);
  }

  // Пункт становится ребёнком предыдущего — так вкладка превращается в группу.
  function nest(i: number) {
    if (i === 0) return;
    const next = [...items];
    const [moved] = next.splice(i, 1);
    const parent = next[i - 1];
    if (!moved.href) return;
    parent.children = [
      ...(parent.children ?? []),
      { id: moved.id, href: moved.href, order: ((parent.children?.length ?? 0) + 1) * 10, label: moved.label },
    ];
    commit(next);
  }

  function unnest(parentIndex: number, id: string) {
    const next = [...items];
    const parent = next[parentIndex];
    const child = (parent.children ?? []).find((c) => c.id === id);
    if (!child) return;
    parent.children = (parent.children ?? []).filter((c) => c.id !== id);
    next.splice(parentIndex + 1, 0, { id: child.id, href: child.href, order: 0, label: child.label });
    commit(next);
  }

  function remove(parentIndex: number, id: string, child: boolean) {
    if (!child) return commit(items.filter((_, i) => i !== parentIndex));
    const next = [...items];
    next[parentIndex].children = (next[parentIndex].children ?? []).filter((c) => c.id !== id);
    commit(next);
  }

  // Правка подписи. На языке-основе меняется само значение, на прочих — перевод
  // рядом с ним. Тот же уговор, что у пяти полей настроек приложения: основное
  // значение остаётся значением, переводы живут в ветке `i18n`.
  function rename(parentIndex: number, id: string, child: boolean, label: string) {
    if (editLang !== base) {
      setI18n(setTranslation(i18n, key(id), editLang, label));
      return;
    }
    const next = [...items];
    if (!child) next[parentIndex] = { ...next[parentIndex], label };
    else next[parentIndex].children = (next[parentIndex].children ?? []).map((c) => (c.id === id ? { ...c, label } : c));
    setItems(next);
  }

  async function save() {
    setBusy(true); setNote(null);
    try {
      const r = await fetch("/api/config/nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nav: { top: items, authSide }, i18n }),
      });
      const j = (await r.json()) as { ok?: boolean; revalidated?: boolean };
      // Честное различие: записано и уже видно / записано и появится в течение
      // окна ISR. Бодрое «готово» на втором случае — обман.
      setNote(j.ok ? (j.revalidated ? labels.savedNow : labels.savedLater) : labels.failed);
    } catch {
      setNote(labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{labels.candidates}</p>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((c) => (
            <Button key={c.href} size="sm" variant="outline" className="h-7 text-[11px] gap-1"
              onClick={() => add(c.href, c.title)}>
              <Plus className="size-3" />{c.title}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <LangStrip
          langs={langs} base={base} active={editLang} done={done}
          onPick={setEditLang}
          labels={{ baseLang: labels.baseLang, translated: labels.translated, notTranslated: labels.notTranslated }}
        />
        {editLang !== base && <p className="text-[10px] text-amber-600 dark:text-amber-400">{labels.langHint}</p>}
      </div>

      <div>
        <p className="text-[10px] text-muted-foreground mb-1">{labels.dragHint}</p>
        {flat.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {labels.empty}
          </div>
        )}
        <ul className="space-y-1">
          {flat.map(({ item, index, child }) => (
            <li
              key={item.id}
              draggable={!child}
              onDragStart={() => !child && setDrag(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => !child && drop(index)}
              className={`flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 ${child ? "ml-8" : ""}`}
            >
              {child ? <CornerDownRight className="size-3.5 text-muted-foreground shrink-0" />
                     : <GripVertical className="size-3.5 text-muted-foreground shrink-0 cursor-grab" />}
              <input
                value={shown(item)}
                onChange={(e) => rename(index, item.id, child, e.target.value)}
                placeholder={labels.labelPlaceholder}
                className="flex-1 min-w-0 bg-transparent text-xs outline-none"
              />
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[30%]">{item.href}</span>
              {child ? (
                <Button size="sm" variant="ghost" className="h-6 px-1" title={labels.makeTop}
                  onClick={() => unnest(index, item.id)}><ArrowUpLeft className="size-3.5" /></Button>
              ) : (
                <Button size="sm" variant="ghost" className="h-6 px-1" title={labels.makeChild}
                  onClick={() => nest(index)} disabled={index === 0}><CornerDownRight className="size-3.5" /></Button>
              )}
              <Button size="sm" variant="ghost" className="h-6 px-1" title={labels.remove}
                onClick={() => remove(index, item.id, child)}><Trash2 className="size-3.5" /></Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.authSide}</span>
        {(["left", "right"] as const).map((s) => (
          <Button key={s} size="sm" variant={authSide === s ? "default" : "outline"} className="h-7 text-[11px]"
            onClick={() => setAuthSide(s)}>{s === "left" ? labels.authLeft : labels.authRight}</Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}{busy ? labels.saving : labels.save}
        </Button>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
    </div>
  );
}
