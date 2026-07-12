"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Link2, ListChecks, Loader2, MessagesSquare, Pause, Send, SkipForward, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { useUiLang } from "../use-ui-lang";

// ACTIVATION QUIZ (step 227) — phase 2 of an automation's birth. Opens on the FIRST visit of a freshly
// created automation and turns the owner's instruction (phase 1) into a real automation through a brainstorm,
// in the project's DEFAULT LANGUAGE.
//
// STEP 231 — the Quiz now starts with the USER CASES, and only then designs nodes:
//   PHASE "usecases" → the owner describes every scenario (free speech, voice encouraged). Nothing can be
//                      built before this: the server refuses a node, and a development step, without them.
//   PHASE "nodes"    → one quiz step = ONE node (a draft on the canvas) + ONE development sub-step.
//
// The owner may stop the questions at any moment ("Next node") or end the whole quiz ("Finish") — and still
// leaves with a working state: whatever was designed is on the canvas, its steps are queued, and the closing
// toast reports exactly where the automation stands. Capped at 10 nodes (context-overflow guard).
//
// FOUR SUBJECTS, one component (no second Quiz exists anywhere):
//   1. automation (uncontrolled)  → the first-visit Quiz on an automation page,
//   2. automation (controlled)    → the same Quiz opened from the GLOBAL CANVAS (225 G4),
//   3. edge                       → the LINK Quiz: how two automations are connected,
//   4. useCase / cases (step 231) → revisiting the scenarios of a LIVE automation (the pencils on the Use
//      cases panel). Its closing move writes the new case text + one development step per changed case.
type Turn = { role: string; content: string };
type Phase = "usecases" | "nodes";

