"use client";

import { useCallback, useState } from "react";
import { CheckCheck, Copy, Loader2, ListChecks, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";

// "Start development" (step 232, owner's request) — the top-level entry point on the automation page. When
// the diagram still has at least one UNBUILT (draft) node, a button appears; clicking it opens a modal (six
// languages) that turns the draft nodes into development steps, each with the exact request to paste into an
// AI coding agent (Claude Code, Codex, …).
//
// THE REVIEW GATE LIVES HERE (owner's fix): development cannot start until the owner has read the use cases
// and confirmed the AI understood him. Instead of bouncing him to a hidden panel, the SAME modal shows the
// cases with a Confirm button when they are not yet confirmed — read, confirm, and the modal becomes the
// list of steps. One flow, one place.
type Step = { number: number; name: string; nodeSlug: string; message: string };
type Case = { cuid: string; title: string; summary: string; status: string };
type Mode = "loading" | "review" | "steps" | "no-cases";

type SD = {
  button: string; title: string;
  intro: string; agents: string; building: string; step: string; copy: string; copied: string;
  reviewHeading: string; reviewIntro: string; confirm: string; confirming: string;
  noCasesTitle: string; noCasesBody: string;
  failed: string; none: string; noDescription: string;
};
const I18N: Record<string, SD> = {
  en: {
    button: "Start development", title: "Start development",
    intro: "Copy each request below and paste it into your AI coding agent, asking it to start development of that step.",
    agents: "Any coding agent works — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Preparing the development steps…", step: "Step", copy: "Copy the request", copied: "Copied — paste it into the coding agent's chat.",
    reviewHeading: "Read your use cases and confirm before development starts",
    reviewIntro: "This is where you and the AI agree. Read what it understood; if anything is wrong, close this and fix the case with its pencil. Development starts only after you confirm.",
    confirm: "I read them — the AI understood me", confirming: "Confirming…",
    noCasesTitle: "Describe the use cases first", noCasesBody: "This automation has no use cases yet. Open the Quiz on this page and describe your scenarios — development cannot start without them.",
    failed: "Could not prepare the development steps.", none: "There are no unbuilt nodes — nothing to develop right now.", noDescription: "No description yet.",
  },
  ru: {
    button: "Запустить разработку", title: "Запустить разработку",
    intro: "Скопируйте каждый запрос ниже и вставьте его вашему ИИ-агенту-кодеру с просьбой приступить к разработке этого шага.",
    agents: "Подойдёт любой агент-кодер — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Готовлю шаги разработки…", step: "Шаг", copy: "Скопировать запрос", copied: "Скопировано — вставьте в чат агента-кодера.",
    reviewHeading: "Прочитайте кейсы и подтвердите — до начала разработки",
    reviewIntro: "Здесь вы и ИИ договариваетесь. Прочитайте, что он понял; если что-то не так — закройте и поправьте кейс карандашом в панели. Разработка начнётся только после подтверждения.",
    confirm: "Я прочитал — ИИ понял меня правильно", confirming: "Подтверждаю…",
    noCasesTitle: "Сначала опишите пользовательские кейсы", noCasesBody: "У этой автоматизации ещё нет кейсов. Откройте Quiz на этой странице и опишите сценарии — без них разработку не начать.",
    failed: "Не удалось подготовить шаги разработки.", none: "Незавершённых узлов нет — сейчас нечего разрабатывать.", noDescription: "Пока без описания.",
  },
  es: {
    button: "Iniciar desarrollo", title: "Iniciar desarrollo",
    intro: "Copia cada solicitud de abajo y pégala en tu agente de código de IA, pidiéndole que inicie el desarrollo de ese paso.",
    agents: "Sirve cualquier agente de código — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Preparando los pasos de desarrollo…", step: "Paso", copy: "Copiar la solicitud", copied: "Copiado — pégalo en el chat del agente de código.",
    reviewHeading: "Lee tus casos de uso y confirma antes de empezar el desarrollo",
    reviewIntro: "Aquí es donde tú y la IA os ponéis de acuerdo. Lee lo que entendió; si algo está mal, cierra y corrige el caso con su lápiz en el panel. El desarrollo empieza solo después de que confirmes.",
    confirm: "Los leí — la IA me entendió", confirming: "Confirmando…",
    noCasesTitle: "Describe primero los casos de uso", noCasesBody: "Esta automatización aún no tiene casos de uso. Abre el Quiz en esta página y describe tus escenarios — sin ellos no se puede empezar el desarrollo.",
    failed: "No se pudieron preparar los pasos de desarrollo.", none: "No hay nodos sin construir — nada que desarrollar ahora mismo.", noDescription: "Aún sin descripción.",
  },
  fr: {
    button: "Démarrer le développement", title: "Démarrer le développement",
    intro: "Copiez chaque requête ci-dessous et collez-la dans votre agent de code IA, en lui demandant de démarrer le développement de cette étape.",
    agents: "N'importe quel agent de code convient — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Préparation des étapes de développement…", step: "Étape", copy: "Copier la requête", copied: "Copié — collez-le dans le chat de l'agent de code.",
    reviewHeading: "Lisez vos cas d'usage et confirmez avant le début du développement",
    reviewIntro: "C'est ici que vous et l'IA vous mettez d'accord. Lisez ce qu'elle a compris ; si quelque chose ne va pas, fermez et corrigez le cas avec son crayon dans le panneau. Le développement ne commence qu'après votre confirmation.",
    confirm: "Je les ai lus — l'IA m'a compris", confirming: "Confirmation…",
    noCasesTitle: "Décrivez d'abord les cas d'usage", noCasesBody: "Cette automatisation n'a pas encore de cas d'usage. Ouvrez le Quiz sur cette page et décrivez vos scénarios — sans eux, le développement ne peut pas commencer.",
    failed: "Impossible de préparer les étapes de développement.", none: "Aucun nœud non construit — rien à développer pour le moment.", noDescription: "Pas encore de description.",
  },
  it: {
    button: "Avvia lo sviluppo", title: "Avvia lo sviluppo",
    intro: "Copia ogni richiesta qui sotto e incollala nel tuo agente di codice IA, chiedendogli di avviare lo sviluppo di quel passo.",
    agents: "Va bene qualsiasi agente di codice — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Preparazione dei passi di sviluppo…", step: "Passo", copy: "Copia la richiesta", copied: "Copiato — incollalo nella chat dell'agente di codice.",
    reviewHeading: "Leggi i tuoi casi d'uso e conferma prima che inizi lo sviluppo",
    reviewIntro: "Qui tu e l'IA vi mettete d'accordo. Leggi ciò che ha capito; se qualcosa non va, chiudi e correggi il caso con la sua matita nel pannello. Lo sviluppo inizia solo dopo la tua conferma.",
    confirm: "Li ho letti — l'IA mi ha capito", confirming: "Conferma…",
    noCasesTitle: "Descrivi prima i casi d'uso", noCasesBody: "Questa automazione non ha ancora casi d'uso. Apri il Quiz in questa pagina e descrivi i tuoi scenari — senza di essi non si può iniziare lo sviluppo.",
    failed: "Impossibile preparare i passi di sviluppo.", none: "Nessun nodo da costruire — al momento non c'è nulla da sviluppare.", noDescription: "Ancora nessuna descrizione.",
  },
  de: {
    button: "Entwicklung starten", title: "Entwicklung starten",
    intro: "Kopiere jede Anfrage unten und füge sie in deinen KI-Coding-Agenten ein — mit der Bitte, die Entwicklung dieses Schritts zu beginnen.",
    agents: "Jeder Coding-Agent funktioniert — Claude Code, Codex, Gemini, Qwen, Kimi.",
    building: "Entwicklungsschritte werden vorbereitet…", step: "Schritt", copy: "Anfrage kopieren", copied: "Kopiert — füge sie in den Chat des Coding-Agenten ein.",
    reviewHeading: "Lies deine Anwendungsfälle und bestätige, bevor die Entwicklung beginnt",
    reviewIntro: "Hier einigt ihr euch, du und die KI. Lies, was sie verstanden hat; wenn etwas nicht stimmt, schließe und korrigiere den Fall mit seinem Stift im Panel. Die Entwicklung startet erst nach deiner Bestätigung.",
    confirm: "Ich habe sie gelesen — die KI hat mich verstanden", confirming: "Bestätige…",
    noCasesTitle: "Beschreibe zuerst die Anwendungsfälle", noCasesBody: "Diese Automatisierung hat noch keine Anwendungsfälle. Öffne das Quiz auf dieser Seite und beschreibe deine Szenarien — ohne sie kann die Entwicklung nicht beginnen.",
    failed: "Die Entwicklungsschritte konnten nicht vorbereitet werden.", none: "Keine ungebauten Knoten — im Moment gibt es nichts zu entwickeln.", noDescription: "Noch keine Beschreibung.",
  },
};

export function StartDevelopment({ automation, hasDraft }: { automation: string; hasDraft: boolean }) {
  const L = I18N[useUiLang()] ?? I18N.en;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  // Ask the server to materialize the steps. The gate answers 409: not-reviewed → show the cases to confirm
  // right here; no-cases → tell the owner to describe them first. 200 → the steps are ready.
  const prepare = useCallback(async () => {
    setMode("loading");
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/start-development`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (r.ok) {
        const d = (await r.json()) as { steps: Step[] };
        setSteps(d.steps ?? []);
        setMode("steps");
        return;
      }
      const d = (await r.json().catch(() => ({}))) as { reason?: string };
      if (d.reason === "not-reviewed") {
        // Load the cases so the owner can read + confirm them inside THIS modal.
        const cr = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        const cd = (await cr.json().catch(() => ({}))) as { cases?: Case[] };
        setCases(cd.cases ?? []);
        setMode("review");
      } else if (d.reason === "no-cases") {
        setMode("no-cases");
      } else {
        toast.error(L.failed);
        setOpen(false);
      }
    } finally { setBusy(false); }
  }, [automation, L]);

  // Confirm the cases, then immediately continue to the steps — the whole gate is one uninterrupted flow.
  const confirmAndContinue = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/use-cases/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (!r.ok) { toast.error(L.failed); return; }
      router.refresh();          // the panel's status pill updates too
      await prepare();           // gate now passes → the steps appear
    } finally { setBusy(false); }
  }, [automation, L, prepare, router]);

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
              {mode === "review"
                ? <><ListChecks className="size-4" /> {L.reviewHeading}</>
                : <><Rocket className="size-4" /> {L.title}</>}
            </DialogTitle>
          </DialogHeader>

          {mode === "loading" && (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {L.building}
            </p>
          )}

          {/* THE GATE — read the cases, confirm, continue. The confirm button is RIGHT HERE. */}
          {mode === "review" && (
            <>
              <p className="shrink-0 text-sm text-muted-foreground">{L.reviewIntro}</p>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {cases.map((c, i) => (
                  <div key={c.cuid} className="rounded-lg border p-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      {c.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{c.summary || L.noDescription}</p>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 justify-end border-t pt-3">
                <Button onClick={confirmAndContinue} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                  {busy ? L.confirming : L.confirm}
                </Button>
              </div>
            </>
          )}

          {mode === "no-cases" && (
            <div className="space-y-1 py-4 text-sm">
              <p className="font-medium">{L.noCasesTitle}</p>
              <p className="text-muted-foreground">{L.noCasesBody}</p>
            </div>
          )}

          {mode === "steps" && (
            <>
              <div className="shrink-0 space-y-1 text-sm text-muted-foreground">
                <p>{L.intro}</p>
                <p className="text-xs">{L.agents}</p>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {!steps.length && <p className="text-sm text-muted-foreground">{L.none}</p>}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
