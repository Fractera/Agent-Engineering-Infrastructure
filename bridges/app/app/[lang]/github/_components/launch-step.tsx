// Блок ОДНОГО шага мастера запуска (шаг 25-2).
//
// 🔒 НА СТРАНИЦЕ ОДНОВРЕМЕННО ЖИВЁТ РОВНО ОДИН ТАКОЙ БЛОК. Это решение владельца
// дословно: «до того пока человек не пройдёт первый шаг, ему не нужно показывать
// никакие другие шаги». Пройденные свёрнуты в зелёные бусины верёвочки, будущих
// не видно вовсе. Показанное действие читается как требуемое — четыре требования
// на входе ровно то, из-за чего настройку бросали.
//
// 🔒 СЕРВЕРНЫЙ. Слова приходят пропсами, словарь панели в браузер не уезжает;
// содержимое шага (форма, кнопка проверки, чекбокс) вкладывается как `children` и
// само решает, островок оно или разметка.
//
// 🔒 РОД ШАГА ВИДЕН ЧЕЛОВЕКУ. `verified` закрывает машина — у такого шага стоит
// пометка «проверяет система», и галочки для него нет. `checked` закрывает
// человек. Молчаливая разница обманывала бы: у одних шагов галочка есть, у
// других нет, и без объяснения это читается как поломка.

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import type { LaunchStepKind } from "@/lib/launch.shared";

export type LaunchStepLabels = {
  /** «Шаг {n} из {total}» — тот же шаблон, что у верёвочки. */
  stepOf: string;
  /** «Закрывает система» — пометка машинного шага. */
  machineOnly: string;
};

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function LaunchStep(
  { index, total, title, lead, kind, labels, children }:
  {
    /** 0-based номер шага в списке своей двери. */
    index: number;
    total: number;
    title: string;
    lead: string;
    kind: LaunchStepKind;
    labels: LaunchStepLabels;
    children: ReactNode;
  },
) {
  return (
    <section className="mt-4 rounded-lg border border-border p-4" data-launch-step={index}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {fill(labels.stepOf, { n: index + 1, total })}
        </span>
        {kind === "verified" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
            <Lock size={8} />
            {labels.machineOnly}
          </span>
        )}
      </div>

      <h2 className="mt-1.5 text-[13px] font-medium text-foreground">{title}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{lead}</p>

      <div className="mt-3">{children}</div>
    </section>
  );
}
