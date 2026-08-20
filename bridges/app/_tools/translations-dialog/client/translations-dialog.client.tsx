"use client";

// ДИАЛОГ ДОБАВЛЕНИЯ ПЕРЕВОДОВ — общий инструмент панели (шаг 529).
//
// 🔒 ЗАЧЕМ ОН ЗДЕСЬ ПОЯВИЛСЯ. Такой инструмент давно существовал на стороне
// приложения, и в его шапке было написано: «подключается любой сущностью с
// переводимыми полями». Панель об этом не знала: кнопка «перевести» в разделах
// меню и подвала звала дверь напрямую и показывала СТРОЧКУ ТЕКСТА вместо
// интерфейса. Человек нажимал значок перевода и не получал ничего, чем можно
// пользоваться: ни выбора языка, ни правки руками, ни сохранения по языку.
//
// Причина промаха — не лень, а отсутствие места: инструмент лежал в
// `components/i18n/` приложения, а не в папке инструментов, и в реестре его не
// было. Найти его было негде. Теперь он в `_tools/`, и реестр о нём знает.
//
// 🔒 ЧТО ЭТОТ ИНСТРУМЕНТ ДАЁТ, одним списком: карточка на каждый язык, в ней
// текст видно и его можно править руками; автоперевод одной кнопкой; сохранение
// ПО ОДНОМУ ЯЗЫКУ — поправил два из десяти и сохранил именно их; голосовой ввод
// на языке карточки; отказ назван своим именем и ведёт туда, где его лечат.

import { useState } from "react";
import { AlertTriangle, ExternalLink, HelpCircle, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { TranslationCell } from "./translation-cell.client";
import { useTranslations } from "./use-translations";
import type { Drafts, TranslatableField, TranslationsUi } from "../types/translations";

export type { TranslatableField, Drafts };

export function TranslationsDialog(
  { open, onOpenChange, baseLang, uiLang, langs, fields, ui, apiUrl, openAiHref, onSave }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Язык-основа: его значение и есть исходный текст. */
    baseLang: string;
    /** Язык панели — на нём говорит интерфейс. */
    uiLang: string;
    /** Языки, на которые переводим. У панели их знает сервер. */
    langs: string[];
    fields: TranslatableField[];
    /** Слова: резолвятся на сервере, 82 языка в браузер не уезжают. */
    ui: TranslationsUi;
    /** Дверь перевода. У разделов меню это `/api/config/nav/translate`. */
    apiUrl: string;
    /** Куда идти за ключом OpenAI, когда его нет. */
    openAiHref: string;
    /** Сохранить переводы ОДНОГО языка. Возвращает успех. */
    onSave: (drafts: Drafts) => Promise<boolean>;
  },
) {
  const [active, setActive] = useState(0);
  const [savingLang, setSavingLang] = useState<string | null>(null);
  const { targets, drafts, setCell, translate, busy, error, saved, markSaved } =
    useTranslations(fields, baseLang, langs, apiUrl);

  // 🔒 ОДНОЯЗЫЧНОМУ ПРОЕКТУ ЭТОГО ОКНА НЕ ПОКАЗЫВАЮТ. Переводить не на что, и
  // спрашивать человека — отнимать время вопросом без ответа.
  if (targets.length === 0) return null;

  const field = fields[active] ?? fields[0];

  async function saveOne(code: string) {
    setSavingLang(code);
    const ok = await onSave({ [code]: drafts[code] ?? {} });
    setSavingLang(null);
    if (ok) markSaved(code);
  }

  const errorText =
    error === "no-key" ? ui.noKey
    : error === "bad-key" ? ui.badKey
    : error ? ui.upstream : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-[13px]">
            <Languages size={13} />{ui.title}
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed">{ui.intro}</DialogDescription>
        </DialogHeader>

        {/* Вкладки полей — только когда полей больше одного. */}
        {fields.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {fields.map((f, i) => (
              <Button
                key={f.key}
                size="sm"
                variant={i === active ? "default" : "outline"}
                className="h-7 min-w-7 px-2 text-[11px]"
                onClick={() => setActive(i)}
                title={f.label}
              >
                {i + 1}
              </Button>
            ))}
            <span className="ml-1 text-[11px] text-muted-foreground">{field?.label}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => translate(field?.key)} disabled={busy}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            {busy ? ui.translating : ui.translateTab}
          </Button>
          {fields.length > 1 && (
            <Button size="sm" className="text-[11px]" onClick={() => translate()} disabled={busy}>
              {ui.translateAllTabs}
            </Button>
          )}
        </div>

        {errorText && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[11px] leading-relaxed text-destructive">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <div>
              <p>{errorText}</p>
              {(error === "no-key" || error === "bad-key") && (
                <a href={openAiHref} className="mt-1 inline-flex items-center gap-1 underline">
                  {ui.keyLink}<ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Прокручивается только список языков: вкладки и кнопки перевода
            остаются на месте, иначе на десяти языках до них не добраться. */}
        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {targets.map((code) => {
            const value = drafts[code]?.[field?.key ?? ""] ?? "";
            return (
              <TranslationCell
                key={code}
                lang={code}
                value={value}
                multiline={field?.multiline}
                dirty={Boolean(field) && value.trim() !== field.value.trim()}
                saved={Boolean(saved[code])}
                saving={savingLang === code}
                uiLang={uiLang}
                labels={{ save: ui.saveOne, saving: ui.saving, savedMark: ui.savedMark }}
                onChange={(v) => field && setCell(code, field.key, v)}
                onSave={() => saveOne(code)}
              />
            );
          })}
        </div>

        <DialogFooter className="items-center gap-1.5">
          {/* Родной `title`: работает на касании и переживает выключенный JS. */}
          <span title={ui.hint} className="mr-auto cursor-help text-muted-foreground">
            <HelpCircle size={13} />
          </span>
          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => onOpenChange(false)}>
            {ui.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
