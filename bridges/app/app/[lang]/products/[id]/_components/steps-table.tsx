// Очередь шагов продукта (2026-08-18). Серверный компонент; правится статус — островком.
//
// 🔒 ПЛАН И РЕЗУЛЬТАТ РАСКРЫВАЮТСЯ, А НЕ ЛЕЖАТ В СТРОКЕ. Это абзацы, иногда на
// пол-экрана: показанные разом, они превращают очередь в простыню, и найти в ней
// «какой шаг сейчас» невозможно. Свёрнутые — таблица отвечает на этот вопрос
// первой строкой.
//
// 🔒 НОМЕР ПОСТОЯНЕН, ЗАКРЫТИЕ ЕГО НЕ МЕНЯЕТ. Завершённость — это статус, и только
// он; «закрытые шаги становятся просто номером» было бы вторым местом для одного
// факта.

import type { ProductDossier } from "@/lib/product-store";
import { GuideProse } from "../../../how-to-build/_components/guide-prose";
import { StepStatus } from "../../_components/step-status.client";
import { Muted, Small, Mono } from "../../_components/type";

const TONE: Record<string, string> = {
  new: "text-muted-foreground",
  "in-progress": "text-amber-700 dark:text-amber-300",
  blocked: "text-red-600 dark:text-red-400",
  done: "text-emerald-700 dark:text-emerald-300",
  cancelled: "text-muted-foreground line-through",
};

export function StepsTable(
  { product, ui }: {
    product: ProductDossier;
    ui: {
      empty: string; number: string; title: string; status: string; importance: string;
      cases: string; plan: string; result: string; saved: string; failed: string;
      statuses: Record<string, string>;
    };
  },
) {
  const steps = [...product.steps].sort((a, b) => a.number - b.number);
  if (steps.length === 0) return <Muted>{ui.empty}</Muted>;

  return (
    <div className="space-y-1.5">
      {steps.map((step) => (
        <details key={step.number} className="group rounded-md border border-border">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-2.5 py-2 hover:bg-muted/50">
            <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
            <Mono className="shrink-0">#{step.number}</Mono>
            <span className={`min-w-0 flex-1 text-[13px] leading-snug ${TONE[step.status] ?? ""}`}>
              {step.title}
            </span>
            <Small className="shrink-0">{ui.statuses[step.status] ?? step.status}</Small>
          </summary>

          <div className="border-t border-border px-2.5 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Статус правится здесь же: уводить за ним на другую страницу
                  значило бы просить человека покинуть очередь, чтобы её изменить. */}
              <StepStatus
                productId={product.id}
                number={step.number}
                status={step.status}
                labels={{ names: ui.statuses, saved: ui.saved, failed: ui.failed }}
              />
              <Small>{ui.importance}: {step.importance}</Small>
              {step.cases.length > 0 && <Small>{ui.cases}: {step.cases.join(", ")}</Small>}
            </div>

            {step.plan && (
              <div className="mt-2.5">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{ui.plan}</p>
                <GuideProse markdown={step.plan} />
              </div>
            )}

            {step.result && (
              <div className="mt-2.5">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{ui.result}</p>
                <GuideProse markdown={step.result} />
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
