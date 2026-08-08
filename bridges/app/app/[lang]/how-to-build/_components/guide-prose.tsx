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

export function GuideProse({ markdown }: { markdown: string }) {
  return (
    <div className={PROSE}>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
