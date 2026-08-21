"use client";

// Выбор режима разработки (2026-08-18).
//
// Островок ради одного действия: выбрать и сохранить. Слова и начальное значение
// приходят с сервера — страница читается и без JavaScript, а словарь панели на 82
// языка в браузер не уезжает.
//
// 🔒 ЧУЖИЕ КЛЮЧИ КОНФИГА СОХРАНЯЮТСЯ. Пишем в тот же файл, где живут выключатели
// возможностей и набор документов агента: отправить один только режим значило бы
// стереть остальное. Тот же приём, что у редактора возможностей.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Boxes, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// 🔒 СПИСОК РЕЖИМОВ ЖИВЁТ В НЕЙТРАЛЬНОМ ФАЙЛЕ. Он нужен и серверной странице;
// экспортированный отсюда, на сервере он превращался в клиентскую ссылку и ронял
// страницу в белый экран (владелец, 2026-08-18).
import { MODES, type DevelopmentMode } from "@/lib/development-mode";
export type { DevelopmentMode };

export type ModeLabels = {
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  current: string;
  /**
   * Бейджи режима — требование к модели, а не похвала режиму. Пусто у
   * классического: ему нечего требовать, и пустой ряд бейджей на карточке
   * выглядел бы недоделкой.
   */
  items: Record<DevelopmentMode, { label: string; description: string; when: string; badges: string[] }>;
  /** Двери режима кейсов: адреса приходят с сервера — язык знает он. */
  cases: {
    productsHref: string; productsLabel: string;
    /** Ссылка на волны агентов. Нет — нет и кнопки: обещать некуда. */
    workflowsHref?: string; workflowsLabel?: string;
    openHint: string;
  };
};

export function ModePicker(
  { config, initial, chosen: alreadyChosen, labels }: {
    config: Record<string, unknown>;
    initial: DevelopmentMode;
    /**
     * Записан ли выбор в конфиге. НЕ то же самое, что «какой режим действует»:
     * молчание конфига действует как `classic`, поэтому на свежем сервере
     * `initial` уже равен тому, что человек видит выбранным.
     */
    chosen: boolean;
    labels: ModeLabels;
  },
) {
  const router = useRouter();
  const [mode, setMode] = useState<DevelopmentMode>(initial);
  const [saving, setSaving] = useState(false);

  // 🔒 «ОСТАВИТЬ ТЕКУЩИЙ» — ТОЖЕ ВЫБОР (владелец 2026-08-19). Здесь стояло
  // `mode !== initial`, и на свежем сервере это запирало дверь: человек, которого
  // предупреждение позвало выбрать режим и который согласен с классическим,
  // получал отказ «нечего сохранять», запись в конфиг не появлялась, и
  // предупреждение горело вечно. Пока выбор не записан, сохранять можно всегда —
  // ровно затем, чтобы его записать.
  const dirty = mode !== initial || !alreadyChosen;

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config: { ...config, developmentMode: mode } }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);
      // Режим читает не только эта страница: агент берёт его из того же файла, а
      // шапка панели рисуется сервером. Без обновления человек видел бы прежнее.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {MODES.map((id) => {
        const item = labels.items[id];
        const chosen = mode === id;
        // 🔒 КАРТОЧКА — LABEL С РАДИО, А НЕ КНОПКА (2026-08-18). В карточке
        // кейсов появились ССЫЛКИ, а ссылка внутри <button> — недопустимая
        // разметка: браузер съедает нажатие, и «Перейти к настройке продуктов»
        // молча выбирала бы режим вместо перехода. Радио внутри label даёт то же
        // поведение выбора и переживает выключенный JavaScript.
        return (
          <div
            key={id}
            className={`rounded-lg border p-3 transition-colors ${
              chosen ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <label className="flex w-full cursor-pointer items-start gap-2.5 text-left">
              <input
                type="radio"
                name="development-mode"
                className="sr-only"
                checked={chosen}
                onChange={() => setMode(id)}
              />
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  chosen ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {chosen && <Check size={10} />}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-foreground">
                  {item.label}
                  {id === initial && (
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {labels.current}
                    </span>
                  )}
                </span>

                {/* Бейджи стоят ПОД именем, а не рядом с меткой «сейчас»: та
                    говорит о состоянии панели, эти — о требовании к модели, и
                    смешивать их в одну строку значит равнять их в весе. */}
                {item.badges.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[9px] font-medium text-sky-700 dark:text-sky-300"
                      >
                        {badge}
                      </span>
                    ))}
                  </span>
                )}

                <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">{item.description}</span>
                {/* «Когда брать» отделено: описание отвечает на «что это», а выбирают
                    по второму вопросу — подходит ли это моей сегодняшней задаче. */}
                <span className="mt-1.5 block text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                  {item.when}
                </span>
              </span>
            </label>

            {/* 🔒 ДВЕРИ ПОЯВЛЯЮТСЯ ПОСЛЕ СОХРАНЕНИЯ, А НЕ ПОСЛЕ ВЫБОРА (2026-08-18).
                Ссылка, показанная по несохранённому выбору, уводила бы со страницы
                вместе с выбором: режим остался бы прежним, группа «Продукты» —
                спрятанной, и человек попал бы в раздел, которого в его меню нет.
                Поэтому здесь `initial` (сохранённое значение), а не `mode`. */}
            {id === "cases" && (
              <div className="mt-2.5 pl-6">
                {initial === "cases" ? (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={labels.cases.productsHref}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sky-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-sky-700"
                    >
                      <Boxes size={11} />{labels.cases.productsLabel}
                    </Link>
                    {labels.cases.workflowsHref && (
                      <Link
                        href={labels.cases.workflowsHref}
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11px] text-foreground transition-colors hover:bg-muted"
                      >
                        <Workflow size={11} />{labels.cases.workflowsLabel}
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.cases.openHint}</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  );
}
