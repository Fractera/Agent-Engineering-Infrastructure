// Финальный экран мастера запуска (шаг 25-6).
//
// 🔒 ЭТО НЕ ПОЗДРАВЛЕНИЕ, А ПОСЛЕДНЯЯ ВОЗМОЖНОСТЬ СКАЗАТЬ ГЛАВНОЕ. Человек дошёл
// до конца, он на подъёме и он ещё читает — другого такого места не будет. Поэтому
// центр экрана занимает не «молодец», а ОДНА фраза, которой он начнёт каждую
// следующую задачу: «Создай новый шаг разработки, в котором мы будем…». Она
// экономит ему деньги на каждом прогоне, и услышать её он должен здесь.
//
// 🔒 СЕРВЕРНЫЙ. Обработчиков нет; всё, что здесь есть, — текст и две ссылки.
//
// 🔒 КНОПКА «НАЧАТЬ СНАЧАЛА» ОСТАЁТСЯ ДОСТУПНОЙ И НА ФИНАЛЕ. Пройденный мастер не
// запирается: человек вправе завести другой проект, не разбираясь, как отменить
// пройденное.

import { PartyPopper, MessageCircleQuestion, Footprints, Mail } from "lucide-react";

export type FinishLabels = {
  title: string; lead: string;
  askTitle: string; askBody: string;
  stepsTitle: string; stepsBody: string; stepsPhrase: string;
  bye: string; contact: string;
};

export function LaunchFinish({ labels, email }: { labels: FinishLabels; email: string }) {
  return (
    <section className="mt-4 rounded-lg border border-green-500/40 bg-green-500/5 p-5">
      <div className="flex items-start gap-2.5">
        <PartyPopper size={18} className="mt-0.5 shrink-0 text-green-600" />
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">{labels.title}</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{labels.lead}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-md border border-border bg-background p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <MessageCircleQuestion size={13} className="shrink-0 text-muted-foreground" />
            {labels.askTitle}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{labels.askBody}</p>
        </div>

        <div className="rounded-md border border-orange-500/40 bg-orange-500/5 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Footprints size={13} className="shrink-0 text-orange-600" />
            {labels.stepsTitle}
          </p>
          {/* Сама фраза — крупно и отдельно: её будут копировать глазами. */}
          <p className="mt-2 rounded-md border border-orange-500/30 bg-background px-3 py-2 text-[13px] font-medium text-foreground">
            {labels.stepsPhrase}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{labels.stepsBody}</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{labels.bye}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Mail size={11} className="shrink-0" />
        {labels.contact}{" "}
        <a href={`mailto:${email}`} className="font-medium text-foreground underline">{email}</a>
      </p>
    </section>
  );
}
