"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DiagramCanvasV2 } from "./canvas.client";
import { graphToFlow } from "./graph-to-flow";
import type { DiagramComponents, DiagramGraph } from "../types/diagram";
import type { DiagramVM } from "./graph-to-flow";

// ДИАГРАММА (дев-слой) — САМОДОСТАТОЧНЫЙ монтаж холста: читает граф и компоненты из ядра САМОЙ
// автоматизации через её дверь `api/core` (относительным путём от адреса страницы) и рисует канвас.
//
// 🔒 ПОЧЕМУ ЗДЕСЬ, А НЕ В ПАПКЕ АВТОМАТИЗАЦИИ (решение владельца 2026-07-24). Диаграмма — ПЛАТФОРМЕННЫЙ
// ВИД над ядром, одинаковый для всех автоматизаций: холст рисует `graph.nodes/edges`, и своей логики у
// конкретной автоматизации в нём нет. Копия в каждой папке означала бы N расходящихся копий — «улучшил»
// в одной, и она больше не совместима с остальными, а переиспользование между аккаунтами ломается.
// Данные принадлежат автоматизации, вид — платформе. Агенту-кодеру править этот код ЗАПРЕЩЕНО
// (AGENTS.md §0a): он меняет только `graph.*` в ядре, а вид следует за данными сам.

const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

export function Diagram({ lang, readOnly = false }: { lang: string; readOnly?: boolean }) {
  const [vm, setVm] = useState<DiagramVM | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [g, c] = await Promise.all([
          fetch(`${apiBase()}/core?select=graph`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${apiBase()}/core?select=components`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!alive || !g) return;
        setVm(graphToFlow(g as DiagramGraph, (c ?? undefined) as DiagramComponents | undefined));
      } catch { /* нет двери — холст просто не появится */ }
    })();
    return () => { alive = false; };
  }, []);

  if (!vm) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </p>
    );
  }
  return <DiagramCanvasV2 vm={vm} lang={lang} readOnly={readOnly} />;
}
