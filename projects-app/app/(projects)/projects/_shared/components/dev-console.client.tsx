"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Circle, ClipboardCopy, ClipboardPaste, Copy, Loader2, LogOut, Play, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ptyUrl } from "@/lib/pty-url";
import { XtermTerminal, type XtermTerminalHandle } from "./xterm-terminal.client";
import { VoiceInput } from "./voice-input.client";
import { AuthFlowModal } from "./auth-flow-modal.client";
import { AUTH_FLOW_DESCRIPTORS, type AuthFlowDescriptor } from "../auth-flow-descriptors";

// ANSI strippers (the coding-window pair, :3002) — the auth-URL detector reads a CLEAN transcript:
// PTY colour codes and line-wraps would otherwise tear the OAuth URL apart and the detector would miss it.
const ANSI_CSI_RE   = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_OSC_RE   = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const ANSI_OTHER_RE = /\x1b[=>NOPVWXYZ\\\]^_]/g;
const stripAnsi = (s: string) => s.replace(ANSI_OSC_RE, "").replace(ANSI_CSI_RE, "").replace(ANSI_OTHER_RE, "");

// LATENT CANON BUG, caught live 2026-07-19: the detector searches a buffer with ALL SPACES REMOVED (to
// re-join PTY line-wraps), so the CLI's own words printed right after the URL ("Paste code here if
// prompted") get GLUED onto the state value — the state charset swallows them and the copied link is
// garbage. Cure #1: prefer a match on the spaced buffer (an unwrapped URL ends at the real space).
// Cure #2: on the de-spaced fallback, trim a glued sentence-start tail — an OAuth state ending in a
// natural-language word chain is practically impossible, a glued CLI phrase always starts with one.
const GLUED_TAIL_RE = /(?:Paste|Press|Copy|Open|Then|Use|If|Browser|Sign|Login|Enter)[A-Za-z]*$/;

// THE DEV CONSOLE (step 255.B2-B4, the owner's scenario) — the live control desk of an external
// coding-agent session, INSIDE the launch dialog on :3003. Design (the owner delegated it):
//   header  — the working folder (mono, copyable) + the session badge (new / reattached);
//   cards   — the two v1 providers (Claude Code · Codex) with live readiness badges; a model select
//             under the chosen one;
//   center  — the terminal (dark, ~55vh) + a toolbar: Paste (subscription auth), Copy output, Exit;
//   footer  — the CONDUCTOR strip (cd ✓ → pwd ✓ → CLI → login → task handed) + the do-not-reload note
//             (and the honest promise: an accidental reload REATTACHES — keepAlive, 255.A2).
//
// THE CONDUCTOR (B3): the system drives the agent itself by reading the terminal — verify pwd equals
// the room, type the CLI launch (with the model), watch for the OAuth login prompt (auto-fill on
// detect), then hand the room task as the first message. The user watches; Paste stays as the manual
// fallback. SESSION (B4): sessionId = dev:<automation>, keepAlive — a reload reattaches with history;
// only Exit (double-confirm) kills it.

type Readiness = { platform: string; installed: boolean; logged_in: boolean; busy: boolean | null };
type ModelInfo = { id: string; name: string };
type Step = "pwd" | "cli" | "login" | "task" | "free";
type StepState = "todo" | "doing" | "done" | "fail";

const PROVIDERS = [
  { id: "claude-code", label: "Claude Code", cli: (model: string) => `claude${model ? ` --model ${model}` : ""}\n` },
  { id: "codex", label: "Codex", cli: (model: string) => `codex${model ? ` -m ${model}` : ""}\n` },
] as const;

