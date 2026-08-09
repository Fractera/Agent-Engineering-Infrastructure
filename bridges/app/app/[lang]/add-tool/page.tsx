// Раздел «Добавить инструмент» (шаг 501, решение владельца 2026-08-08).
//
// Завершает перечень инструментов проекта: после того как названы все склады и
// движки, естественный следующий вопрос — «а если нужен ещё один».
//
// Страница СТАТИЧЕСКАЯ и без единого островка: здесь нет ни данных, ни действий —
// только объяснение и адрес. Формы заявки нарочно нет: письмо от живого человека
// с описанием задачи полезнее анкеты, а форма потребовала бы почтовой службы,
// хранения черновиков и обработки отказов ради того, что делает `mailto`.
//
// Текст короткий намеренно (владелец: «особенно тут не нужно много писать»).
// Страница должна назвать возможность и дать адрес — длинный текст её ослабил бы.

import { Mail } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";

export default async function AddToolPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.addTool;

  return (
    <PageShell lang={lang} slug="add-tool" s={s} title={s.pages["add-tool"].title} hint={s.pages["add-tool"].hint}>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{t.body}</p>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted-foreground">
        {[t.exampleImages, t.exampleVideo, t.exampleFlow, t.exampleOther].map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{t.how}</p>

      <a
        href={`mailto:admin@fractera.ai?subject=${encodeURIComponent(t.mailSubject)}`}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-muted"
      >
        <Mail size={13} className="text-muted-foreground" />
        admin@fractera.ai
      </a>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">{t.note}</p>
    </PageShell>
  );
}
