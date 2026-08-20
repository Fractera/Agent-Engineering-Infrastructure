"use client";

// Состояние диалога переводов: черновики, автоперевод, сохранение по языку.
//
// Вынесено из компонента по тому же признаку, что и везде: компонент отвечает за
// вид, а это — за поведение.
//
// 🔒 ЗЕРКАЛО инструмента приложения (`fractera-next-starter/_tools/translations-dialog/`).
// Расходятся ровно две вещи: языки приходят ПРОПСОМ (у панели их знает сервер,
// у приложения — собственный конфиг) и адрес двери перевода. Поведение общее.

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Drafts, TranslatableField, TranslateError } from "../types/translations";

export function useTranslations(
  fields: TranslatableField[],
  baseLang: string,
  langs: string[],
  apiUrl: string,
) {
  // Переводим на все языки, кроме базового: базовый и есть само значение.
  const targets = useMemo(() => langs.filter((l) => l !== baseLang), [langs, baseLang]);

  const [drafts, setDrafts] = useState<Drafts>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslateError>(null);
  /** Языки, сохранённые в этом сеансе, — по ним прячется кнопка карточки. */
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // 🔒 КАРТОЧКИ ЗАПОЛНЕНЫ ИСХОДНЫМ ТЕКСТОМ, А НЕ ПУСТЫ. Пустое поле не говорит,
  // ЧТО переводить: человек видит рамку и не знает, о какой строке речь.
  useEffect(() => {
    setDrafts((prev) => {
      const next: Drafts = { ...prev };
      for (const lang of targets) {
        const cell = { ...(next[lang] ?? {}) };
        for (const f of fields) if (cell[f.key] === undefined) cell[f.key] = f.value;
        next[lang] = cell;
      }
      return next;
    });
  }, [targets, fields]);

  const setCell = useCallback((lang: string, key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [lang]: { ...(prev[lang] ?? {}), [key]: value } }));
    // Правка после сохранения снова делает язык несохранённым: иначе кнопка
    // исчезла бы, а изменение осталось бы только в браузере.
    setSaved((prev) => (prev[lang] ? { ...prev, [lang]: false } : prev));
  }, []);

  const markSaved = useCallback((lang: string) => {
    setSaved((prev) => ({ ...prev, [lang]: true }));
  }, []);

  /**
   * Перевести. `only` — ключ одного поля; без него все поля.
   *
   * Один запрос на все языки: вызов на каждую пару «поле × язык» даёт десятки
   * обращений и разваливается частично, оставляя половину переводов.
   */
  const translate = useCallback(async (only?: string) => {
    const source = fields.filter((f) => (only ? f.key === only : true) && f.value.trim());
    if (!source.length || !targets.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: Object.fromEntries(source.map((f) => [f.key, f.value])),
          from: baseLang,
          to: targets,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data?.error as TranslateError) ?? "upstream");
        return;
      }
      const data = (await res.json()) as { translations?: Drafts };
      // Сливаем, а не заменяем: перевод одного поля не должен стирать то, что
      // человек уже поправил руками в соседнем.
      setDrafts((prev) => {
        const next: Drafts = { ...prev };
        for (const [lang, values] of Object.entries(data.translations ?? {})) {
          next[lang] = { ...(next[lang] ?? {}), ...values };
        }
        return next;
      });
      setSaved({});
    } catch {
      setError("upstream");
    } finally {
      setBusy(false);
    }
  }, [fields, targets, baseLang, apiUrl]);

  return { targets, drafts, setCell, translate, busy, error, saved, markSaved };
}
