"use client";

import { useCallback, useState } from "react";
import { Copy, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";

// "Start development" (step 232, owner's request) — the top-level entry point on the automation page. When
// the diagram still has at least one UNBUILT (draft) node, a button appears; it opens a modal (six languages)
// that materializes one development step per draft node and shows, for each, the exact request to paste into
// an AI coding agent (Claude Code, Codex, Gemini, …) asking it to build that step. One button, one modal —
// the owner never has to know where the queue lives.
type Step = { number: number; name: string; nodeSlug: string; message: string };

type SD = {
  button: string; title: string; intro: string; agents: string;
  building: string; step: string; copy: string; copied: string;
  gateNoCases: string; gateNotReviewed: string; openUseCases: string; failed: string; none: string;
};
const I18N: Record<string, SD> = {
  en: {
    button: "Start development", title: "Start development",
    intro: "Copy each request below and paste it into your AI coding agent, asking it to start development of that step.",
    agents: "Any coding agent works — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Preparing the development steps…", step: "Step", copy: "Copy the request", copied: "Copied — paste it into the coding agent's chat.",
    gateNoCases: "Describe the use cases first — nothing can be built without them.",
    gateNotReviewed: "Read and confirm the use cases before development starts.",
    openUseCases: "Open use cases", failed: "Could not prepare the development steps.", none: "There are no unbuilt nodes — nothing to develop right now.",
  },
  ru: {
    button: "Запустить разработку", title: "Запустить разработку",
    intro: "Скопируйте каждый запрос ниже и вставьте его вашему ИИ-агенту-кодеру с просьбой приступить к разработке этого шага.",
    agents: "Подойдёт любой агент-кодер — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Готовлю шаги разработки…", step: "Шаг", copy: "Скопировать запрос", copied: "Скопировано — вставьте в чат агента-кодера.",
    gateNoCases: "Сначала опишите пользовательские кейсы — без них ничего не построить.",
    gateNotReviewed: "Прочитайте и подтвердите пользовательские кейсы перед началом разработки.",
    openUseCases: "Открыть кейсы", failed: "Не удалось подготовить шаги разработки.", none: "Незавершённых узлов нет — сейчас нечего разрабатывать.",
  },
  es: {
    button: "Iniciar desarrollo", title: "Iniciar desarrollo",
    intro: "Copia cada solicitud de abajo y pégala en tu agente de código de IA, pidiéndole que inicie el desarrollo de ese paso.",
    agents: "Sirve cualquier agente de código — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Preparando los pasos de desarrollo…", step: "Paso", copy: "Copiar la solicitud", copied: "Copiado — pégalo en el chat del agente de código.",
    gateNoCases: "Describe primero los casos de uso — sin ellos no se puede construir nada.",
    gateNotReviewed: "Lee y confirma los casos de uso antes de empezar el desarrollo.",
    openUseCases: "Abrir casos de uso", failed: "No se pudieron preparar los pasos de desarrollo.", none: "No hay nodos sin construir — nada que desarrollar ahora mismo.",
  },
  fr: {
    button: "Démarrer le développement", title: "Démarrer le développement",
    intro: "Copiez chaque requête ci-dessous et collez-la dans votre agent de code IA, en lui demandant de démarrer le développement de cette étape.",
    agents: "N'importe quel agent de code convient — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Préparation des étapes de développement…", step: "Étape", copy: "Copier la requête", copied: "Copié — collez-le dans le chat de l'agent de code.",
    gateNoCases: "Décrivez d'abord les cas d'usage — rien ne peut être construit sans eux.",
    gateNotReviewed: "Lisez et confirmez les cas d'usage avant le début du développement.",
    openUseCases: "Ouvrir les cas d'usage", failed: "Impossible de préparer les étapes de développement.", none: "Aucun nœud non construit — rien à développer pour le moment.",
  },
  it: {
    button: "Avvia lo sviluppo", title: "Avvia lo sviluppo",
    intro: "Copia ogni richiesta qui sotto e incollala nel tuo agente di codice IA, chiedendogli di avviare lo sviluppo di quel passo.",
    agents: "Va bene qualsiasi agente di codice — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Preparazione dei passi di sviluppo…", step: "Passo", copy: "Copia la richiesta", copied: "Copiato — incollalo nella chat dell'agente di codice.",
    gateNoCases: "Descrivi prima i casi d'uso — senza di essi non si può costruire nulla.",
    gateNotReviewed: "Leggi e conferma i casi d'uso prima che inizi lo sviluppo.",
    openUseCases: "Apri i casi d'uso", failed: "Impossibile preparare i passi di sviluppo.", none: "Nessun nodo da costruire — al momento non c'è nulla da sviluppare.",
  },
  de: {
    button: "Entwicklung starten", title: "Entwicklung starten",
    intro: "Kopiere jede Anfrage unten und füge sie in deinen KI-Coding-Agenten ein — mit der Bitte, die Entwicklung dieses Schritts zu beginnen.",
    agents: "Jeder Coding-Agent funktioniert — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Entwicklungsschritte werden vorbereitet…", step: "Schritt", copy: "Anfrage kopieren", copied: "Kopiert — füge sie in den Chat des Coding-Agenten ein.",
    gateNoCases: "Beschreibe zuerst die Anwendungsfälle — ohne sie kann nichts gebaut werden.",
    gateNotReviewed: "Lies und bestätige die Anwendungsfälle, bevor die Entwicklung beginnt.",
    openUseCases: "Anwendungsfälle öffnen", failed: "Die Entwicklungsschritte konnten nicht vorbereitet werden.", none: "Keine ungebauten Knoten — im Moment gibt es nichts zu entwickeln.",
  },
};

export function StartDevelopment({ automation, hasDraft }: { automation: string; hasDraft: boolean }) {
  const L = I18N[useUiLang()] ?? I18N.en;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const prepare = useCallback(async () => {
    setBusy(true);
    setSteps([]);
    try {
      const r = await fetch(`/api/projects/start-development`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { reason?: string };
        const gated = d.reason === "no-cases" || d.reason === "not-reviewed";
        toast.error(d.reason === "no-cases" ? L.gateNoCases : d.reason === "not-reviewed" ? L.gateNotReviewed : L.failed, {
          duration: 15000,
          action: gated
            ? { label: L.openUseCases, onClick: () => window.dispatchEvent(new CustomEvent("usecases:review", { detail: { automation } })) }
            : undefined,
        });
        setOpen(false);
        return;
      }
      const d = (await r.json()) as { steps: Step[] };
      setSteps(d.steps ?? []);
    } finally { setBusy(false); }
  }, [automation, L]);

  const onOpen = (v: boolean) => {
    setOpen(v);
    if (v) void prepare();
  };

  if (!hasDraft) return null;

  return (
    <>
      <Button variant="default" size="sm" onClick={() => onOpen(true)}>
        <Rocket className="size-3.5" /> {L.button}
      </Button>

      <Dialog open={open} onOpenChange={onOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="size-4" /> {L.title}
            </DialogTitle>
          </DialogHeader>
          <div className="shrink-0 space-y-1 text-sm text-muted-foreground">
            <p>{L.intro}</p>
            <p className="text-xs">{L.agents}</p>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {busy && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {L.building}
              </p>
            )}
            {!busy && !steps.length && (
              <p className="text-sm text-muted-foreground">{L.none}</p>
            )}
            {steps.map((s) => (
              <div key={s.number} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    <span className="tabular-nums text-muted-foreground">{L.step} #{s.number}</span> — {s.name}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { void navigator.clipboard.writeText(s.message); toast.success(L.copied); }}
                  >
                    <Copy className="size-3.5" /> {L.copy}
                  </Button>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
                  {s.message}
                </pre>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