type CD = {
  workspace: string; sessionNew: string; sessionReattached: string;
  provider: string; model: string; startAgent: string; agentRunning: string;
  paste: string; pasteTitle: string; pasteSend: string; copyOut: string; copied: string;
  exit: string; exitConfirm: string;
  stepPwd: string; stepCli: string; stepLogin: string; stepTask: string; stepFree: string;
  noReload: string; notInstalled: string; notLoggedIn: string; busy: string;
  pwdFail: string;
};
const I18N: Record<string, CD> = {
  en: { workspace: "Workspace", sessionNew: "new session", sessionReattached: "session restored", provider: "Coding agent", model: "Model", startAgent: "Start the agent", agentRunning: "Agent running", paste: "Paste", pasteTitle: "Paste into the terminal (login codes, answers)", pasteSend: "Send", copyOut: "Copy output", copied: "Copied.", exit: "Exit", exitConfirm: "End the session for good? The agent's terminal will be closed.", stepPwd: "Workspace verified", stepCli: "Agent launched", stepLogin: "Subscription login", stepTask: "Task handed over", stepFree: "Development in progress", noReload: "Please don't reload the page. If it reloads accidentally, the session reconnects with its history.", notInstalled: "not installed", notLoggedIn: "no subscription login", busy: "busy", pwdFail: "The workspace check failed — the terminal is not in the project room." },
  ru: { workspace: "Рабочая папка", sessionNew: "новая сессия", sessionReattached: "сессия восстановлена", provider: "Агент-программист", model: "Модель", startAgent: "Запустить агента", agentRunning: "Агент работает", paste: "Вставить", pasteTitle: "Вставить в терминал (коды входа, ответы)", pasteSend: "Отправить", copyOut: "Скопировать вывод", copied: "Скопировано.", exit: "Выход", exitConfirm: "Завершить сессию насовсем? Терминал агента будет закрыт.", stepPwd: "Рабочая папка проверена", stepCli: "Агент запущен", stepLogin: "Вход в подписку", stepTask: "Задание передано", stepFree: "Идёт разработка", noReload: "Не перезагружайте страницу. При случайной перезагрузке сессия восстановится с историей.", notInstalled: "не установлен", notLoggedIn: "нет входа в подписку", busy: "занят", pwdFail: "Проверка рабочей папки не прошла — терминал не в комнате проекта." },
  es: { workspace: "Carpeta de trabajo", sessionNew: "sesión nueva", sessionReattached: "sesión restaurada", provider: "Agente de código", model: "Modelo", startAgent: "Iniciar el agente", agentRunning: "Agente en marcha", paste: "Pegar", pasteTitle: "Pegar en la terminal (códigos, respuestas)", pasteSend: "Enviar", copyOut: "Copiar salida", copied: "Copiado.", exit: "Salir", exitConfirm: "¿Terminar la sesión definitivamente? La terminal del agente se cerrará.", stepPwd: "Carpeta verificada", stepCli: "Agente lanzado", stepLogin: "Acceso a la suscripción", stepTask: "Tarea entregada", stepFree: "Desarrollo en curso", noReload: "No recargues la página. Si se recarga por accidente, la sesión se reconecta con su historial.", notInstalled: "no instalado", notLoggedIn: "sin acceso a la suscripción", busy: "ocupado", pwdFail: "La verificación de la carpeta falló — la terminal no está en la sala del proyecto." },
  fr: { workspace: "Dossier de travail", sessionNew: "nouvelle session", sessionReattached: "session restaurée", provider: "Agent de code", model: "Modèle", startAgent: "Démarrer l'agent", agentRunning: "Agent en cours", paste: "Coller", pasteTitle: "Coller dans le terminal (codes, réponses)", pasteSend: "Envoyer", copyOut: "Copier la sortie", copied: "Copié.", exit: "Quitter", exitConfirm: "Terminer la session définitivement ? Le terminal de l'agent sera fermé.", stepPwd: "Dossier vérifié", stepCli: "Agent lancé", stepLogin: "Connexion à l'abonnement", stepTask: "Tâche transmise", stepFree: "Développement en cours", noReload: "Ne rechargez pas la page. En cas de rechargement accidentel, la session se reconnecte avec son historique.", notInstalled: "non installé", notLoggedIn: "pas de connexion", busy: "occupé", pwdFail: "La vérification du dossier a échoué — le terminal n'est pas dans la salle du projet." },
  it: { workspace: "Cartella di lavoro", sessionNew: "nuova sessione", sessionReattached: "sessione ripristinata", provider: "Agente di codice", model: "Modello", startAgent: "Avvia l'agente", agentRunning: "Agente in esecuzione", paste: "Incolla", pasteTitle: "Incolla nel terminale (codici, risposte)", pasteSend: "Invia", copyOut: "Copia output", copied: "Copiato.", exit: "Esci", exitConfirm: "Terminare la sessione definitivamente? Il terminale dell'agente verrà chiuso.", stepPwd: "Cartella verificata", stepCli: "Agente avviato", stepLogin: "Accesso all'abbonamento", stepTask: "Compito consegnato", stepFree: "Sviluppo in corso", noReload: "Non ricaricare la pagina. In caso di ricarica accidentale, la sessione si riconnette con la cronologia.", notInstalled: "non installato", notLoggedIn: "nessun accesso", busy: "occupato", pwdFail: "La verifica della cartella è fallita — il terminale non è nella stanza del progetto." },
  de: { workspace: "Arbeitsordner", sessionNew: "neue Sitzung", sessionReattached: "Sitzung wiederhergestellt", provider: "Coding-Agent", model: "Modell", startAgent: "Agent starten", agentRunning: "Agent läuft", paste: "Einfügen", pasteTitle: "In das Terminal einfügen (Codes, Antworten)", pasteSend: "Senden", copyOut: "Ausgabe kopieren", copied: "Kopiert.", exit: "Beenden", exitConfirm: "Sitzung endgültig beenden? Das Terminal des Agenten wird geschlossen.", stepPwd: "Ordner geprüft", stepCli: "Agent gestartet", stepLogin: "Abo-Anmeldung", stepTask: "Aufgabe übergeben", stepFree: "Entwicklung läuft", noReload: "Bitte die Seite nicht neu laden. Bei versehentlichem Neuladen verbindet sich die Sitzung mit ihrer Historie neu.", notInstalled: "nicht installiert", notLoggedIn: "keine Anmeldung", busy: "beschäftigt", pwdFail: "Die Ordnerprüfung schlug fehl — das Terminal ist nicht im Projektraum." },
  pt: { workspace: "Pasta de trabalho", sessionNew: "sessão nova", sessionReattached: "sessão restaurada", provider: "Agente de código", model: "Modelo", startAgent: "Iniciar o agente", agentRunning: "Agente em execução", paste: "Colar", pasteTitle: "Colar no terminal (códigos, respostas)", pasteSend: "Enviar", copyOut: "Copiar saída", copied: "Copiado.", exit: "Sair", exitConfirm: "Terminar a sessão definitivamente? O terminal do agente será fechado.", stepPwd: "Pasta verificada", stepCli: "Agente iniciado", stepLogin: "Login da assinatura", stepTask: "Tarefa entregue", stepFree: "Desenvolvimento em curso", noReload: "Não recarregue a página. Numa recarga acidental, a sessão reconecta-se com o histórico.", notInstalled: "não instalado", notLoggedIn: "sem login", busy: "ocupado", pwdFail: "A verificação da pasta falhou — o terminal não está na sala do projeto." },
  pl: { workspace: "Folder roboczy", sessionNew: "nowa sesja", sessionReattached: "sesja przywrócona", provider: "Agent kodujący", model: "Model", startAgent: "Uruchom agenta", agentRunning: "Agent pracuje", paste: "Wklej", pasteTitle: "Wklej do terminala (kody, odpowiedzi)", pasteSend: "Wyślij", copyOut: "Kopiuj wyjście", copied: "Skopiowano.", exit: "Zakończ", exitConfirm: "Zakończyć sesję na stałe? Terminal agenta zostanie zamknięty.", stepPwd: "Folder zweryfikowany", stepCli: "Agent uruchomiony", stepLogin: "Logowanie subskrypcji", stepTask: "Zadanie przekazane", stepFree: "Trwa rozwój", noReload: "Nie przeładowuj strony. Przy przypadkowym przeładowaniu sesja połączy się ponownie z historią.", notInstalled: "niezainstalowany", notLoggedIn: "brak logowania", busy: "zajęty", pwdFail: "Weryfikacja folderu nie powiodła się — terminal nie jest w pokoju projektu." },
  tr: { workspace: "Çalışma klasörü", sessionNew: "yeni oturum", sessionReattached: "oturum geri yüklendi", provider: "Kodlama ajanı", model: "Model", startAgent: "Ajanı başlat", agentRunning: "Ajan çalışıyor", paste: "Yapıştır", pasteTitle: "Terminale yapıştır (kodlar, yanıtlar)", pasteSend: "Gönder", copyOut: "Çıktıyı kopyala", copied: "Kopyalandı.", exit: "Çıkış", exitConfirm: "Oturum kalıcı olarak sonlandırılsın mı? Ajanın terminali kapatılacak.", stepPwd: "Klasör doğrulandı", stepCli: "Ajan başlatıldı", stepLogin: "Abonelik girişi", stepTask: "Görev iletildi", stepFree: "Geliştirme sürüyor", noReload: "Sayfayı yeniden yüklemeyin. Yanlışlıkla yeniden yüklenirse oturum geçmişiyle birlikte yeniden bağlanır.", notInstalled: "kurulu değil", notLoggedIn: "abonelik girişi yok", busy: "meşgul", pwdFail: "Klasör doğrulaması başarısız — terminal proje odasında değil." },
  nl: { workspace: "Werkmap", sessionNew: "nieuwe sessie", sessionReattached: "sessie hersteld", provider: "Coding-agent", model: "Model", startAgent: "Agent starten", agentRunning: "Agent actief", paste: "Plakken", pasteTitle: "In de terminal plakken (codes, antwoorden)", pasteSend: "Versturen", copyOut: "Uitvoer kopiëren", copied: "Gekopieerd.", exit: "Afsluiten", exitConfirm: "Sessie definitief beëindigen? De terminal van de agent wordt gesloten.", stepPwd: "Werkmap geverifieerd", stepCli: "Agent gestart", stepLogin: "Abonnement-login", stepTask: "Taak overgedragen", stepFree: "Ontwikkeling bezig", noReload: "Herlaad de pagina niet. Bij een onbedoelde herlaad verbindt de sessie opnieuw met de historie.", notInstalled: "niet geïnstalleerd", notLoggedIn: "geen login", busy: "bezet", pwdFail: "De werkmapcontrole is mislukt — de terminal is niet in de projectkamer." },
};