// SIX-LANGUAGE UI (owner's rule, CLAUDE.md 4г) — the admin/projects/design/service layers speak the six
// languages we ship (en, es, fr, it, ru, de); anything else falls back to English. The strings the owner
// named — the title, the amber banner and the input placeholder — are translated here, next to where they
// render. Deterministic dictionary, no model call.
type QuizStrings = {
  banner: string;
  phScenarios: string;
  phAnswer: string;
  tUseCases: string; tUseCasesSub: string;
  tNode: string; tNodeOf: string;
  tLink: string;
  tCaseOne: string; tCaseAll: string;
  tUseCasesShort: string;
  // The footer (owner: everything below the mic was still English) — loaders, auto-quiz, buttons, hints.
  loaderEdge: string; loaderCase: string; loaderInstruction: string;
  autoWriting: string; autoPaused: string; btnPause: string; btnContinue: string; btnKeep: string;
  btnAnswer: string; btnAuto: string;
  btnFinishLink: string; btnSaveCases: string; btnCasesReady: string; btnFinishNode: string; btnEnd: string;
  hintLink: string; hintCase: string; hintUsecases: string; hintNodes: string;
  designer: string;
};
const QUIZ_I18N: Record<string, QuizStrings> = {
  en: {
    banner: "Planning an automation works far better with the most powerful model available to you. Pick it in the hamburger menu at the top of the page (Settings → model).",
    phScenarios: "Describe your scenarios — speak freely; hold the microphone and dictate…",
    phAnswer: "Your answer…",
    tUseCases: "The user cases", tUseCasesSub: "described first — before anything is built",
    tNode: "Designing node", tNodeOf: "of at most",
    tLink: "Designing the link",
    tCaseOne: "Revisiting a user case", tCaseAll: "Revisiting the user cases",
    tUseCasesShort: "described first — before anything is built",
    loaderEdge: "Reading both automations…", loaderCase: "Reading the automation…", loaderInstruction: "Reading your instruction…",
    autoWriting: "Auto-quiz — writing… (you can pause and edit)", autoPaused: "Auto-quiz — paused, edit freely",
    btnPause: "Pause", btnContinue: "Continue auto-quiz", btnKeep: "Keep this text",
    btnAnswer: "Answer", btnAuto: "Auto-quiz",
    btnFinishLink: "Finish the link → development step", btnSaveCases: "Save the cases → development step",
    btnCasesReady: "The cases are ready → design the nodes", btnFinishNode: "Finish this node → next", btnEnd: "End the session",
    hintLink: "Finishing the link writes its brief and queues one development step for the coding agent.",
    hintCase: "Saving writes the new case text and queues one development step per case you changed.",
    hintUsecases: "Nothing is built until the scenarios exist: they become your numbered user cases, and the nodes are designed from them.",
    hintNodes: "Each node you finish becomes a draft on the diagram and a development step for the coding agent.",
    designer: "Designer",
  },
  ru: {
    banner: "Планирование автоматизации идёт намного эффективнее на самой мощной доступной вам модели. Выберите её в гамбургер-меню вверху страницы (Настройки → модель).",
    phScenarios: "Опишите свои сценарии — говорите свободно; удерживайте микрофон и диктуйте…",
    phAnswer: "Ваш ответ…",
    tUseCases: "Пользовательские кейсы", tUseCasesSub: "сначала описываем их — до всего остального",
    tNode: "Проектируем узел", tNodeOf: "максимум из",
    tLink: "Проектируем связь",
    tCaseOne: "Пересматриваем кейс", tCaseAll: "Пересматриваем пользовательские кейсы",
    tUseCasesShort: "сначала описываем их — до всего остального",
    loaderEdge: "Читаю обе автоматизации…", loaderCase: "Читаю автоматизацию…", loaderInstruction: "Читаю вашу инструкцию…",
    autoWriting: "Авто-квиз — пишу… (можно поставить на паузу и отредактировать)", autoPaused: "Авто-квиз — пауза, редактируйте свободно",
    btnPause: "Пауза", btnContinue: "Продолжить авто-квиз", btnKeep: "Оставить этот текст",
    btnAnswer: "Ответить", btnAuto: "Авто-квиз",
    btnFinishLink: "Завершить связь → шаг разработки", btnSaveCases: "Сохранить кейсы → шаг разработки",
    btnCasesReady: "Кейсы готовы → проектируем узлы", btnFinishNode: "Завершить узел → дальше", btnEnd: "Завершить сессию",
    hintLink: "Завершение связи запишет её бриф и поставит один шаг разработки в очередь кодеру.",
    hintCase: "Сохранение запишет новый текст кейсов и поставит по одному шагу разработки на каждый изменённый кейс.",
    hintUsecases: "Ничего не строится, пока не описаны сценарии: они становятся пронумерованными кейсами, и из них проектируются узлы.",
    hintNodes: "Каждый завершённый узел становится черновиком на диаграмме и шагом разработки для кодера.",
    designer: "Дизайнер",
  },
  es: {
    banner: "Planificar una automatización funciona mucho mejor con el modelo más potente disponible. Elígelo en el menú de hamburguesa de la parte superior de la página (Ajustes → modelo).",
    phScenarios: "Describe tus escenarios — habla con libertad; mantén pulsado el micrófono y dicta…",
    phAnswer: "Tu respuesta…",
    tUseCases: "Los casos de uso", tUseCasesSub: "descritos primero — antes de construir nada",
    tNode: "Diseñando el nodo", tNodeOf: "de un máximo de",
    tLink: "Diseñando el enlace",
    tCaseOne: "Revisando un caso de uso", tCaseAll: "Revisando los casos de uso",
    tUseCasesShort: "descritos primero — antes de construir nada",
    loaderEdge: "Leyendo ambas automatizaciones…", loaderCase: "Leyendo la automatización…", loaderInstruction: "Leyendo tu instrucción…",
    autoWriting: "Auto-quiz — escribiendo… (puedes pausar y editar)", autoPaused: "Auto-quiz — en pausa, edita libremente",
    btnPause: "Pausar", btnContinue: "Continuar auto-quiz", btnKeep: "Conservar este texto",
    btnAnswer: "Responder", btnAuto: "Auto-quiz",
    btnFinishLink: "Terminar el enlace → paso de desarrollo", btnSaveCases: "Guardar los casos → paso de desarrollo",
    btnCasesReady: "Los casos están listos → diseñar los nodos", btnFinishNode: "Terminar este nodo → siguiente", btnEnd: "Terminar la sesión",
    hintLink: "Al terminar el enlace se escribe su resumen y se pone en cola un paso de desarrollo para el agente de código.",
    hintCase: "Al guardar se escribe el nuevo texto de los casos y se pone en cola un paso de desarrollo por cada caso que cambiaste.",
    hintUsecases: "No se construye nada hasta que existen los escenarios: se convierten en tus casos de uso numerados, y los nodos se diseñan a partir de ellos.",
    hintNodes: "Cada nodo que terminas se convierte en un borrador en el diagrama y en un paso de desarrollo para el agente de código.",
    designer: "Diseñador",
  },
  fr: {
    banner: "La planification d'une automatisation est bien meilleure avec le modèle le plus puissant à votre disposition. Choisissez-le dans le menu hamburger en haut de la page (Paramètres → modèle).",
    phScenarios: "Décrivez vos scénarios — parlez librement ; maintenez le micro et dictez…",
    phAnswer: "Votre réponse…",
    tUseCases: "Les cas d'usage", tUseCasesSub: "décrits d'abord — avant toute construction",
    tNode: "Conception du nœud", tNodeOf: "sur un maximum de",
    tLink: "Conception du lien",
    tCaseOne: "Révision d'un cas d'usage", tCaseAll: "Révision des cas d'usage",
    tUseCasesShort: "décrits d'abord — avant toute construction",
    loaderEdge: "Lecture des deux automatisations…", loaderCase: "Lecture de l'automatisation…", loaderInstruction: "Lecture de votre instruction…",
    autoWriting: "Auto-quiz — écriture… (vous pouvez mettre en pause et modifier)", autoPaused: "Auto-quiz — en pause, modifiez librement",
    btnPause: "Pause", btnContinue: "Continuer l'auto-quiz", btnKeep: "Garder ce texte",
    btnAnswer: "Répondre", btnAuto: "Auto-quiz",
    btnFinishLink: "Terminer le lien → étape de développement", btnSaveCases: "Enregistrer les cas → étape de développement",
    btnCasesReady: "Les cas sont prêts → concevoir les nœuds", btnFinishNode: "Terminer ce nœud → suivant", btnEnd: "Terminer la session",
    hintLink: "Terminer le lien écrit son résumé et met en file une étape de développement pour l'agent de code.",
    hintCase: "Enregistrer écrit le nouveau texte des cas et met en file une étape de développement par cas modifié.",
    hintUsecases: "Rien n'est construit tant que les scénarios n'existent pas : ils deviennent vos cas d'usage numérotés, et les nœuds en sont conçus.",
    hintNodes: "Chaque nœud terminé devient un brouillon sur le diagramme et une étape de développement pour l'agent de code.",
    designer: "Concepteur",
  },
  it: {
    banner: "Pianificare un'automazione funziona molto meglio con il modello più potente a tua disposizione. Sceglilo nel menu hamburger in cima alla pagina (Impostazioni → modello).",
    phScenarios: "Descrivi i tuoi scenari — parla liberamente; tieni premuto il microfono e detta…",
    phAnswer: "La tua risposta…",
    tUseCases: "I casi d'uso", tUseCasesSub: "descritti prima — prima di costruire qualsiasi cosa",
    tNode: "Progettazione del nodo", tNodeOf: "su un massimo di",
    tLink: "Progettazione del collegamento",
    tCaseOne: "Revisione di un caso d'uso", tCaseAll: "Revisione dei casi d'uso",
    tUseCasesShort: "descritti prima — prima di costruire qualsiasi cosa",
    loaderEdge: "Lettura di entrambe le automazioni…", loaderCase: "Lettura dell'automazione…", loaderInstruction: "Lettura della tua istruzione…",
    autoWriting: "Auto-quiz — sto scrivendo… (puoi mettere in pausa e modificare)", autoPaused: "Auto-quiz — in pausa, modifica liberamente",
    btnPause: "Pausa", btnContinue: "Continua l'auto-quiz", btnKeep: "Mantieni questo testo",
    btnAnswer: "Rispondi", btnAuto: "Auto-quiz",
    btnFinishLink: "Concludi il collegamento → passo di sviluppo", btnSaveCases: "Salva i casi → passo di sviluppo",
    btnCasesReady: "I casi sono pronti → progetta i nodi", btnFinishNode: "Concludi questo nodo → avanti", btnEnd: "Termina la sessione",
    hintLink: "Concludere il collegamento scrive il suo riassunto e mette in coda un passo di sviluppo per l'agente di codice.",
    hintCase: "Il salvataggio scrive il nuovo testo dei casi e mette in coda un passo di sviluppo per ogni caso modificato.",
    hintUsecases: "Non si costruisce nulla finché non esistono gli scenari: diventano i tuoi casi d'uso numerati, e da essi si progettano i nodi.",
    hintNodes: "Ogni nodo che concludi diventa una bozza sul diagramma e un passo di sviluppo per l'agente di codice.",
    designer: "Progettista",
  },
  de: {
    banner: "Das Planen einer Automatisierung gelingt weit besser mit dem stärksten dir verfügbaren Modell. Wähle es im Hamburger-Menü oben auf der Seite (Einstellungen → Modell).",
    phScenarios: "Beschreibe deine Szenarien — sprich frei; halte das Mikrofon gedrückt und diktiere…",
    phAnswer: "Deine Antwort…",
    tUseCases: "Die Anwendungsfälle", tUseCasesSub: "zuerst beschrieben — bevor irgendetwas gebaut wird",
    tNode: "Knoten wird entworfen", tNodeOf: "von höchstens",
    tLink: "Verbindung wird entworfen",
    tCaseOne: "Anwendungsfall überarbeiten", tCaseAll: "Anwendungsfälle überarbeiten",
    tUseCasesShort: "zuerst beschrieben — bevor irgendetwas gebaut wird",
    loaderEdge: "Beide Automatisierungen werden gelesen…", loaderCase: "Automatisierung wird gelesen…", loaderInstruction: "Deine Anweisung wird gelesen…",
    autoWriting: "Auto-Quiz — schreibe… (du kannst pausieren und bearbeiten)", autoPaused: "Auto-Quiz — pausiert, frei bearbeiten",
    btnPause: "Pause", btnContinue: "Auto-Quiz fortsetzen", btnKeep: "Diesen Text behalten",
    btnAnswer: "Antworten", btnAuto: "Auto-Quiz",
    btnFinishLink: "Verbindung abschließen → Entwicklungsschritt", btnSaveCases: "Fälle speichern → Entwicklungsschritt",
    btnCasesReady: "Die Fälle sind fertig → Knoten entwerfen", btnFinishNode: "Diesen Knoten abschließen → weiter", btnEnd: "Sitzung beenden",
    hintLink: "Das Abschließen der Verbindung schreibt ihre Kurzbeschreibung und reiht einen Entwicklungsschritt für den Coding-Agenten ein.",
    hintCase: "Das Speichern schreibt den neuen Fall-Text und reiht je geändertem Fall einen Entwicklungsschritt ein.",
    hintUsecases: "Nichts wird gebaut, solange die Szenarien nicht existieren: Sie werden zu deinen nummerierten Anwendungsfällen, und daraus werden die Knoten entworfen.",
    hintNodes: "Jeder abgeschlossene Knoten wird zu einem Entwurf im Diagramm und zu einem Entwicklungsschritt für den Coding-Agenten.",
    designer: "Designer",
  },
};

