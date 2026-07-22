"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DiagramVM, DiagramVMNode } from "./graph-to-flow";

// КАНВАС ДИАГРАММЫ v2 — READ-ONLY. Рендер узлов взят ОДИН-К-ОДНОМУ из канваса v1
// (_shared/components/diagram-canvas.client.tsx: прямоугольный рабочий узел + фиолетовый КВАДРАТ для
// condition), но БЕЗ Builder-инструментов, БЕЗ БД-поллинга и БЕЗ правки — потому что «логика построения
// дерева» (её мы не переиспользуем) в v2 живёт в типизированном ядре automation.json, а не в БД. Канвас
// скопирован ВНУТРЬ папки (закон 0: самодостаточность); единственная несобственная зависимость —
// @xyflow/react — санкционирована владельцем 2026-07-22 именно для диаграммы.

// ─── i18n подписей (правило 4г: новые строки админ/проектного слоя — на 10 языках) ─────────────────────
type Lang = "en" | "es" | "fr" | "it" | "ru" | "de" | "pt" | "pl" | "tr" | "nl";
type Labels = { caption: string; function: string; accepts: string; returns: string; close: string; hidden: string };
const DICT: Record<Lang, Labels> = {
  en: { caption: "Frozen template — every node is a hidden door until the automation is born from use cases.", function: "Function", accepts: "Accepts", returns: "Returns", close: "Close", hidden: "hidden" },
  es: { caption: "Plantilla congelada: cada nodo es una puerta oculta hasta que la automatización nazca de los casos de uso.", function: "Función", accepts: "Acepta", returns: "Devuelve", close: "Cerrar", hidden: "oculto" },
  fr: { caption: "Modèle figé — chaque nœud est une porte cachée jusqu'à ce que l'automatisation naisse des cas d'usage.", function: "Fonction", accepts: "Accepte", returns: "Renvoie", close: "Fermer", hidden: "caché" },
  it: { caption: "Modello congelato: ogni nodo è una porta nascosta finché l'automazione non nasce dai casi d'uso.", function: "Funzione", accepts: "Accetta", returns: "Restituisce", close: "Chiudi", hidden: "nascosto" },
  ru: { caption: "Замороженный шаблон — каждый узел скрытая дверь, пока автоматизация не родится из пользовательских кейсов.", function: "Функция", accepts: "Принимает", returns: "Возвращает", close: "Закрыть", hidden: "скрыт" },
  de: { caption: "Eingefrorene Vorlage — jeder Knoten ist eine verborgene Tür, bis die Automatisierung aus Anwendungsfällen entsteht.", function: "Funktion", accepts: "Nimmt an", returns: "Gibt zurück", close: "Schließen", hidden: "verborgen" },
  pt: { caption: "Modelo congelado — cada nó é uma porta oculta até a automação nascer dos casos de uso.", function: "Função", accepts: "Aceita", returns: "Retorna", close: "Fechar", hidden: "oculto" },
  pl: { caption: "Zamrożony szablon — każdy węzeł to ukryte drzwi, dopóki automatyzacja nie narodzi się z przypadków użycia.", function: "Funkcja", accepts: "Przyjmuje", returns: "Zwraca", close: "Zamknij", hidden: "ukryty" },
  tr: { caption: "Dondurulmuş şablon — otomasyon kullanım senaryolarından doğana kadar her düğüm gizli bir kapıdır.", function: "İşlev", accepts: "Alır", returns: "Döndürür", close: "Kapat", hidden: "gizli" },
  nl: { caption: "Bevroren sjabloon — elke node is een verborgen deur totdat de automatisering uit use-cases ontstaat.", function: "Functie", accepts: "Accepteert", returns: "Retourneert", close: "Sluiten", hidden: "verborgen" },
};

type CanvasNodeData = DiagramVMNode & { selected: boolean };
type CanvasNode = Node<CanvasNodeData, "diagram">;

