"use client";

import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import { HammerIcon, SplineIcon, EyeIcon, EyeOffIcon } from "../chrome/icons";

// КАНВАС ДИАГРАММЫ v2. Рендер узлов взят ОДИН-К-ОДНОМУ из канваса v1
// (_shared/components/diagram-canvas.client.tsx: прямоугольный рабочий узел + фиолетовый КВАДРАТ для
// condition), и оттуда же взяты ДВА РЕЖИМА СТРОИТЕЛЬСТВА — «строить узлы» и «строить рёбра»: те же две
// кнопки, те же иконки, то же правило «включение одного закрывает другой». Не переиспользуется только
// логика построения дерева: в v2 источник истины — типизированное ядро automation.json, а не БД.
// Канвас скопирован ВНУТРЬ папки (закон 0: самодостаточность); единственная несобственная зависимость —
// @xyflow/react — санкционирована владельцем 2026-07-22 именно для диаграммы.
//
// ─── ЗАКОН ВИДИМОСТИ (владелец, 2026-07-22) ────────────────────────────────────────────────────────
// Скрытый узел — это дверь, которой владелец не пользуется. Поэтому:
//   • В ОБЫЧНОМ режиме скрытых узлов на холсте НЕТ ВООБЩЕ, и рёбер к ним тоже нет. Автоматизация
//     работает, игнорируя их присутствие: исполнитель и так ходит только по видимым узлам и рёбрам.
//   • В режиме СТРОИТЕЛЬСТВА они появляются — бледно-фиолетовыми, с бейджем «Hidden», а их рёбра
//     рисуются фиолетовым пунктиром (выбор из двух, предложенных владельцем: так граф остаётся
//     читаемым — видно, КУДА дверь встанет, когда её откроют).
//   • Клик по узлу в режиме строительства открывает ящик справа с переключателем «скрыть / показать».
// Законы, кого можно переключать, держит дверь `api/patch` (op: "visibility"), а не эта разметка:
// середину — только пока автоматизация ещё стартовый шаблон; последний видимый вход и последний
// видимый выход скрыть нельзя. Отказ приходит текстом и показывается прямо в ящике — отказ и есть
// обучение. Дублировать эти проверки здесь запрещено: два источника закона разойдутся.

