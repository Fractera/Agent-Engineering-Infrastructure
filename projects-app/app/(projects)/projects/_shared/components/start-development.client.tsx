"use client";

import { useCallback, useState } from "react";
import { CheckCheck, Copy, ExternalLink, Loader2, ListChecks, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { adminBase } from "@/lib/runtime-urls";

// "Start development" (step 233) — the owner's single top-level handoff on the automation page. When the
// diagram still has an UNBUILT (draft) node, a button appears; it opens a modal (six languages) that:
//   1. enforces the REVIEW GATE inline — read the use cases + confirm (the confirm button lives right here,
//      not in a hidden accordion),
//   2. then creates ONE Development Step (sub-steps = nodes) via the existing API,
//   3. and shows the owner a SHORT instruction — "Run development step #NN" — NOT the raw brief. The coding
//      agent picks the step up from the Development Steps page.
type Case = { cuid: string; title: string; summary: string; status: string };
type Mode = "loading" | "review" | "done" | "no-cases" | "no-nodes";

type SD = {
  button: string; title: string;
  building: string;
  reviewHeading: string; reviewIntro: string; confirm: string; confirming: string;
  doneHeading: string; runInstruction: string; runHint: string; copy: string; copied: string; openSteps: string;
  noCasesTitle: string; noCasesBody: string; noNodesTitle: string; noNodesBody: string;
  failed: string; noDescription: string;
};
const I18N: Record<string, SD> = {
  en: {
    button: "Start development", title: "Start development",
    building: "Creating the development step…",
    reviewHeading: "Read your use cases and confirm before development starts",
    reviewIntro: "This is where you and the AI agree. Read what it understood; if anything is wrong, close this and fix the case with its pencil. Development starts only after you confirm.",
    confirm: "I read them — the AI understood me", confirming: "Confirming…",
    doneHeading: "Development step created",
    runInstruction: "Run development step #{n}",
    runHint: "Paste this line to your AI coding agent (Claude Code / Codex / …). It picks the step up from the Development Steps page — with everything it needs inside.",
    copy: "Copy", copied: "Copied — paste it to your coding agent.", openSteps: "Open Development Steps",
    noCasesTitle: "Describe the use cases first", noCasesBody: "This automation has no use cases yet. Open the Quiz on this page and describe your scenarios — development cannot start without them.",
    noNodesTitle: "No nodes to develop", noNodesBody: "Every node is already built — there is nothing waiting for development right now.",
    failed: "Could not create the development step.", noDescription: "No description yet.",
  },
  ru: {
    button: "Запустить разработку", title: "Запустить разработку",
    building: "Создаю шаг разработки…",
    reviewHeading: "Прочитайте кейсы и подтвердите — до начала разработки",
    reviewIntro: "Здесь вы и ИИ договариваетесь. Прочитайте, что он понял; если что-то не так — закройте и поправьте кейс карандашом. Разработка начнётся только после подтверждения.",
    confirm: "Я прочитал — ИИ понял меня правильно", confirming: "Подтверждаю…",
    doneHeading: "Шаг разработки создан",
    runInstruction: "Запусти в работу шаг №{n}",
    runHint: "Вставьте эту строку вашему ИИ-агенту-кодеру (Claude Code / Codex / …). Он возьмёт шаг со страницы Development Steps — со всем необходимым внутри.",
    copy: "Скопировать", copied: "Скопировано — вставьте агенту-кодеру.", openSteps: "Открыть Development Steps",
    noCasesTitle: "Сначала опишите пользовательские кейсы", noCasesBody: "У этой автоматизации ещё нет кейсов. Откройте Quiz на этой странице и опишите сценарии — без них разработку не начать.",
    noNodesTitle: "Нет узлов для разработки", noNodesBody: "Все узлы уже построены — сейчас в разработку ничего не ждёт.",
    failed: "Не удалось создать шаг разработки.", noDescription: "Пока без описания.",
  },
  es: {
    button: "Iniciar desarrollo", title: "Iniciar desarrollo",
    building: "Creando el paso de desarrollo…",
    reviewHeading: "Lee tus casos de uso y confirma antes de empezar el desarrollo",
    reviewIntro: "Aquí es donde tú y la IA os ponéis de acuerdo. Lee lo que entendió; si algo está mal, cierra y corrige el caso con su lápiz. El desarrollo empieza solo después de que confirmes.",
    confirm: "Los leí — la IA me entendió", confirming: "Confirmando…",
    doneHeading: "Paso de desarrollo creado",
    runInstruction: "Pon en marcha el paso n.º {n}",
    runHint: "Pega esta línea a tu agente de código de IA (Claude Code / Codex / …). Recoge el paso desde la página de Development Steps, con todo lo necesario dentro.",
    copy: "Copiar", copied: "Copiado — pégalo a tu agente de código.", openSteps: "Abrir Development Steps",
    noCasesTitle: "Describe primero los casos de uso", noCasesBody: "Esta automatización aún no tiene casos de uso. Abre el Quiz en esta página y describe tus escenarios — sin ellos no se puede empezar el desarrollo.",
    noNodesTitle: "No hay nodos para desarrollar", noNodesBody: "Todos los nodos ya están construidos — ahora mismo no hay nada esperando desarrollo.",
    failed: "No se pudo crear el paso de desarrollo.", noDescription: "Aún sin descripción.",
  },
  fr: {
    button: "Démarrer le développement", title: "Démarrer le développement",
    building: "Création de l'étape de développement…",
    reviewHeading: "Lisez vos cas d'usage et confirmez avant le début du développement",
    reviewIntro: "C'est ici que vous et l'IA vous mettez d'accord. Lisez ce qu'elle a compris ; si quelque chose ne va pas, fermez et corrigez le cas avec son crayon. Le développement ne commence qu'après votre confirmation.",
    confirm: "Je les ai lus — l'IA m'a compris", confirming: "Confirmation…",
    doneHeading: "Étape de développement créée",
    runInstruction: "Lance l'étape n° {n}",
    runHint: "Collez cette ligne à votre agent de code IA (Claude Code / Codex / …). Il récupère l'étape depuis la page Development Steps, avec tout le nécessaire dedans.",
    copy: "Copier", copied: "Copié — collez-le à votre agent de code.", openSteps: "Ouvrir Development Steps",
    noCasesTitle: "Décrivez d'abord les cas d'usage", noCasesBody: "Cette automatisation n'a pas encore de cas d'usage. Ouvrez le Quiz sur cette page et décrivez vos scénarios — sans eux, le développement ne peut pas commencer.",
    noNodesTitle: "Aucun nœud à développer", noNodesBody: "Tous les nœuds sont déjà construits — rien n'attend le développement pour l'instant.",
    failed: "Impossible de créer l'étape de développement.", noDescription: "Pas encore de description.",
  },
  it: {
    button: "Avvia lo sviluppo", title: "Avvia lo sviluppo",
    building: "Creazione del passo di sviluppo…",
    reviewHeading: "Leggi i tuoi casi d'uso e conferma prima che inizi lo sviluppo",
    reviewIntro: "Qui tu e l'IA vi mettete d'accordo. Leggi ciò che ha capito; se qualcosa non va, chiudi e correggi il caso con la sua matita. Lo sviluppo inizia solo dopo la tua conferma.",
    confirm: "Li ho letti — l'IA mi ha capito", confirming: "Conferma…",
    doneHeading: "Passo di sviluppo creato",
    runInstruction: "Avvia il passo n. {n}",
    runHint: "Incolla questa riga al tuo agente di codice IA (Claude Code / Codex / …). Prende il passo dalla pagina Development Steps, con tutto il necessario dentro.",
    copy: "Copia", copied: "Copiato — incollalo al tuo agente di codice.", openSteps: "Apri Development Steps",
    noCasesTitle: "Descrivi prima i casi d'uso", noCasesBody: "Questa automazione non ha ancora casi d'uso. Apri il Quiz in questa pagina e descrivi i tuoi scenari — senza di essi non si può iniziare lo sviluppo.",
    noNodesTitle: "Nessun nodo da sviluppare", noNodesBody: "Tutti i nodi sono già costruiti — al momento non c'è nulla in attesa di sviluppo.",
    failed: "Impossibile creare il passo di sviluppo.", noDescription: "Ancora nessuna descrizione.",
  },
  de: {
    button: "Entwicklung starten", title: "Entwicklung starten",
    building: "Entwicklungsschritt wird erstellt…",
    reviewHeading: "Lies deine Anwendungsfälle und bestätige, bevor die Entwicklung beginnt",
    reviewIntro: "Hier einigt ihr euch, du und die KI. Lies, was sie verstanden hat; wenn etwas nicht stimmt, schließe und korrigiere den Fall mit seinem Stift. Die Entwicklung startet erst nach deiner Bestätigung.",
    confirm: "Ich habe sie gelesen — die KI hat mich verstanden", confirming: "Bestätige…",
    doneHeading: "Entwicklungsschritt erstellt",
    runInstruction: "Starte Schritt Nr. {n}",
    runHint: "Füge diese Zeile deinem KI-Coding-Agenten ein (Claude Code / Codex / …). Er holt den Schritt von der Development-Steps-Seite — mit allem Nötigen darin.",
    copy: "Kopieren", copied: "Kopiert — füge es deinem Coding-Agenten ein.", openSteps: "Development Steps öffnen",
    noCasesTitle: "Beschreibe zuerst die Anwendungsfälle", noCasesBody: "Diese Automatisierung hat noch keine Anwendungsfälle. Öffne das Quiz auf dieser Seite und beschreibe deine Szenarien — ohne sie kann die Entwicklung nicht beginnen.",
    noNodesTitle: "Keine Knoten zu entwickeln", noNodesBody: "Alle Knoten sind bereits gebaut — im Moment wartet nichts auf Entwicklung.",
    failed: "Der Entwicklungsschritt konnte nicht erstellt werden.", noDescription: "Noch keine Beschreibung.",
  },
};

export function StartDevelopment({ automation, hasDraft }: { automation: string; hasDraft: boolean }) {
  const L = I18N[useUiLang()] ?? I18N.en;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [stepNumber, setStepNumber] = useState<number | null>(null);

  const runLine = stepNumber !== null ? L.runInstruction.replace("{n}", String(stepNumber)) : "";

  // Ask the server to create the ONE bundled step. The gate answers 409 (not-reviewed → show the cases to
  // confirm right here; no-cases / no-nodes → say why). 200 → the step number is ready.
  const create = useCallback(async () => {
    setMode("loading");
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/start-development`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (r.ok) {
        const d = (await r.json()) as { number: number };
        setStepNumber(d.number);
        setMode("done");
        router.refresh();
        return;
      }
      const d = (await r.json().catch(() => ({}))) as { reason?: string };
      if (d.reason === "not-reviewed") {
        const cr = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        const cd = (await cr.json().catch(() => ({}))) as { cases?: Case[] };
        setCases(cd.cases ?? []);
        setMode("review");
      } else if (d.reason === "no-cases") {
        setMode("no-cases");
      } else if (d.reason === "no-nodes") {
        setMode("no-nodes");
      } else {
        toast.error(L.failed);
        setOpen(false);
      }
    } finally { setBusy(false); }
  }, [automation, L, router]);

  // Confirm the cases, then immediately continue to create the step — one uninterrupted flow.
  const confirmAndContinue = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/use-cases/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (!r.ok) { toast.error(L.failed); return; }
      await create();
    } finally { setBusy(false); }
  }, [automation, L, create]);

  const onOpen = (v: boolean) => {
    setOpen(v);
    if (v) { setStepNumber(null); void create(); }
  };

  const openSteps = () => {
    window.open(`${adminBase()}/service/development-steps`, "_blank", "noopener");
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
                : mode === "done"
                  ? <><CheckCheck className="size-4" /> {L.doneHeading}</>
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

          {/* DONE — the whole point: the owner sees only "Run development step #NN". */}
          {mode === "done" && stepNumber !== null && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
                <code className="flex-1 text-sm font-medium">{runLine}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { void navigator.clipboard.writeText(runLine); toast.success(L.copied); }}
                >
                  <Copy className="size-3.5" /> {L.copy}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{L.runHint}</p>
              <Button variant="ghost" size="sm" onClick={openSteps}>
                <ExternalLink className="size-3.5" /> {L.openSteps}
              </Button>
            </div>
          )}

          {mode === "no-cases" && (
            <div className="space-y-1 py-4 text-sm">
              <p className="font-medium">{L.noCasesTitle}</p>
              <p className="text-muted-foreground">{L.noCasesBody}</p>
            </div>
          )}

          {mode === "no-nodes" && (
            <div className="space-y-1 py-4 text-sm">
              <p className="font-medium">{L.noNodesTitle}</p>
              <p className="text-muted-foreground">{L.noNodesBody}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
