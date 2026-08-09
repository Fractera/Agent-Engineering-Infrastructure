"use client";

// Редактор настроек приложения (шаг 501, Ф2, партия 16).
//
// Островок: здесь загрузка картинок в хранилище, обрезка на холсте и правка
// вложенного объекта — всё это работа браузера.
//
// НОВОЕ ПРОТИВ ПАНЕЛИ: языковые поля. У пяти полей значение зависит от языка
// (`name`, `description`, `seo.titleTemplate`, `seo.keywords`, `og.siteName`), и у
// них появляется переключатель языка над полем. Основной язык слота правит само
// значение, остальные — перевод в `i18n.<путь>.<язык>`.
//
// Почему переключатель, а не поле на каждый язык: приложение может собираться на
// десяти языках, и десять полей подряд у каждого из пяти — это пятьдесят полей,
// среди которых теряется всё остальное. Один переключатель показывает, какие языки
// уже переведены, точкой рядом с кодом.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Languages } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SECTIONS, getAt, setAt, dropRemovedFields, type Field } from "../_lib/fields";
import { valueForLang, hasTranslation, setTranslation, type I18nMap } from "../_lib/per-lang";
import { FieldRow } from "./field-row.client";
import type { AppConfig } from "../_lib/settings";

export type EditorLabels = {
  save: string; saving: string; saved: string; failed: string; nothingToSave: string;
  perLangHint: string; translated: string; notTranslated: string; baseLang: string;
};

export function SettingsEditor(
  { initial, slotLangs, slotDefault, labels }: {
    initial: AppConfig;
    slotLangs: string[];
    slotDefault: string;
    labels: EditorLabels;
  },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [config, setConfig] = useState<AppConfig>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Какой язык правится у языковых полей. Один на весь раздел, а не на каждое
  // поле: переводят обычно все поля сразу, на один язык.
  const [editLang, setEditLang] = useState(slotDefault);

  const i18n = (config.i18n ?? {}) as I18nMap;
  const multi = slotLangs.length > 1;

  function update(path: string, value: unknown) {
    setConfig((prev) => setAt(prev as Record<string, unknown>, path, value) as AppConfig);
    setDirty(true);
  }

  function updatePerLang(path: string, value: unknown) {
    const text = typeof value === "string" ? value : "";
    if (editLang === slotDefault) {
      // Основной язык — это само значение поля, а не перевод: так конфиг остаётся
      // читаемым кодом, который про языки не знает.
      update(path, text);
      return;
    }
    setConfig((prev) => ({ ...prev, i18n: setTranslation((prev.i18n ?? {}) as I18nMap, path, editLang, text) }));
    setDirty(true);
  }

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/config/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Снесённые поля вычищаются ПРИ СОХРАНЕНИИ: они остались в уже
        // записанном файле, а редактор отправляет конфиг целиком — без этого
        // мёртвое значение уехало бы обратно.
        body: JSON.stringify({ config: dropRemovedFields(config) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      toast.success(labels.saved);
      setDirty(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: Field) {
    if (!field.perLang) {
      return (
        <FieldRow
          key={field.path}
          field={field}
          value={getAt(config as Record<string, unknown>, field.path)}
          onChange={(v) => update(field.path, v)}
        />
      );
    }

    // Языковое поле: значение показываем для выбранного языка.
    const shown = valueForLang(
      getAt(config as Record<string, unknown>, field.path),
      i18n,
      field.path,
      editLang,
    );
    const isBase = editLang === slotDefault;

    return (
      <div key={field.path} className="rounded-md border border-dashed border-border p-2">
        <FieldRow
          field={field}
          value={shown}
          onChange={(v) => updatePerLang(field.path, v)}
        />
        {multi && (
          <p className="mt-1 text-[9px] text-muted-foreground">
            {isBase ? labels.baseLang : `${labels.perLangHint} ${editLang}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Переключатель языка появляется ТОЛЬКО когда языков больше одного:
          на одноязычном приложении он был бы органом управления без смысла. */}
      {multi && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Languages size={12} />{labels.perLangHint}
          </span>
          {slotLangs.map((code) => {
            const done = code === slotDefault || Object.keys(i18n).some((p) => hasTranslation(i18n, p, code));
            return (
              <Button
                key={code}
                variant={code === editLang ? "default" : "outline"}
                size="xs"
                onClick={() => setEditLang(code)}
                title={done ? labels.translated : labels.notTranslated}
                className="text-[11px]"
              >
                <span className="font-mono uppercase">{code}</span>
                {/* Точка говорит, есть ли переводы на этот язык: без неё пришлось бы
                    щёлкать по каждому, чтобы узнать. */}
                <span className={`ml-1 inline-block size-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              </Button>
            );
          })}
        </div>
      )}

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 className="text-[11px] font-semibold text-foreground">{section.title}</h2>
          {section.description && (
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{section.description}</p>
          )}
          <div className="mt-2 flex flex-col gap-2.5">
            {section.fields.map(renderField)}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background py-2">
        <Button size="sm" onClick={save} disabled={saving || !dirty} className="text-[11px]">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? labels.saving : labels.save}
        </Button>
        {dirty && <span className="text-[10px] text-muted-foreground">•</span>}
      </div>
    </div>
  );
}
