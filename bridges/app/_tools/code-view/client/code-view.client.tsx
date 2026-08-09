"use client";

import { useEffect, useState } from "react";
import { langOf, type CodeViewLabels } from "../types/code-view";

// Просмотр исходного кода с подсветкой (инструмент, шаг 501).
//
// Движок — Shiki, тот же, что уже стоит в панели: в продукте должен быть ОДИН
// подсветчик, а не два. Он подсвечивает разбором настоящей грамматики языка, а
// не набором регулярных выражений, поэтому вложенный CSS внутри HTML или
// дженерик в TypeScript окрашиваются верно, а не «почти верно».
//
// 🔒 ГРУЗИТСЯ ЛЕНИВО И ТОЛЬКО КОГДА ЕСТЬ ЧТО ПОКАЗАТЬ. Shiki несёт грамматики
// языков и весит немало: статический импорт заставил бы платить за них каждую
// страницу, где просмотрщик всего лишь может понадобиться.
//
// ДВЕ ТЕМЫ СРАЗУ. `defaultColor: false` заставляет Shiki положить в разметку и
// светлые, и тёмные цвета переменными CSS. Поэтому переключение темы панели
// перекрашивает код мгновенно и без повторного разбора — альтернативой было бы
// подсвечивать заново на каждый щелчок переключателя.

export function CodeView(
  { code, filename, lang, labels, className }: {
    code: string;
    /** Имя файла — по расширению определяется язык, если он не задан явно. */
    filename?: string;
    /** Явный язык. Приоритетнее имени файла. */
    lang?: string;
    labels?: CodeViewLabels;
    className?: string;
  },
) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const language = lang ?? langOf(filename ?? "");

  useEffect(() => {
    let alive = true;
    setHtml(null);
    setFailed(false);

    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(code, {
          lang: language,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
        if (alive) setHtml(out);
      } catch {
        // Незнакомый язык или сбой загрузки — показываем текст как есть.
        // Код без подсветки читается; пустой экран вместо кода — нет.
        if (alive) setFailed(true);
      }
    })();

    return () => { alive = false; };
  }, [code, language]);

  const box = `overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed ${className ?? ""}`;

  if (failed || html === null) {
    return (
      <pre className={`${box} whitespace-pre-wrap break-words text-foreground`}>
        {html === null && !failed ? (labels?.loading ?? "…") : code}
      </pre>
    );
  }

  return (
    <div
      className={`${box} [&_pre]:!bg-transparent [&_pre]:m-0 [&_code]:font-mono`}
      // Разметка приходит от Shiki: она построена из кода на сервере разбором
      // грамматики, а не собрана из пользовательского ввода строкой.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