// ─── i18n подписей (правило 4г: новые строки админ/проектного слоя — на 10 языках) ─────────────────────
type Lang = "en" | "es" | "fr" | "it" | "ru" | "de" | "pt" | "pl" | "tr" | "nl";
type Labels = {
  caption: string;
  function: string;
  accepts: string;
  returns: string;
  close: string;
  hidden: string;
  buildNodes: string;
  closeBuildNodes: string;
  buildEdges: string;
  closeBuildEdges: string;
  nodesHint: string;
  edgesHint: string;
  viewHint: string;
  hide: string;
  show: string;
  deleteEdge: string;
  emptyBuild: string;
  working: string;
};
const DICT: Record<Lang, Labels> = {
  en: {
    caption: "Hidden nodes are doors you do not use — they are shown only while building.",
    function: "Function", accepts: "Accepts", returns: "Returns", close: "Close", hidden: "hidden",
    buildNodes: "Build nodes", closeBuildNodes: "Close node mode",
    buildEdges: "Build edges", closeBuildEdges: "Close edge mode",
    nodesHint: "Node mode — click a node to show or hide it; hidden doors are pale violet",
    edgesHint: "Edge mode — drag from a node's edge to another node to wire them; click an edge, then Delete edge",
    viewHint: "View — only the channels you opened",
    hide: "Hide node", show: "Show node", deleteEdge: "Delete edge",
    emptyBuild: "Every node is hidden. Open node mode to unhide the doors you need.",
    working: "Saving…",
  },
  es: {
    caption: "Los nodos ocultos son puertas que no usas: solo se ven en modo construcción.",
    function: "Función", accepts: "Acepta", returns: "Devuelve", close: "Cerrar", hidden: "oculto",
    buildNodes: "Construir nodos", closeBuildNodes: "Cerrar modo nodos",
    buildEdges: "Construir aristas", closeBuildEdges: "Cerrar modo aristas",
    nodesHint: "Modo nodos: haz clic en un nodo para mostrarlo u ocultarlo; las puertas ocultas son violeta pálido",
    edgesHint: "Modo aristas: arrastra desde el borde de un nodo hasta otro para conectarlos; haz clic en una arista y luego «Eliminar arista»",
    viewHint: "Vista: solo los canales que abriste",
    hide: "Ocultar nodo", show: "Mostrar nodo", deleteEdge: "Eliminar arista",
    emptyBuild: "Todos los nodos están ocultos. Abre el modo nodos para mostrar las puertas que necesites.",
    working: "Guardando…",
  },
  fr: {
    caption: "Les nœuds cachés sont des portes que vous n'utilisez pas — visibles uniquement en construction.",
    function: "Fonction", accepts: "Accepte", returns: "Renvoie", close: "Fermer", hidden: "caché",
    buildNodes: "Construire des nœuds", closeBuildNodes: "Fermer le mode nœuds",
    buildEdges: "Construire des liens", closeBuildEdges: "Fermer le mode liens",
    nodesHint: "Mode nœuds — cliquez sur un nœud pour l'afficher ou le masquer ; les portes cachées sont violet pâle",
    edgesHint: "Mode liens — tirez du bord d'un nœud vers un autre pour les relier ; cliquez sur un lien puis « Supprimer le lien »",
    viewHint: "Vue — seulement les canaux que vous avez ouverts",
    hide: "Masquer le nœud", show: "Afficher le nœud", deleteEdge: "Supprimer le lien",
    emptyBuild: "Tous les nœuds sont cachés. Ouvrez le mode nœuds pour afficher les portes nécessaires.",
    working: "Enregistrement…",
  },
  it: {
    caption: "I nodi nascosti sono porte che non usi: visibili solo in modalità costruzione.",
    function: "Funzione", accepts: "Accetta", returns: "Restituisce", close: "Chiudi", hidden: "nascosto",
    buildNodes: "Costruire nodi", closeBuildNodes: "Chiudi modalità nodi",
    buildEdges: "Costruire collegamenti", closeBuildEdges: "Chiudi modalità collegamenti",
    nodesHint: "Modalità nodi — clicca un nodo per mostrarlo o nasconderlo; le porte nascoste sono viola pallido",
    edgesHint: "Modalità collegamenti — trascina dal bordo di un nodo a un altro per collegarli; clicca un collegamento, poi «Elimina collegamento»",
    viewHint: "Vista — solo i canali che hai aperto",
    hide: "Nascondi nodo", show: "Mostra nodo", deleteEdge: "Elimina collegamento",
    emptyBuild: "Tutti i nodi sono nascosti. Apri la modalità nodi per mostrare le porte che ti servono.",
    working: "Salvataggio…",
  },
  ru: {
    caption: "Скрытые узлы — двери, которыми вы не пользуетесь: они видны только в режиме строительства.",
    function: "Функция", accepts: "Принимает", returns: "Возвращает", close: "Закрыть", hidden: "скрыт",
    buildNodes: "Строить узлы", closeBuildNodes: "Закрыть режим узлов",
    buildEdges: "Строить рёбра", closeBuildEdges: "Закрыть режим рёбер",
    nodesHint: "Режим узлов — кликните по узлу, чтобы показать или скрыть его; скрытые двери бледно-фиолетовые",
    edgesHint: "Режим рёбер — потяните от края узла к другому узлу, чтобы связать; клик по ребру, затем «Удалить ребро»",
    viewHint: "Просмотр — только те каналы, которые вы открыли",
    hide: "Скрыть узел", show: "Показать узел", deleteEdge: "Удалить ребро",
    emptyBuild: "Все узлы скрыты. Откройте режим узлов, чтобы раскрыть нужные двери.",
    working: "Сохраняю…",
  },
  de: {
    caption: "Verborgene Knoten sind Türen, die Sie nicht nutzen — sichtbar nur im Baumodus.",
    function: "Funktion", accepts: "Nimmt an", returns: "Gibt zurück", close: "Schließen", hidden: "verborgen",
    buildNodes: "Knoten bauen", closeBuildNodes: "Knoten-Modus schließen",
    buildEdges: "Kanten bauen", closeBuildEdges: "Kanten-Modus schließen",
    nodesHint: "Knoten-Modus — Knoten anklicken, um ihn zu zeigen oder zu verbergen; verborgene Türen sind blassviolett",
    edgesHint: "Kanten-Modus — vom Rand eines Knotens zu einem anderen ziehen, um sie zu verbinden; Kante anklicken, dann „Kante löschen“",
    viewHint: "Ansicht — nur die von Ihnen geöffneten Kanäle",
    hide: "Knoten verbergen", show: "Knoten zeigen", deleteEdge: "Kante löschen",
    emptyBuild: "Alle Knoten sind verborgen. Öffnen Sie den Knoten-Modus, um die benötigten Türen zu zeigen.",
    working: "Speichern…",
  },
  pt: {
    caption: "Nós ocultos são portas que você não usa — visíveis apenas no modo construção.",
    function: "Função", accepts: "Aceita", returns: "Retorna", close: "Fechar", hidden: "oculto",
    buildNodes: "Construir nós", closeBuildNodes: "Fechar modo nós",
    buildEdges: "Construir arestas", closeBuildEdges: "Fechar modo arestas",
    nodesHint: "Modo nós — clique num nó para mostrá-lo ou ocultá-lo; as portas ocultas são violeta claro",
    edgesHint: "Modo arestas — arraste da borda de um nó até outro para ligá-los; clique numa aresta e depois «Excluir aresta»",
    viewHint: "Visualização — apenas os canais que você abriu",
    hide: "Ocultar nó", show: "Mostrar nó", deleteEdge: "Excluir aresta",
    emptyBuild: "Todos os nós estão ocultos. Abra o modo nós para mostrar as portas necessárias.",
    working: "Salvando…",
  },
  pl: {
    caption: "Ukryte węzły to drzwi, których nie używasz — widoczne tylko w trybie budowania.",
    function: "Funkcja", accepts: "Przyjmuje", returns: "Zwraca", close: "Zamknij", hidden: "ukryty",
    buildNodes: "Buduj węzły", closeBuildNodes: "Zamknij tryb węzłów",
    buildEdges: "Buduj krawędzie", closeBuildEdges: "Zamknij tryb krawędzi",
    nodesHint: "Tryb węzłów — kliknij węzeł, aby go pokazać lub ukryć; ukryte drzwi są bladofioletowe",
    edgesHint: "Tryb krawędzi — przeciągnij od brzegu węzła do innego, aby je połączyć; kliknij krawędź, potem «Usuń krawędź»",
    viewHint: "Widok — tylko kanały, które otworzyłeś",
    hide: "Ukryj węzeł", show: "Pokaż węzeł", deleteEdge: "Usuń krawędź",
    emptyBuild: "Wszystkie węzły są ukryte. Otwórz tryb węzłów, aby pokazać potrzebne drzwi.",
    working: "Zapisywanie…",
  },
  tr: {
    caption: "Gizli düğümler kullanmadığınız kapılardır — yalnızca inşa modunda görünür.",
    function: "İşlev", accepts: "Alır", returns: "Döndürür", close: "Kapat", hidden: "gizli",
    buildNodes: "Düğüm kur", closeBuildNodes: "Düğüm modunu kapat",
    buildEdges: "Kenar kur", closeBuildEdges: "Kenar modunu kapat",
    nodesHint: "Düğüm modu — göstermek veya gizlemek için bir düğüme tıklayın; gizli kapılar soluk mordur",
    edgesHint: "Kenar modu — bağlamak için bir düğümün kenarından diğerine sürükleyin; bir kenara tıklayın, sonra «Kenarı sil»",
    viewHint: "Görünüm — yalnızca açtığınız kanallar",
    hide: "Düğümü gizle", show: "Düğümü göster", deleteEdge: "Kenarı sil",
    emptyBuild: "Tüm düğümler gizli. İhtiyacınız olan kapıları göstermek için düğüm modunu açın.",
    working: "Kaydediliyor…",
  },
  nl: {
    caption: "Verborgen nodes zijn deuren die je niet gebruikt — alleen zichtbaar in de bouwmodus.",
    function: "Functie", accepts: "Accepteert", returns: "Retourneert", close: "Sluiten", hidden: "verborgen",
    buildNodes: "Nodes bouwen", closeBuildNodes: "Node-modus sluiten",
    buildEdges: "Verbindingen bouwen", closeBuildEdges: "Verbindingsmodus sluiten",
    nodesHint: "Node-modus — klik op een node om deze te tonen of te verbergen; verborgen deuren zijn lichtpaars",
    edgesHint: "Verbindingsmodus — sleep van de rand van een node naar een andere om ze te verbinden; klik op een verbinding en dan «Verbinding verwijderen»",
    viewHint: "Weergave — alleen de kanalen die je hebt geopend",
    hide: "Node verbergen", show: "Node tonen", deleteEdge: "Verbinding verwijderen",
    emptyBuild: "Alle nodes zijn verborgen. Open de node-modus om de gewenste deuren te tonen.",
    working: "Opslaan…",
  },
};

