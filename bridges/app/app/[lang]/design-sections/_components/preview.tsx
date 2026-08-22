import { ImageIcon } from "lucide-react";

// ПРЕВЬЮ СЕКЦИИ — схема, нарисованная примитивами ПАНЕЛИ (шаг 541).
//
// 🔒 ЭТО НЕ ТОТ ЖЕ КОД, ЧТО РИСУЕТ САЙТ, И НЕ ПРИТВОРЯЕТСЯ ИМ. Панель и приложение —
// разные приложения; импортировать рендереры она не может. Поэтому здесь рисуется
// СТРОЕНИЕ секции — что где стоит, сколько элементов, есть ли картинка, — а не её
// точный вид. Владельцу об этом сказано прямо на самой странице, а не сноской.
//
// 🔒 ФОРМА ПРИХОДИТ ДАННЫМИ (`shape` из каталога слота), а не выводится из имени
// вида. Имя меняется решением архитектора; форма — свойство секции, и живёт она
// рядом с типом, в `sections/taxonomy.json` приложения.
//
// 🔒 НЕИЗВЕСТНАЯ ФОРМА РИСУЕТСЯ ТЕКСТОМ, а не пропадает. Вид, заведённый в
// приложении вчера и ещё не описанный, обязан быть виден: пустое место на его
// строке владелец прочитает как поломку панели.
//
// Лорем живёт здесь, а не в данных: превью схематично по замыслу, и материал ему
// нужен ровно затем, чтобы форма читалась. Настоящий материал видов лежит в
// галерее приложения, где его рисуют настоящие рендереры.

const LOREM = {
  title: "Заголовок раздела в две строки, чтобы видно было ритм",
  lead: "Короткое пояснение под заголовком: одна-две строки, которые объясняют, о чём этот раздел и зачем он тут стоит.",
  line: "Строка текста примерно такой длины, какой она бывает на настоящей странице.",
  short: "Короткая строка",
  items: ["Первый пункт", "Второй пункт", "Третий пункт"],
  steps: ["Шаг первый", "Шаг второй", "Шаг третий"],
  numbers: [
    { value: "10k+", label: "клиентов" },
    { value: "99,9%", label: "доступность" },
    { value: "3 €", label: "в месяц" },
  ],
  chips: ["Метка", "Ещё метка", "Третья", "Четвёртая"],
};

/** Заглушка изображения — рамка с иконкой, без единого внешнего запроса. */
function Fake({ ratio = "16 / 9" }: { ratio?: string }) {
  return (
    <div
      style={{ aspectRatio: ratio }}
      className="flex w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40"
    >
      <ImageIcon size={18} className="text-muted-foreground/50" />
    </div>
  );
}

function Bar({ w = "100%", h = 8 }: { w?: string; h?: number }) {
  return <div style={{ width: w, height: h }} className="rounded bg-muted-foreground/15" />;
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border p-3">{children}</div>;
}

