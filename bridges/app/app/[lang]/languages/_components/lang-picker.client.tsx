"use client";

// Выбор языков приложения (шаг 501, Ф2, партия 17).
//
// Островок, и по серьёзной причине: сохранение здесь ЗАПУСКАЕТ ПЕРЕСБОРКУ. Языки
// запекаются на сборке — из них строятся статические страницы `[lang]`, — поэтому
// одна запись в файл окружения ничего не меняет, пока приложение не собрано заново.
// Сборка идёт две-четыре минуты, и за ней надо следить: молча оставить человека
// перед неизменившейся страницей хуже, чем показать ход.
//
// Список языков рисует СЕРВЕР (84 записи с флагами и названиями); здесь только
// отметки, язык по умолчанию и запуск.
//
// Английский нельзя снять намеренно: он последний рубеж, к которому падает всё
// остальное, и приложение без языка не собирается вовсе.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { LangRow } from "../_lib/langs";
import type { LanguageRegion } from "@/config/translations/language-metadata";

export type PickerLabels = {
  save: string; saving: string; rebuilding: string; saved: string;
  rebuildStarted: string; rebuildDone: string; rebuildFailed: string;
  busyBuild: string; failed: string; nothingToSave: string;
  atLeastOne: string; defaultLabel: string; makeDefault: string;
  /** Подпись кнопки «оставить эти языки»: показывается, пока выбор не подтверждён. */
  keepThese: string;
  selectedCount: string; tierHint: string;
};

const LOCKED = "en";