export function ActivationQuiz({
  automation, edge, edgeName, useCase, useCaseName, cases,
  open: openProp, autoStart, onClose,
}: {
  automation?: string;
  edge?: string;
  edgeName?: string;
  /** Revisit ONE user case (its cuid) — the pencil on a case. */
  useCase?: string;
  useCaseName?: string;
  /** Revisit the WHOLE set of user cases — the pencil on the panel's header (needs `automation`). */
  cases?: boolean;
  /** Controlled mode (the global canvas, the Use cases panel): the parent owns the open state. */
  open?: boolean;
  /** Start the streaming auto-quiz as soon as the session is created (used right after "Add automation"). */
  autoStart?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const controlled = openProp !== undefined;
  const isEdge = Boolean(edge);
  const isCaseEdit = Boolean(useCase) || Boolean(cases);
  const [openState, setOpenState] = useState(false);
  const open = controlled ? Boolean(openProp) : openState;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>(isEdge || isCaseEdit ? "nodes" : "usecases");
  const [nodeCount, setNodeCount] = useState(0);
  const [maxNodes, setMaxNodes] = useState(10);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const booted = useRef(false);
  // The field voice writes into (step 232): the transcript lands at the CARET, so the owner can dictate into
  // the middle of what he already wrote.
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  // The UI language of the modal (owner's rule, six languages) — the shared hook, memoized per page.
  const uiLang = useUiLang();
  const L = QUIZ_I18N[uiLang] ?? QUIZ_I18N.en;

  // The SUBJECT of every call — one API, four subjects (steps 225 G4 + 231).
  const subject = useCallback(() => {
    if (useCase) return { useCase };
    if (cases) return { automation, cases: true };
    if (isEdge) return { edge };
    return { automation };
  }, [useCase, cases, isEdge, edge, automation]);

  const query = useCase
    ? `useCase=${encodeURIComponent(useCase)}`
    : cases
      ? `automation=${encodeURIComponent(automation ?? "")}&cases=1`
      : isEdge
        ? `edge=${encodeURIComponent(edge ?? "")}`
        : `automation=${encodeURIComponent(automation ?? "")}`;

  const close = useCallback(() => {
    if (!controlled) setOpenState(false);
    onClose?.();
  }, [controlled, onClose]);

  // Start the session — or RE-open one the owner had ended (the canvas can reopen a finished Quiz; the
  // 10-node cap still holds and the server says so).
  const start = useCallback(async (reopen = false) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject(), reopen }),
      });
      const d = (await r.json()) as { question?: string | null; error?: string; capped?: boolean; turns?: Turn[]; phase?: Phase };
      if (!r.ok) { toast.error(d.error ?? "Could not start the quiz."); return; }
      if (d.capped) { toast.info(d.error ?? "This design session is complete."); return; }
      if (d.phase) setPhase(d.phase);
      if (d.turns?.length) setTurns(d.turns);
      else if (d.question) setTurns([{ role: "assistant", content: d.question }]);
    } finally { setBusy(false); }
  }, [subject]);

  // AUTO-QUIZ (227.B) — the model brainstorms with itself, STREAMING, so the owner reads it live. Pause at
  // any moment; the streamed text stays in an EDITABLE area, and saving the edit replaces the model's turn
  // — so what gets built (the cases, the node, the link) is made from what the owner approved.
  const autoQuiz = useCallback(async () => {
    if (streaming) return;
    setStreaming(true);
    setDraftText("");
    const ctrl = new AbortController();
    setAborter(ctrl);
    try {
      const r = await fetch(`/api/projects/quiz/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject()),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) { toast.error("Auto-quiz could not start."); return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as { delta?: string };
            if (j.delta) setDraftText((t) => t + j.delta);
          } catch { /* partial frame */ }
        }
      }
    } catch { /* paused by the owner — keep what was streamed */ } finally {
      setStreaming(false);
      setAborter(null);
    }
  }, [subject, streaming]);

  // Load the session. Uncontrolled (an automation page): a first visit OPENS the quiz; an interrupted one
  // resumes. Controlled (the global canvas, a pencil): the parent already opened us — load, start if new, and
  // stream the auto-quiz straight away when the caller asked for it (a just-created automation).
  useEffect(() => {
    if (!open || booted.current) return;
    booted.current = true;
    void (async () => {
      const r = await fetch(`/api/projects/quiz?${query}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string; turns?: Turn[]; nodeCount?: number; maxNodes?: number; phase?: Phase };
      setMaxNodes(d.maxNodes ?? 10);
      if (d.phase) setPhase(d.phase);
      if (!d.started) {
        await start();
      } else {
        setTurns(d.turns ?? []);
        setNodeCount(d.nodeCount ?? 0);
        // Opened again from the global canvas after the owner had ended it → revive the session.
        if (controlled && d.status === "done") await start(true);
      }
      if (autoStart) void autoQuiz();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  useEffect(() => {
    if (controlled || isEdge || isCaseEdit || !automation) return;
    void (async () => {
      const r = await fetch(`/api/projects/quiz?${query}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string };
      // First visit (no session yet) or an interrupted one → open; the effect above then loads it.
      if (!d.started || d.status === "active") setOpenState(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation]);

  const send = useCallback(async () => {
    if (!answer.trim() || busy) return;
    const mine = answer.trim();
    setAnswer("");
    setTurns((t) => [...t, { role: "user", content: mine }]);
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject(), answer: mine }),
      });
      const d = (await r.json()) as { question?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "The model did not answer."); return; }
      if (d.question) setTurns((t) => [...t, { role: "assistant", content: d.question as string }]);
    } finally { setBusy(false); }
  }, [answer, busy, subject]);

  const finish = useCallback(async () => {
    const r = await fetch(`/api/projects/quiz/finish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subject()),
    });
    const d = (await r.json()) as { report?: string; canTest?: boolean };
    close();
    // THE GUARANTEE (227.C): the session never ends with nothing — the owner is told exactly where the
    // subject stands and (for a project) can run the smoke test right from the toast.
    toast.info("Design session finished", {
      description: d.report,
      duration: 30000,
      action: isEdge || isCaseEdit || !automation
        ? undefined
        : {
            label: "Test it",
            onClick: () => {
              void (async () => {
                const t = await fetch(`/api/projects/test-run`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ automation }),
                });
                const td = (await t.json()) as { ok?: boolean; verdict?: string; report?: string };
                (td.ok ? toast.success : toast.info)(td.verdict ?? "Test finished", { description: td.report, duration: 20000 });
              })();
            },
          },
    });
    router.refresh();
  }, [subject, isEdge, isCaseEdit, automation, close, router]);

  // PHASE 1 → PHASE 2 (step 231): the scenarios are described → they become numbered user cases, and the Quiz
  // moves on to the nodes. A refusal here IS the gate: without a real description nothing gets built.
  const applyUseCases = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/usecases-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as { cases?: { title: string }[]; question?: string | null; error?: string };
      if (!r.ok) { toast.error(d.error ?? "The user cases are not ready yet.", { duration: 12000 }); return; }
      setPhase("nodes");
      setTurns(d.question ? [{ role: "assistant", content: d.question }] : []);
      toast.success(`${d.cases?.length ?? 0} user case${d.cases?.length === 1 ? "" : "s"} written`, {
        description: "Read them in the Use cases panel and confirm them — development starts only after that. Now we design the nodes.",
        duration: 15000,
      });
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, router]);

  // Stop the questions → this brainstorm becomes ONE node + ONE development step, then the next node starts.
  const nextNode = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/next-node`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as {
        node?: { name: string }; step?: { number: number; message: string };
        nodeCount?: number; done?: boolean; question?: string | null; error?: string; reason?: string;
      };
      if (!r.ok) {
        // The user-case gate (231): no cases yet, or the owner has not confirmed the current set.
        const gated = d.reason === "no-cases" || d.reason === "not-reviewed" || d.reason === "usecases-phase";
        toast.error(d.error ?? "Could not create the node.", {
          duration: 15000,
          action: gated
            ? {
                label: "Open user cases",
                onClick: () => window.dispatchEvent(new CustomEvent("usecases:review", { detail: { automation } })),
              }
            : undefined,
        });
        return;
      }
      setNodeCount(d.nodeCount ?? 0);
      toast.success(`Node "${d.node?.name}" designed — development step #${d.step?.number} created`, {
        description: "Copy the brief and paste it into the coding agent's chat, or let the agent drain the queue.",
        duration: 20000,
        action: d.step ? { label: "Copy", onClick: () => void navigator.clipboard.writeText(d.step!.message) } : undefined,
      });
      setTurns(d.question ? [{ role: "assistant", content: d.question }] : []);
      if (d.done) await finish();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, finish, router]);

  // THE LINK's closing move (225 G4): the brainstorm becomes the edge's spec.md + ONE development step —
  // the same file queue a node uses. A link is one subject, so the session ends here.
  const applyEdge = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/edge-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edge }),
      });
      const d = (await r.json()) as {
        edge?: { name: string }; step?: { number: number; message: string }; error?: string;
      };
      if (!r.ok) { toast.error(d.error ?? "Could not write the link brief."); return; }
      toast.success(`Link "${d.edge?.name}" designed — development step #${d.step?.number} created`, {
        description: "Copy the brief and paste it into the coding agent's chat, or let the agent drain the queue.",
        duration: 20000,
        action: d.step ? { label: "Copy", onClick: () => void navigator.clipboard.writeText(d.step!.message) } : undefined,
      });
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [edge, close, router]);

  // THE PENCIL's closing move (231): the revisited scenarios become the cases' new text + ONE development
  // step per case that changed. Which nodes those cases touch is the coding agent's job to work out.
  const applyCaseEdit = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/usecase-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject()),
      });
      const d = (await r.json()) as {
        changed?: number; report?: string; error?: string;
        steps?: { number: number; message: string; title: string }[];
      };
      if (!r.ok) { toast.error(d.error ?? "Could not save the user cases."); return; }
      const first = d.steps?.[0];
      (d.changed ? toast.success : toast.info)(
        d.changed ? `${d.changed} user case${d.changed === 1 ? "" : "s"} updated` : "Nothing changed",
        {
          description: d.report,
          duration: 20000,
          action: first
            ? { label: "Copy step", onClick: () => void navigator.clipboard.writeText(first.message) }
            : undefined,
        },
      );
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [subject, close, router]);

  const pause = useCallback(() => { aborter?.abort(); setStreaming(false); }, [aborter]);

  const saveEdit = useCallback(async () => {
    if (!draftText.trim()) return;
    const asOwner = phase === "usecases" && !isEdge && !isCaseEdit; // keeping the draft IS his description
    setBusy(true);
    try {
      await fetch(`/api/projects/quiz/edit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject(), content: draftText, asOwner }),
      });
      setTurns((t) => [...t, { role: asOwner ? "user" : "assistant", content: draftText }]);
      setDraftText("");
      toast.success(
        asOwner
          ? "Kept as your description of the scenarios — the cases will be written from it."
          : "Your edit replaced the model's text — what gets built comes from it.",
      );
    } finally { setBusy(false); }
  }, [draftText, subject, phase, isEdge, isCaseEdit]);

  // Leaving the use-case phase without cases is allowed (the owner may be interrupted), but it is never
  // silent: the automation cannot be built until they exist, and the Quiz reopens on the next visit.
  const onOpenChange = (v: boolean) => {
    if (v) { if (!controlled) setOpenState(true); return; }
    if (!isEdge && !isCaseEdit && phase === "usecases") {
      toast.warning("The user cases are still missing", {
        description: "Without a detailed description the automation cannot be created — this opens again on your next visit.",
        duration: 12000,
      });
    }
    close();
  };

  const title = isEdge ? (
    <>
      <Link2 className="size-4" /> {L.tLink}
      <span className="truncate text-xs font-normal text-muted-foreground">{edgeName ?? ""}</span>
    </>
  ) : isCaseEdit ? (
    <>
      <ListChecks className="size-4" /> {useCase ? L.tCaseOne : L.tCaseAll}
      <span className="truncate text-xs font-normal text-muted-foreground">{useCaseName ?? automation ?? ""}</span>
    </>
  ) : phase === "usecases" ? (
    <>
      <ListChecks className="size-4" /> {L.tUseCases}
      <span className="text-xs font-normal text-muted-foreground">{L.tUseCasesSub}</span>
    </>
  ) : (
    <>
      <MessagesSquare className="size-4" /> {L.tNode} {nodeCount + 1}
      <span className="text-xs font-normal text-muted-foreground">{L.tNodeOf} {maxNodes}</span>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* LAYOUT (owner: the microphone was cut off). DialogContent is a CSS grid that CLIPS rows under a
          max-height instead of shrinking them, so the bottom row — the field, the mic and the buttons —
          was never on screen. It is now THREE explicit regions with the padding moved per-region (p-0):
          a fixed HEADER, a single SCROLLING BODY (min-h-0 flex-1), and a fixed FOOTER that always holds
          the input, the microphone with its volume meter, and the actions. */}
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-3">
          <DialogTitle className="flex flex-wrap items-center gap-2">{title}</DialogTitle>
        </DialogHeader>

        {/* THE SCROLLING BODY — the banner and the whole transcript live here; on any screen it scrolls,
            so the footer below is never pushed off. */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-3">
          {/* Owner's note: planning is where the model's strength shows most — a weak model designs a weak
              automation. The model is chosen in the automation menu (the hamburger, top right of the page). */}
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{L.banner}</p>
          </div>

          {turns.length === 0 && busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {isEdge ? L.loaderEdge : isCaseEdit ? L.loaderCase : L.loaderInstruction}
            </p>
          )}
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm ${
                t.role === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"
              }`}
            >
              {t.role !== "user" && (
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3" /> {L.designer}
                </p>
              )}
              <p className="whitespace-pre-wrap">{t.content}</p>
            </div>
          ))}
        </div>

        {/* AUTO-QUIZ (227.B): the model thinks out loud, streamed. The area stays EDITABLE — pause, rewrite,
            save; what gets built is then made from YOUR text. */}
        {(streaming || draftText) && (
          <div className="mx-6 max-h-[35vh] shrink-0 space-y-2 overflow-y-auto rounded-lg border border-primary/40 p-2">
            <p className="flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="size-3" /> {streaming ? L.autoWriting : L.autoPaused}
            </p>
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={7}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {streaming ? (
                <Button size="sm" variant="outline" onClick={pause}>
                  <Pause className="size-3.5" /> {L.btnPause}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={autoQuiz} disabled={busy}>
                  <Sparkles className="size-3.5" /> {L.btnContinue}
                </Button>
              )}
              <Button size="sm" onClick={saveEdit} disabled={busy || streaming || !draftText.trim()}>
                <Send className="size-3.5" /> {L.btnKeep}
              </Button>
            </div>
          </div>
        )}

        {/* THE FOOTER — always on screen (owner's requirement): the input, the microphone with its volume
            meter, and the actions. It never scrolls away; the body above scrolls instead. */}
        <div className="shrink-0 space-y-2 border-t px-6 pb-6 pt-3">
          <Textarea
            ref={answerRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="max-h-40 overflow-y-auto"
            placeholder={
              phase === "usecases" && !isEdge && !isCaseEdit ? L.phScenarios : L.phAnswer
            }
            disabled={busy || streaming}
          />
          {/* Voice (step 232) — the shared primitive, mounted on this field. Hold to speak; the transcript
              lands at the cursor, so a dictated afterthought can go into the middle of a sentence. */}
          <VoiceInput
            targetRef={answerRef}
            value={answer}
            onChange={setAnswer}
            disabled={busy || streaming}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={send} disabled={busy || streaming || !answer.trim()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} {L.btnAnswer}
            </Button>
            <Button size="sm" variant="secondary" onClick={autoQuiz} disabled={busy || streaming}>
              <Sparkles className="size-3.5" /> {L.btnAuto}
            </Button>
            {isEdge ? (
              <Button size="sm" variant="outline" onClick={applyEdge} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {L.btnFinishLink}
              </Button>
            ) : isCaseEdit ? (
              <Button size="sm" variant="outline" onClick={applyCaseEdit} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {L.btnSaveCases}
              </Button>
            ) : phase === "usecases" ? (
              <Button size="sm" variant="outline" onClick={applyUseCases} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {L.btnCasesReady}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={nextNode} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {L.btnFinishNode}
              </Button>
            )}
            {!(phase === "usecases" && !isEdge && !isCaseEdit) && (
              <Button size="sm" variant="ghost" onClick={finish} disabled={busy || streaming}>
                {L.btnEnd}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEdge ? L.hintLink : isCaseEdit ? L.hintCase : phase === "usecases" ? L.hintUsecases : L.hintNodes}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