function StepDot({ state }: { state: StepState }) {
  if (state === "done") return <Check className="size-3.5 text-emerald-500" />;
  if (state === "doing") return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />;
  if (state === "fail") return <Circle className="size-3.5 fill-rose-500 text-rose-500" />;
  return <Circle className="size-3 text-muted-foreground/40" />;
}

export function DevConsole({
  automation, roomPath, roomTask, lang, onExited,
}: {
  automation: string;
  /** The server-side room path from the handoff (the terminal's cwd). */
  roomPath: string;
  /** The room task text — the first message the conductor hands to the agent. */
  roomTask: string;
  lang: string;
  onExited?: () => void;
}) {
  const T = I18N[lang] ?? I18N.en;
  const termRef = useRef<XtermTerminalHandle | null>(null);
  const [readiness, setReadiness] = useState<Readiness[]>([]);
  const [provider, setProvider] = useState<string>("claude-code");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState("");
  const [reattached, setReattached] = useState(false);
  const [steps, setSteps] = useState<Record<Step, StepState>>({ pwd: "doing", cli: "todo", login: "todo", task: "todo", free: "todo" });
  const [agentStarted, setAgentStarted] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [exitArm, setExitArm] = useState(false);
  // "Copy output" opens a MODAL of the recent transcript (owner 2026-07-19): the owner SELECTS what he
  // needs by hand instead of a blind 20k-char clipboard dump (which was unusable — 445 lines).
  const [outOpen, setOutOpen] = useState(false);
  const [outText, setOutText] = useState("");
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  // THE AUTH CONVEYOR (263.1 critical fix — the :3002 coding-window pipeline, ported): when the terminal
  // prints a subscription-auth URL, extract it from the clean transcript and open the guided modal
  // (open link → sign in → paste code / relay callback / device code). Without this the owner was stuck
  // at the raw OAuth prompt with no way through.
  const [activeAuth, setActiveAuth] = useState<{ descriptor: AuthFlowDescriptor; url: string; code?: string } | null>(null);
  const activeAuthRef = useRef<typeof activeAuth>(null);
  const rawBufRef = useRef("");
  const urlDetectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The rolling terminal transcript the conductor reads (and the output modal shows).
  const outRef = useRef("");
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const startedRef = useRef(false);
  const quietTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStep = useCallback((k: Step, v: StepState) => setSteps((s) => ({ ...s, [k]: v })), []);

  // Readiness + models.
  useEffect(() => {
    fetch("/api/projects/agents/readiness", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { agents?: { agents?: Readiness[] } } | null) => {
        const list = d?.agents?.agents ?? [];
        if (list.length) setReadiness(list);
      })
      .catch(() => { /* badges stay unknown */ });
  }, []);
  useEffect(() => {
    setModels([]);
    setModel("");
    fetch(`/api/projects/agents/models?platform=${encodeURIComponent(provider)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { models?: ModelInfo[] } | null) => {
        if (d?.models?.length) { setModels(d.models); setModel(d.models[0].id); }
      })
      .catch(() => { /* manual model less critical: CLI default */ });
  }, [provider]);

  // THE CONDUCTOR (B3) — reads every terminal chunk.
  const onData = useCallback((chunk: string) => {
    outRef.current = (outRef.current + chunk).slice(-100_000);
    const s = stepsRef.current;

    if (chunk.includes("[session reattached]")) {
      setReattached(true);
      setSteps({ pwd: "done", cli: "done", login: "done", task: "done", free: "doing" });
      setAgentStarted(true);
      startedRef.current = true;
      return;
    }
    // Step 1 — pwd verification: our own probe answer contains the room path on its own line.
    if (s.pwd === "doing" && outRef.current.includes(roomPath)) {
      setStep("pwd", "done");
    }
    // Step 3 — THE AUTH CONVEYOR (the :3002 pipeline): keep a clean joined buffer, debounce 300ms, match
    // the per-platform descriptors against a space-stripped copy (PTY line-wraps reassembled), extract
    // the URL (+ device code) and open the guided modal. One modal at a time.
    rawBufRef.current = (rawBufRef.current + stripAnsi(chunk).replace(/\r\n|\r|\n/g, " ")).slice(-4000);
    if (!activeAuthRef.current) {
      if (urlDetectTimer.current) clearTimeout(urlDetectTimer.current);
      urlDetectTimer.current = setTimeout(() => {
        if (activeAuthRef.current) return;
        const spaced = rawBufRef.current;
        const bufForSearch = spaced.replace(/ /g, "");
        for (const descriptor of AUTH_FLOW_DESCRIPTORS) {
          const direct = spaced.match(descriptor.detectUrl);
          const match = direct ?? bufForSearch.match(descriptor.detectUrl);
          if (match) {
            // A direct match ends at a REAL space (the state charset cannot cross one) — but PTY wraps
            // may have injected spaces INSIDE the URL (`.*?` bridges them): caught live 2026-07-19 as
            // "redirect URI …/oa uth/… not supported". Strip them; the tail is already clean.
            let extractedUrl = direct ? match[0].replace(/ /g, "") : match[0];
            const dupeIdx = extractedUrl.indexOf("https://", 8);
            if (dupeIdx !== -1) extractedUrl = extractedUrl.slice(0, dupeIdx);
            if (!direct) extractedUrl = extractedUrl.replace(GLUED_TAIL_RE, "");
            let extractedCode: string | undefined;
            if (descriptor.detectCode) {
              const codeMatch = rawBufRef.current.match(descriptor.detectCode);
              if (codeMatch) extractedCode = codeMatch[0];
            }
            const next = { descriptor, url: extractedUrl, code: extractedCode };
            activeAuthRef.current = next;
            setActiveAuth(next);
            setStep("login", "doing");
            break;
          }
        }
      }, 300);
    }
    // Step 4 — after the CLI starts, a quiet period (no output ~4s) means the prompt is ready: hand the
    // task. NEVER while the auth modal is open (263.1 fix): during a browser sign-in the terminal is
    // quiet for far longer than 4s, and the old code typed the task INTO the login prompt.
    if (startedRef.current && s.task === "todo") {
      if (quietTimer.current) clearTimeout(quietTimer.current);
      quietTimer.current = setTimeout(() => {
        const cur = stepsRef.current;
        if (cur.task !== "todo") return;
        if (activeAuthRef.current) return; // auth in progress — the next output re-arms this timer
        setStep("login", "done");
        setStep("task", "doing");
        // Send the task AND submit it (owner 2026-07-19, finding 13): a trailing \r presses Enter in the
        // CLI prompt — the owner no longer has to focus the terminal and hit Enter himself.
        termRef.current?.sendStdin(roomTask.replace(/\r?\n/g, "\n") + "\n");
        setTimeout(() => termRef.current?.sendStdin("\r"), 250);
        setTimeout(() => { setStep("task", "done"); setStep("free", "doing"); }, 1500);
      }, 4000);
    }
  }, [roomPath, roomTask, setStep]);

  // The pwd probe once the shell settles (fresh sessions only).
  useEffect(() => {
    const t = setTimeout(() => {
      if (!reattached && stepsRef.current.pwd === "doing") termRef.current?.sendStdin("pwd\n");
    }, 1600);
    return () => clearTimeout(t);
  }, [reattached]);

  const startAgent = useCallback(() => {
    if (stepsRef.current.pwd !== "done") { toast.error(T.pwdFail); return; }
    const p = PROVIDERS.find((x) => x.id === provider) ?? PROVIDERS[0];
    setAgentStarted(true);
    startedRef.current = true;
    setStep("cli", "done");
    setStep("login", "doing");
    termRef.current?.sendStdin(p.cli(model));
  }, [provider, model, setStep, T.pwdFail]);

  const copyWorkspace = () => { void navigator.clipboard.writeText(roomPath); toast.success(T.copied); };
  // "Copy output" → the transcript MODAL (owner 2026-07-19): show the tail, let the owner select by hand.
  const openOutput = () => { setOutText(stripAnsi(outRef.current.slice(-20_000))); setOutOpen(true); };
  const copyAllOutput = () => { void navigator.clipboard.writeText(outText); toast.success(T.copied); };
  const sendPaste = () => {
    if (!pasteText) return;
    termRef.current?.sendStdin(pasteText);
    termRef.current?.focus();
    setPasteOpen(false);
    setPasteText("");
  };
  // The auth modal's send: the pasted code goes to the PTY + Enter; focus wakes the xterm canvas.
  const sendAuthCode = (code: string) => {
    termRef.current?.sendStdin(code + "\n");
    setTimeout(() => termRef.current?.focus(), 80);
  };
  const closeAuth = () => {
    activeAuthRef.current = null;
    setActiveAuth(null);
    rawBufRef.current = "";
    setStep("login", "done");
  };
  const doExit = () => {
    termRef.current?.sendExit();
    setExitArm(false);
    onExited?.();
  };

  const readinessOf = (id: string) => readiness.find((r) => r.platform === id);
  const stepList: { k: Step; label: string }[] = [
    { k: "pwd", label: T.stepPwd }, { k: "cli", label: T.stepCli },
    { k: "login", label: T.stepLogin }, { k: "task", label: T.stepTask }, { k: "free", label: T.stepFree },
  ];
  const wsUrl = useMemo(() => ptyUrl(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-dev-console="1">
      {/* HEADER — the workspace + the session badge. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={copyWorkspace} className="group flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-left" title={T.workspace}>
          <TerminalSquare className="size-3.5 shrink-0 text-muted-foreground" />
          <code className="truncate text-xs">{roomPath}</code>
          <Copy className="size-3 shrink-0 opacity-0 transition group-hover:opacity-60" />
        </button>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${reattached ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
          {reattached ? T.sessionReattached : T.sessionNew}
        </span>
      </div>

      {/* PROVIDERS + MODEL — hidden once the agent is running (the terminal is the show now). */}
      {!agentStarted && (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          {PROVIDERS.map((p) => {
            const r = readinessOf(p.id);
            const blocked = r ? !r.installed || !r.logged_in : false;
            const reason = r && !r.installed ? T.notInstalled : r && !r.logged_in ? T.notLoggedIn : r?.busy ? T.busy : "";
            const active = provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={blocked}
                onClick={() => setProvider(p.id)}
                className={`rounded-lg border p-3 text-left transition ${active ? "border-primary ring-1 ring-primary" : ""} ${blocked ? "opacity-45" : "hover:bg-muted/40"}`}
                data-provider={p.id}
              >
                <p className="flex items-center justify-between text-sm font-medium">
                  {p.label}
                  {r && (
                    <span className={`size-2 rounded-full ${!r.installed || !r.logged_in ? "bg-rose-500" : r.busy ? "bg-amber-500" : "bg-emerald-500"}`} />
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{reason || (r ? "ready" : "…")}</p>
              </button>
            );
          })}
          <div className="flex flex-col justify-between gap-2">
            <Select value={model} onValueChange={setModel} disabled={!models.length}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder={T.model} /></SelectTrigger>
              <SelectContent>
                {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startAgent} disabled={steps.pwd !== "done"} data-dev-console-start="1">
              <Play className="size-3.5" /> {T.startAgent}
            </Button>
          </div>
        </div>
      )}

      {/* THE TERMINAL + toolbar. */}
      <div className="overflow-hidden rounded-lg border bg-[#09090b]" style={{ height: "55vh" }}>
        <XtermTerminal
          ref={termRef}
          wsUrl={wsUrl}
          platform="system"
          cwd={roomPath}
          sessionId={`dev:${automation}`}
          keepAlive
          onData={onData}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
          <ClipboardPaste className="size-3.5" /> {T.paste}
        </Button>
        <Button size="sm" variant="outline" onClick={openOutput}>
          <ClipboardCopy className="size-3.5" /> {T.copyOut}
        </Button>
        <span className="mx-1 flex-1" />
        {exitArm ? (
          <>
            <span className="text-xs text-rose-600 dark:text-rose-400">{T.exitConfirm}</span>
            <Button size="sm" variant="destructive" onClick={doExit}>{T.exit}</Button>
            <Button size="sm" variant="ghost" onClick={() => setExitArm(false)}>✕</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setExitArm(true)}>
            <LogOut className="size-3.5" /> {T.exit}
          </Button>
        )}
      </div>

      {/* THE CONDUCTOR STRIP + the reload note. */}
      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {stepList.map(({ k, label }) => (
            <span key={k} className="flex items-center gap-1.5 text-xs" data-conductor-step={k} data-state={steps[k]}>
              <StepDot state={steps[k]} /> {label}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{T.noReload}</p>
      </div>

      {/* PASTE — the manual fallback (login codes, answers) + the ONE voice primitive (step 232). */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{T.pasteTitle}</DialogTitle></DialogHeader>
          <Textarea ref={pasteRef} value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4} autoFocus />
          <VoiceInput targetRef={pasteRef} value={pasteText} onChange={setPasteText} />
          <Button onClick={sendPaste} disabled={!pasteText}>{T.pasteSend}</Button>
        </DialogContent>
      </Dialog>

      {/* OUTPUT — the transcript modal (owner 2026-07-19): select by hand, or copy the whole tail. */}
      <Dialog open={outOpen} onOpenChange={setOutOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{T.copyOut}</DialogTitle></DialogHeader>
          <pre className="max-h-[55vh] select-text overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs" style={{ userSelect: "text", WebkitUserSelect: "text" }}>
            {outText}
          </pre>
          <Button size="sm" variant="outline" onClick={copyAllOutput}>
            <ClipboardCopy className="size-3.5" /> {T.copyOut}
          </Button>
        </DialogContent>
      </Dialog>

      {/* THE AUTH CONVEYOR MODAL (263.1) — the guided subscription sign-in, exactly as on :3002. */}
      {activeAuth && (
        <AuthFlowModal
          descriptor={activeAuth.descriptor}
          url={activeAuth.url}
          code={activeAuth.code}
          onClose={closeAuth}
          onSendCode={sendAuthCode}
        />
      )}
    </div>
  );
}