type Mode = "view" | "nodes" | "edges";
type CanvasNodeData = DiagramVMNode & { selected: boolean; build: boolean };
type CanvasNode = Node<CanvasNodeData, "diagram">;

function DiagramNode({ data }: NodeProps<CanvasNode>) {
  // Скрытая дверь в режиме строительства — БЛЕДНО-ФИОЛЕТОВАЯ с бейджем «Hidden» (владелец 2026-07-22).
  // В обычном режиме такой узел вообще не доезжает до рендера — он отфильтрован выше.
  const pale = data.hidden && data.build;

  // CONDITION-узел (v1 2026-07-15) — рисуется КВАДРАТОМ в фиолетовом, чтобы с первого взгляда читался как
  // другой вид, чем прямоугольные рабочие узлы. Копия рендера v1.
  if (data.isCondition) {
    return (
      <div
        className={`relative flex aspect-square min-h-[5.5rem] min-w-[5.5rem] max-w-[10rem] items-center justify-center rounded-md border-2 bg-violet-500/5 p-2 text-center shadow-sm ${
          data.selected ? "border-violet-500 ring-1 ring-violet-500" : "border-violet-500/60"
        } ${pale ? "border-dashed border-violet-400/70 bg-violet-400/10 opacity-70" : ""}`}
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
      } ${pale ? "border-dashed border-violet-400/70 bg-violet-400/10 text-violet-700 opacity-80 dark:text-violet-300" : ""}`}
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
        {pale && (
          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Hidden
          </span>
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

// Кнопка режима — вид кнопки v1 (`variant default|outline`, `size sm`) воспроизведён классами:
// закон 0 запрещает импортировать платформенный <Button>, но владелец обязан узнать кнопку по виду.
function ModeButton({
  active, onClick, disabled, children,
}: { active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function DiagramCanvasV2({
  vm,
  lang,
  readOnly = false,
}: {
  vm: DiagramVM;
  lang: string;
  /** Публичная поверхность — плоскость просмотра: никаких инструментов управления (закон ROUTE-V3 3). */
  readOnly?: boolean;
}) {
  const L = DICT[(lang as Lang) in DICT ? (lang as Lang) : "en"];
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const build = mode !== "view";

  // ─── ЧТО ВООБЩЕ ПОПАДАЕТ НА ХОЛСТ ────────────────────────────────────────────────────────────────
  // Обычный режим: только видимые узлы и только рёбра между двумя видимыми — скрытых дверей нет
  // вовсе. Режим строительства: весь инвентарь, скрытое бледно-фиолетовым.
  const shownNodes = useMemo(() => (build ? vm.nodes : vm.nodes.filter((n) => !n.hidden)), [vm.nodes, build]);
  const shownIds = useMemo(() => new Set(shownNodes.map((n) => n.id)), [shownNodes]);
  const shownEdges = useMemo(
    () => vm.edges.filter((e) => shownIds.has(e.from) && shownIds.has(e.to)),
    [vm.edges, shownIds],
  );

  // Ряды пересчитываются ПОСЛЕ фильтрации: иначе на месте скрытых дверей остались бы дыры в колонке.
  const placed = useMemo(() => {
    const rowByCol = new Map<number, number>();
    return shownNodes.map((n) => {
      const row = rowByCol.get(n.col) ?? 0;
      rowByCol.set(n.col, row + 1);
      return { node: n, row };
    });
  }, [shownNodes]);
  const rowsPerCol = useMemo(() => {
    const max = new Map<number, number>();
    for (const p of placed) max.set(p.node.col, Math.max(max.get(p.node.col) ?? 0, p.row + 1));
    return max;
  }, [placed]);
  const tallest = useMemo(() => Math.max(1, ...[...rowsPerCol.values()]), [rowsPerCol]);

  const flowNodes = useMemo<CanvasNode[]>(
    () =>
      placed.map(({ node, row }) => {
        const rows = rowsPerCol.get(node.col) ?? 1;
        const yOffset = ((tallest - rows) * ROW_Y) / 2; // вертикальное центрирование колонки
        return {
          id: node.id,
          type: "diagram" as const,
          position: { x: node.col * COL_X, y: yOffset + row * ROW_Y },
          data: { ...node, selected: node.id === activeId, build },
          draggable: false,
          connectable: mode === "edges",
        };
      }),
    [placed, rowsPerCol, tallest, activeId, build, mode],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      shownEdges.map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        animated: !e.hidden,
        selected: e.id === selectedEdge,
        // ребро скрытой двери в режиме строительства — фиолетовый пунктир: видно, куда дверь встанет
        style: e.hidden ? { stroke: "#a78bfa", strokeDasharray: "6 4" } : undefined,
      })),
    [shownEdges, selectedEdge],
  );

  const active = activeId ? vm.nodes.find((n) => n.id === activeId) ?? null : null;

  // ─── ЕДИНСТВЕННЫЙ КАНАЛ ПРАВКИ ───────────────────────────────────────────────────────────────────
  // Любое изменение уходит в дверь `api/patch`, которая держит законы и пишет ядро атомарно. Ответ-отказ
  // показывается владельцу дословно: дверь объясняет, ПОЧЕМУ нельзя, и это объяснение ценнее нашего.
  const callPatch = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setRefusal(null);
      try {
        // Адрес двери берётся из собственного пути страницы — то же соглашение, что у меню и у
        // отправки задания (`chrome/*.client.tsx`): папка не знает своего маршрута на сборке,
        // но браузер знает его в момент клика, и папку можно переносить и клонировать.
        const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
        const res = await fetch(`${apiBase}/patch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] };
        if (!res.ok) {
          setRefusal(data.errors?.join("\n") ?? data.error ?? `request failed (${res.status})`);
          return false;
        }
        // Ядро читается с диска на каждый запрос — обновление сервера показывает свежий граф без пересборки.
        startTransition(() => router.refresh());
        return true;
      } catch (e) {
        setRefusal(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const toggleVisibility = useCallback(
    async (node: DiagramVMNode) => {
      const ok = await callPatch({
        op: "visibility",
        address: { object: "node", cuid: node.id },
        state: node.hidden ? "visible" : "hidden",
      });
      if (ok) setActiveId(null);
    },
    [callPatch],
  );

  const working = busy || pending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {working ? (
            <span className="text-primary">{L.working}</span>
          ) : mode === "nodes" ? (
            <span className="text-primary">{L.nodesHint}</span>
          ) : mode === "edges" ? (
            <span className="text-primary">{L.edgesHint}</span>
          ) : (
            L.viewHint
          )}
        </p>
        {/* Две кнопки строительства — факсимиле v1, включая закон «включение одного закрывает другой»:
            холст всегда ровно в одном из состояний просмотр / узлы / рёбра. На публичной поверхности
            инструментов управления нет вовсе. */}
        <div className={readOnly ? "hidden" : "flex flex-wrap justify-end gap-2"}>
          {mode !== "edges" && (
            <ModeButton
              active={mode === "nodes"}
              disabled={working}
              onClick={() => {
                setMode((m) => (m === "nodes" ? "view" : "nodes"));
                setActiveId(null);
                setRefusal(null);
              }}
            >
              <HammerIcon className="size-3.5" />
              {mode === "nodes" ? L.closeBuildNodes : L.buildNodes}
            </ModeButton>
          )}
          {mode !== "nodes" && (
            <ModeButton
              active={mode === "edges"}
              disabled={working}
              onClick={() => {
                setMode((m) => (m === "edges" ? "view" : "edges"));
                setActiveId(null);
                setSelectedEdge(null);
                setRefusal(null);
              }}
            >
              <SplineIcon className="size-3.5" />
              {mode === "edges" ? L.closeBuildEdges : L.buildEdges}
            </ModeButton>
          )}
          {mode === "edges" && selectedEdge && (
            <ModeButton
              active={false}
              disabled={working}
              onClick={() => void callPatch({ op: "disconnect", edge: selectedEdge }).then(() => setSelectedEdge(null))}
            >
              <span className="text-rose-600">{L.deleteEdge}</span>
            </ModeButton>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{L.caption}</p>
      {refusal && (
        // Отказ двери — дословно. Он объясняет закон, а не прячет его за «нельзя».
        <p className="whitespace-pre-wrap rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
          {refusal}
        </p>
      )}
      <div className="relative h-[68vh] w-full overflow-hidden rounded-lg border">
        {flowNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {L.emptyBuild}
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_, node) => setActiveId(node.id)}
            onPaneClick={() => {
              setActiveId(null);
              setSelectedEdge(null);
            }}
            onEdgeClick={(_, e) => {
              if (mode === "edges") setSelectedEdge(e.id);
            }}
            onConnect={(c) => {
              if (mode === "edges" && c.source && c.target) void callPatch({ op: "connect", from: c.source, to: c.target });
            }}
            nodesDraggable={false}
            nodesConnectable={mode === "edges"}
            elementsSelectable
            deleteKeyCode={null}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
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
            {/* Переключатель видимости живёт ТОЛЬКО в режиме узлов: в просмотре холст ничего не меняет. */}
            {mode === "nodes" && !readOnly && (
              <button
                type="button"
                disabled={working}
                onClick={() => void toggleVisibility(active)}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-violet-500/50 bg-violet-500/10 px-3 text-xs font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-500/20 disabled:pointer-events-none disabled:opacity-50 dark:text-violet-300"
              >
                {active.hidden ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
                {active.hidden ? L.show : L.hide}
              </button>
            )}
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