function DiagramNode({ data }: NodeProps<CanvasNode>) {
  // CONDITION-узел (v1 2026-07-15) — рисуется КВАДРАТОМ в фиолетовом, чтобы с первого взгляда читался как
  // другой вид, чем прямоугольные рабочие узлы. Копия рендера v1.
  if (data.isCondition) {
    return (
      <div
        className={`relative flex aspect-square min-h-[5.5rem] min-w-[5.5rem] max-w-[10rem] items-center justify-center rounded-md border-2 bg-violet-500/5 p-2 text-center shadow-sm ${
          data.selected ? "border-violet-500 ring-1 ring-violet-500" : "border-violet-500/60"
        } ${data.hidden ? "border-dashed opacity-70" : ""}`}
        title={data.description}
      >
        <Handle type="target" position={Position.Left} />
        <span className="break-words text-[11px] font-medium leading-tight">{data.name}</span>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }
  return (
    <div
      className={`relative w-48 rounded-md border bg-background px-3 py-2 text-sm shadow-sm ${
        data.selected ? "border-primary ring-1 ring-primary" : "border-border"
      } ${data.hidden ? "border-dashed opacity-80" : ""}`}
      title={data.description}
    >
      <Handle type="target" position={Position.Left} />
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {data.kind}
        </span>
        {data.ioType && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">{data.ioType}</span>
        )}
      </div>
      <p className="truncate font-medium">{data.name}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{data.fn.name}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { diagram: DiagramNode };

// центрируем каждую колонку по вертикали, чтобы разные по высоте группы (вход 7 · середина 3 · выход 9)
// читались как три плоскости, а рабочий путь шёл слева направо
const COL_X = 340;
const ROW_Y = 118;

export function DiagramCanvasV2({ vm, lang }: { vm: DiagramVM; lang: string }) {
  const L = DICT[(lang as Lang) in DICT ? (lang as Lang) : "en"];
  const [activeId, setActiveId] = useState<string | null>(null);

  const rowsPerCol = useMemo(() => {
    const max = new Map<number, number>();
    for (const n of vm.nodes) max.set(n.col, Math.max(max.get(n.col) ?? 0, n.row + 1));
    return max;
  }, [vm.nodes]);
  const tallest = useMemo(() => Math.max(1, ...[...rowsPerCol.values()]), [rowsPerCol]);

  const flowNodes = useMemo<CanvasNode[]>(
    () =>
      vm.nodes.map((n) => {
        const rows = rowsPerCol.get(n.col) ?? 1;
        const yOffset = ((tallest - rows) * ROW_Y) / 2; // вертикальное центрирование колонки
        return {
          id: n.id,
          type: "diagram" as const,
          position: { x: n.col * COL_X, y: yOffset + n.row * ROW_Y },
          data: { ...n, selected: n.id === activeId },
          draggable: false,
          connectable: false,
        };
      }),
    [vm.nodes, rowsPerCol, tallest, activeId],
  );

  const flowEdges = useMemo<Edge[]>(
    () => vm.edges.map((e) => ({ id: e.id, source: e.from, target: e.to, animated: !e.hidden })),
    [vm.edges],
  );

  const active = activeId ? vm.nodes.find((n) => n.id === activeId) ?? null : null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{L.caption}</p>
      <div className="relative h-[68vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_, node) => setActiveId(node.id)}
          onPaneClick={() => setActiveId(null)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          deleteKeyCode={null}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
        {active && (
          <aside className="absolute inset-y-0 right-0 w-80 space-y-3 overflow-y-auto border-l bg-background/95 p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{active.name}</p>
                <p className="text-xs text-muted-foreground">
                  {active.kind}
                  {active.ioType ? ` · ${active.ioType}` : ""}
                  {active.hidden ? ` · ${L.hidden}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label={L.close}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setActiveId(null)}
              >
                ✕
              </button>
            </div>
            {active.description && <p className="whitespace-pre-wrap text-muted-foreground">{active.description}</p>}
            <div className="space-y-1 rounded-md border p-2">
              <p className="text-xs font-medium">
                {L.function}: <code className="text-[11px]">{active.fn.name}</code>
              </p>
              <p className="text-muted-foreground">{active.fn.summary}</p>
              <p className="text-xs">
                <span className="font-medium">{L.accepts}:</span> {active.fn.accepts}
              </p>
              <p className="text-xs">
                <span className="font-medium">{L.returns}:</span> {active.fn.returns}
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
