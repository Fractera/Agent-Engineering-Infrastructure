// Разметка руководства (шаг 501, Ф2). СЕРВЕРНЫЙ компонент: markdown
// превращается в HTML на сервере, в браузер уезжает готовый текст, а не
// библиотека разбора и не строка markdown.
//
// Классы типографики взяты из старой панели дословно — размеры заголовков,
// отступы абзацев, списки, `code` на фоне `muted`, цитата с левой чертой. Текст
// руководства должен читаться ровно так же, как читался.

import ReactMarkdown from "react-markdown";

const PROSE = [
  "text-[12px] leading-relaxed text-muted-foreground",
  "[&_h1]:text-[17px] [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-3",
  "[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-7 [&_h2]:mb-2",
  "[&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-1.5",
  "[&_p]:mb-3",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1.5",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1.5",
  "[&_li]:leading-relaxed",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_code]:font-mono [&_code]:text-[11px] [&_code]:text-foreground",
  "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3",
  "[&_blockquote]:text-foreground [&_blockquote]:font-medium [&_blockquote]:my-3",
  "[&_hr]:border-border [&_hr]:my-6",
  "[&_a]:text-primary [&_a]:underline",
  // Широкая таблица или длинная команда не имеют права растягивать страницу —
  // прокручиваются внутри себя.
  "[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3",
  "[&_table]:block [&_table]:overflow-x-auto [&_table]:w-full",
].join(" ");

/**
 * Снять первый заголовок документа.
 *
 * 🔒 ЗАЧЕМ (владелец 2026-08-22, увидел в окне «Секции»). Документ начинается с
 * `# Название`, и окно печатает своё название в шапке — заголовок выходил ДВАЖДЫ,
 * подряд, одними и теми же словами. Дефект системный: так устроены все тридцать
 * два документа, и правка каждого руками означала бы тридцать две возможности
 * разойтись. Снимаем в одном месте — в том, кто рисует.
 *
 * Снимается ТОЛЬКО первая строка и только если она заголовок первого уровня:
 * документ без заголовка не трогается вовсе, а `##` внутри текста остаются.
 */
function withoutLeadTitle(markdown: string): string {
  const lines = markdown.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i += 1;
  if (!lines[i]?.startsWith("# ")) return markdown;
  return lines.slice(i + 1).join("\n").replace(/^\s*\n/, "");
}

export function GuideProse(
  { markdown, stripTitle = false }:
  {
    markdown: string;
    /**
     * Заголовок документа уже напечатан снаружи — в шапке окна или страницы.
     * Умолчание `false`: страница руководства печатает документ целиком, и там
     * заголовок нужен.
     */
    stripTitle?: boolean;
  },
) {
  return (
    <div className={PROSE}>
      <ReactMarkdown>{stripTitle ? withoutLeadTitle(markdown) : markdown}</ReactMarkdown>
    </div>
  );
}
