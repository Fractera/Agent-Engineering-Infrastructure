"use client";

// ЭКРАН ВЫБОРА ПУТИ НА ОБРАЗЦЕ (шаг 28-2, 2026-08-27).
//
// 🔒 ОН НИЧЕГО НЕ ЗАПИСЫВАЕТ. Живой экран выбора зовёт `POST
// /api/config/launch/start-mode` и меняет состояние мастера владельца. Образец
// держит выбор в памяти вкладки и умирает вместе с ней: иначе показ образца
// двигал бы настоящий мастер, а человек, зашедший посмотреть на дизайн, менял бы
// себе режим старта.
//
// 🔒 ОСТРОВКУ ОТДАЮТСЯ ТОЛЬКО ЕГО СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. Тип не сужает
// рантайм: передашь объект целиком — по проводу уедет всё, что в нём есть, даже
// неотрисованное. ✗ дважды за шаг 25 в разметку попадал чужой словарь. Здесь
// островок принимает `labels` собственного типа, а страница собирает его
// перечислением полей.
//
// 🔒 ВЫБОР ВИДЕН, НО НЕ ЗАКРЫВАЕТ ЭКРАН. На живой вкладке выбор пути закрывает
// собой всё остальное — там это правильно. Здесь наоборот: владелец смотрит ОБА
// контейнера и сравнивает их, поэтому выбранный обводится, а не остаётся один.

import { useState } from "react";
import { Check } from "lucide-react";
import { PathCard } from "./path-card";
import { Small } from "@/components/ui/typography";

export type PathChoiceLabels = {
  starterBadge: string;
  starterTitle: string;
  starterLead: string;
  starterBullets: string[];
  starterMoreLabel: string;
  starterMore: string;
  starterCta: string;

  adoptBadge: string;
  adoptTitle: string;
  adoptLead: string;
  adoptBullets: string[];
  adoptMoreLabel: string;
  adoptMore: string;
  adoptCta: string;

  /** Строка под парой: какой путь выбран. */
  picked: string;
  /** Сброс выбора — образец обязан возвращаться в исходное состояние. */
  reset: string;
};

type Mode = "starter" | "adopt";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export function PathChoice({ labels }: { labels: PathChoiceLabels }) {
  const [picked, setPicked] = useState<Mode | null>(null);

  const button = (mode: Mode, cta: string, tone: "primary" | "amber") => {
    const isPicked = picked === mode;
    return (
      <button
        type="button"
        onClick={() => setPicked(mode)}
        aria-pressed={isPicked}
        className={[
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4",
          "text-[length:var(--fs-small)] font-medium transition-colors",
          tone === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-amber-500/50 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200",
        ].join(" ")}
      >
        {isPicked && <Check size={16} className="shrink-0" />}
        {cta}
      </button>
    );
  };

  return (
    <div>
      {/* 🔒 ДРУГ ПОД ДРУГОМ, А НЕ В ДВЕ КОЛОНКИ — замер, а не вкус. В колонке
          панели (48rem) пара колонок даёт каждому контейнеру ~21rem, и заголовок
          «Запуск проекта со стартового шаблона» ломается на ТРИ строки. Владелец
          назвал их «два больших контейнера»; контейнер шириной в треть экрана с
          трёхстрочным заголовком большим не выглядит. Друг под другом каждый
          получает всю ширину и читается одним взглядом. */}
      <div className="grid gap-5">
        <PathCard
          badge={labels.starterBadge}
          title={labels.starterTitle}
          lead={labels.starterLead}
          bullets={labels.starterBullets}
          moreLabel={labels.starterMoreLabel}
          more={labels.starterMore}
          tone="primary"
          selected={picked === "starter"}
        >
          {button("starter", labels.starterCta, "primary")}
        </PathCard>

        <PathCard
          badge={labels.adoptBadge}
          title={labels.adoptTitle}
          lead={labels.adoptLead}
          bullets={labels.adoptBullets}
          moreLabel={labels.adoptMoreLabel}
          more={labels.adoptMore}
          tone="amber"
          selected={picked === "adopt"}
        >
          {button("adopt", labels.adoptCta, "amber")}
        </PathCard>
      </div>

      {picked && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Small className="text-foreground" data-path-picked={picked}>
            {fill(labels.picked, {
              path: picked === "starter" ? labels.starterTitle : labels.adoptTitle,
            })}
          </Small>
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="text-[length:var(--fs-small)] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {labels.reset}
          </button>
        </div>
      )}
    </div>
  );
}
