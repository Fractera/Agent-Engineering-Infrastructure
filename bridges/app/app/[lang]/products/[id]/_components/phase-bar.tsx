// Полоса фаз продукта (2026-08-18). Серверный компонент.
//
// 🔒 ЧЕТЫРЕ ФАЗЫ — ПУТЬ, А НЕ НАБОР, поэтому они стоят в ряд и слева направо:
// предварительная → декомпозиция → разработка → анализ. Пройденные гаснут, текущая
// подсвечена, будущие ждут. Полоса отвечает на первый вопрос открывшего страницу —
// «где мы» — и отвечает им до всего остального.
//
// 🔒 СТАДИЯ НАЗВАНА СЛОВАМИ, А НЕ ТОЛЬКО ЦВЕТОМ. Цвет читается быстрее, но не
// говорит, что именно происходит: «в процессе» и «ревью» одинаково оранжевые.
// Одного цвета мало, одних слов — медленно; здесь и то и другое.

import type { ProductDossier, ProductPhase, ProductStage } from "@/lib/product-store";
import { PHASES } from "@/lib/product-store";
import { Small } from "../../_components/type";

/** Цвет фазы. Тот же, что у карточки в списке: одно состояние не имеет права выглядеть в двух местах по-разному. */
export function phaseTone(phase: ProductPhase, stage: ProductStage): "sky" | "amber" | "emerald" {
  if (phase === "intake") return "sky";
  if (phase === "analysis" && stage === "done") return "emerald";
  return "amber";
}

const TONE = {
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
} as const;

export function PhaseBar(
  { product, ui }: {
    product: ProductDossier;
    ui: {
      phases: Record<ProductPhase, { label: string; hint: string }>;
      stages: Record<ProductStage, string>;
    };
  },
) {
  const current = PHASES.indexOf(product.phase);
  const tone = TONE[phaseTone(product.phase, product.stage)];

  return (
    <div>
      <ol className="flex flex-wrap gap-1.5">
        {PHASES.map((phase, i) => {
          const done = i < current;
          const here = i === current;
          return (
            <li
              key={phase}
              className={`flex-1 basis-40 rounded-md border px-2.5 py-2 ${
                here ? tone : done
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : "border-dashed border-border text-muted-foreground/70"
              }`}
            >
              <p className="text-[12px] font-medium">
                <span className="mr-1.5 text-[10px] opacity-70">{i + 1}</span>
                {ui.phases[phase].label}
              </p>
              {here && <p className="mt-0.5 text-[11px]">{ui.stages[product.stage]}</p>}
            </li>
          );
        })}
      </ol>

      {/* Пояснение текущей фазы — одно, а не четыре: четыре подписи под четырьмя
          клетками читаются как инструкция по эксплуатации, а нужен ответ про
          сегодняшний день. */}
      <p className="mt-2">
        <Small>{ui.phases[product.phase].hint}</Small>
      </p>
    </div>
  );
}