export function SectionPreview({ shape }: { shape: string }) {
  switch (shape) {
    case "hero":
      return (
        <div className="space-y-3 py-4 text-center">
          <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            надзаголовок
          </span>
          <p className="text-2xl font-semibold leading-tight text-foreground">{LOREM.title}</p>
          <p className="mx-auto max-w-md text-[12px] text-muted-foreground">{LOREM.lead}</p>
        </div>
      );

    case "hero-split":
      return (
        <div className="grid items-center gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xl font-semibold leading-tight text-foreground">{LOREM.title}</p>
            <p className="text-[12px] text-muted-foreground">{LOREM.lead}</p>
            <span className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">
              Кнопка
            </span>
          </div>
          <Fake />
        </div>
      );

    case "cards":
      return (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-foreground">{LOREM.short}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LOREM.items.map(t => (
              <Box key={t}>
                <p className="text-[12px] font-medium text-foreground">{t}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{LOREM.line}</p>
              </Box>
            ))}
          </div>
        </div>
      );

    case "badges":
      return (
        <div className="flex flex-wrap gap-1.5">
          {LOREM.chips.map(c => (
            <span key={c} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground">
              {c}
            </span>
          ))}
        </div>
      );

    case "steps":
      return (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-foreground">{LOREM.short}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LOREM.steps.map((t, i) => (
              <Box key={t}>
                <span className="text-[11px] font-semibold text-primary">{i + 1}</span>
                <p className="mt-0.5 text-[12px] font-medium text-foreground">{t}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{LOREM.line}</p>
              </Box>
            ))}
          </div>
        </div>
      );

    case "numbers":
      return (
        <div className="grid gap-2 sm:grid-cols-3">
          {LOREM.numbers.map(n => (
            <div key={n.label} className="rounded-lg border border-border p-3 text-center">
              <p className="text-xl font-semibold text-primary">{n.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{n.label}</p>
            </div>
          ))}
        </div>
      );

    case "two-columns":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {["Было", "Стало"].map(t => (
            <Box key={t}>
              <p className="text-[12px] font-medium text-foreground">{t}</p>
              <div className="mt-2 space-y-1.5">
                <Bar />
                <Bar w="85%" />
                <Bar w="60%" />
              </div>
            </Box>
          ))}
        </div>
      );

    case "marquee":
      return (
        <div className="overflow-hidden rounded-lg border border-border p-3">
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="shrink-0 rounded border border-border px-3 py-1.5 text-[11px] text-muted-foreground"
              >
                логотип
              </span>
            ))}
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="flex gap-3 border-l-2 border-primary/40 pl-3">
          <div className="size-10 shrink-0 rounded-full border border-dashed border-border" />
          <div>
            <p className="text-[13px] italic leading-relaxed text-foreground">«{LOREM.line}»</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Имя, должность</p>
          </div>
        </div>
      );

    case "statement":
      return (
        <p className="py-3 text-center text-lg font-medium leading-snug text-foreground">{LOREM.title}</p>
      );

    case "heading":
      return <p className="text-lg font-semibold text-foreground">{LOREM.short}</p>;

    case "list":
      return (
        <ul className="space-y-1.5">
          {LOREM.items.map(t => (
            <li key={t} className="flex gap-2 text-[12px] text-foreground">
              <span className="text-muted-foreground">•</span>
              {t}
            </li>
          ))}
        </ul>
      );

    case "figure":
      return (
        <div className="space-y-1.5">
          <Fake />
          <p className="text-center text-[11px] text-muted-foreground">Подпись под изображением</p>
        </div>
      );

    case "code":
      return (
        <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground">
          <p>const answer = 42</p>
          <p>export default answer</p>
        </div>
      );

    case "callout":
      return (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-3">
          <p className="text-[12px] font-medium text-foreground">{LOREM.short}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{LOREM.line}</p>
        </div>
      );

    case "panel":
      return (
        <Box>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">надзаголовок</p>
          <p className="mt-0.5 text-[13px] font-medium text-foreground">{LOREM.short}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{LOREM.line}</p>
        </Box>
      );

    case "table":
      return (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-3 gap-px bg-border">
            {["Колонка", "Колонка", "Колонка"].map((h, i) => (
              <div key={i} className="bg-muted/60 px-2 py-1.5 text-[11px] font-medium text-foreground">
                {h}
              </div>
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-background px-2 py-1.5">
                <Bar w={i % 3 === 0 ? "70%" : "50%"} />
              </div>
            ))}
          </div>
        </div>
      );

    case "docref":
      return (
        <Box>
          <p className="text-[12px] font-medium text-foreground">Название документа</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{LOREM.line}</p>
          <span className="mt-2 inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground">
            Скачать
          </span>
        </Box>
      );

    case "cta":
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
          <p className="text-[12px] text-foreground">{LOREM.line}</p>
          <span className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">
            Кнопка
          </span>
        </div>
      );

    // Форма неизвестна — рисуем текст. Вид виден, и это главное.
    case "text":
    default:
      return (
        <div className="space-y-1.5">
          <Bar />
          <Bar w="92%" />
          <Bar w="68%" />
        </div>
      );
  }
}