export function LangPicker(
  { byRegion, selected, defaultLanguage, confirmed, labels }: {
    byRegion: { region: LanguageRegion; rows: LangRow[] }[];
    selected: string[];
    defaultLanguage: string;
    confirmed: boolean;
    labels: PickerLabels;
  },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(selected.length ? selected : [LOCKED]));
  const [base, setBase] = useState(defaultLanguage || LOCKED);
  const [phase, setPhase] = useState<null | "saving" | "rebuilding">(null);

  const dirty = chosen.size !== selected.length ||
    [...chosen].some((c) => !selected.includes(c)) ||
    base !== defaultLanguage;

  function toggle(code: string) {
    if (code === LOCKED) return;
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        // Снятый язык не может остаться языком по умолчанию — иначе приложение
        // сослалось бы на то, чего не собирает.
        if (base === code) setBase(LOCKED);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function save() {
    // «Нечего сохранять» — правда ТОЛЬКО когда выбор уже подтверждён. Пока
    // отметки нет, сохранение неизменённого набора и есть содержательное
    // действие: оно записывает решение владельца оставить эти языки.
    if (!dirty && confirmed) { toast.error(labels.nothingToSave); return; }
    if (chosen.size === 0) { toast.error(labels.atLeastOne); return; }

    setPhase("saving");
    try {
      const languages = [...chosen];
      const r = await fetch("/api/config/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages, defaultLanguage: base }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);

      // 🔒 НАБОР НЕ МЕНЯЛСЯ — ПЕРЕСОБИРАТЬ НЕЧЕГО (владелец на свежем сервере
      // 2026-08-13).
      //
      // Пересборка нужна ровно потому, что языки запекаются в сборку. Но если
      // владелец нажал «Оставить эти языки», в сборке уже стоят ИМЕННО ОНИ —
      // новая сборка выдаст байт в байт то же самое. Менялась только отметка о
      // решении, а она живёт в окружении и читается на каждый запрос.
      //
      // Цена ошибки была не теоретической: свежий сервер приезжает с десятью
      // языками, каждый язык — десятки предрендеренных страниц, и владелец,
      // подтвердивший умолчание, получал сборку на несколько минут. Со стороны
      // это выглядит как зависший процесс — он и написал «похоже на бесконечный
      // цикл». Цикла не было, была работа, которой не требовалось.
      if (!dirty) {
        setPhase(null);
        startTransition(() => router.refresh());
        return;
      }

      // Набор действительно изменился: без пересборки запись в окружение не даёт
      // ничего, потому что языки запекаются на сборке.
      setPhase("rebuilding");
      toast.message(labels.rebuildStarted);
      const dep = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `languages: ${languages.join(",")} (default ${base})` }),
      });
      // 🔒 ВЫХОД БЕЗ СБРОСА СОСТОЯНИЯ — ВОТ ПОЧЕМУ КРУТИЛКА НЕ ОСТАНАВЛИВАЛАСЬ
      // (владелец на свежем сервере 2026-08-13: «вращается больше пяти минут»).
      //
      // Здесь стояло `return` без `setPhase(null)`. Кнопка оставалась в состоянии
      // «пересобираю» НАВСЕГДА — до перезагрузки страницы, — хотя на сервере всё
      // давно закончилось.
      //
      // И попадала сюда она закономерно, а не случайно: сохранение запускало ДВЕ
      // сборки — одну этот островок, вторую сам обработчик сохранения. Первая
      // занимала очередь, вторая получала 409 «сборка уже идёт», и островок
      // застревал. Две другие правки убирают само столкновение, но сброс
      // состояния обязан быть здесь в любом случае: любой ранний выход из
      // асинхронного действия ОБЯЗАН вернуть кнопку в рабочее состояние, иначе
      // человек видит вечную работу там, где её нет.
      if (dep.status === 409) { toast.error(labels.busyBuild); setPhase(null); return; }
      const depData = await dep.json().catch(() => ({}));
      if (!dep.ok || !depData.jobId) throw new Error(String(depData?.error ?? labels.rebuildFailed));

      // Следим до конца: языки применяются только после успешной сборки.
      const jobId = depData.jobId as string;
      const deadline = Date.now() + 12 * 60_000;
      const tick = async () => {
        if (Date.now() > deadline) { toast.warning(labels.rebuildFailed); setPhase(null); return; }
        const s = await fetch(`/api/deploy/status?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" })
          .then((x) => x.json()).catch(() => ({}));
        if (s.status === "COMPLETED") {
          toast.success(labels.rebuildDone);
          setPhase(null);
          startTransition(() => router.refresh());
          return;
        }
        if (s.status === "FAILED" || s.status === "HEALTH_FAILED") {
          toast.error(labels.rebuildFailed);
          setPhase(null);
          startTransition(() => router.refresh());
          return;
        }
        setTimeout(tick, 5000);
      };
      setTimeout(tick, 5000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
      setPhase(null);
    }
  }

  const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background py-2">
        <span className="text-[11px] text-muted-foreground">
          {fill(labels.selectedCount, { count: String(chosen.size) })}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {labels.defaultLabel} <span className="uppercase text-foreground">{base}</span>
        </span>
        {/* 🔒 «ОСТАВИТЬ ЭТИ ЯЗЫКИ» — ВЫХОД ИЗ ЛОВУШКИ (владелец 2026-08-13).
            Требование о языках закрывается СОХРАНЕНИЕМ — оно отмечает не значение,
            а поступок. Но сохранение заблокировано, когда менять нечего, и
            владельцу, которого набор устраивает, нажать было НЕЧЕГО: требование
            горело вечно, а страница предлагала только менять то, что менять не
            хочется.
            Кнопка делает ровно то же, что сохранение — записывает набор, ставит
            отметку и пересобирает, — и исчезает, как только выбор сделан: постоянная
            кнопка «оставить как есть» рядом с обычным сохранением дублировала бы его. */}
        {!confirmed && !dirty && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-[11px]"
            onClick={save}
            disabled={phase !== null}
          >
            {phase !== null ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {phase === "saving" ? labels.saving : phase === "rebuilding" ? labels.rebuilding : labels.keepThese}
          </Button>
        )}
        <Button
          size="sm"
          className={(!confirmed && !dirty) ? "text-[11px]" : "ml-auto text-[11px]"}
          onClick={save}
          disabled={phase !== null || !dirty}
        >
          {phase !== null ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {phase === "saving" ? labels.saving : phase === "rebuilding" ? labels.rebuilding : labels.save}
        </Button>
      </div>

      {byRegion.map(({ region, rows }) => (
        <section key={region}>
          <h2 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">{region}</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => {
              const on = chosen.has(r.code);
              const locked = r.code === LOCKED;
              return (
                <li key={`${region}-${r.code}`} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={locked || phase !== null}
                    onChange={() => toggle(r.code)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-base leading-none">{r.flag}</span>
                  <span className="text-foreground">{r.nativeName}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{r.code}</span>
                  {/* Качество машинного перевода: «community» значит, что данных мало
                      и результат придётся проверять человеком. */}
                  {r.tier !== "A" && (
                    <span className="text-[9px] text-amber-600 dark:text-amber-400" title={labels.tierHint}>
                      {r.tier}
                    </span>
                  )}
                  {on && !r.isDefault && base !== r.code && (
                    <button
                      type="button"
                      onClick={() => setBase(r.code)}
                      disabled={phase !== null}
                      title={labels.makeDefault}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <Star size={11} />
                    </button>
                  )}
                  {base === r.code && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500">
                      <Star size={10} className="fill-current" />{labels.defaultLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
