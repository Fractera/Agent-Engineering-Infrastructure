"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Circle, ClipboardCopy, ClipboardPaste, Copy, FlaskConical, Loader2, LogOut, Play, TerminalSquare } from "lucide-react";
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

// ⚠ 263.1 lesson (owner, hard): the detection algorithm below is the MONTHS-PROVEN :3002 canon,
// byte-for-byte (de-spaced buffer matching, nothing else). Two of my "improvements" to it broke a
// working login live ("oa uth" redirect) and were reverted the same day. DO NOT "improve" this pipeline
// again — any change starts at the :3002 canon, with the owner, proven there first.

// THE DEV CONSOLE (step 255.B2-B4, the owner's scenario) — the live control desk of an external
// coding-agent session, INSIDE the launch dialog on :3003. Design (the owner delegated it):
//   header  — the working folder (mono, copyable) + the session badge (new / reattached);
//   cards   — the two v1 providers (Claude Code · Codex) with live readiness badges; a model select
//             under the chosen one;
//   center  — the terminal (dark, ~55vh) + a toolbar: Paste (subscription auth), Copy output, Exit;
//   footer  — the CONDUCTOR strip (cd ✓ → pwd ✓ → CLI → login → task handed) + the do-not-reload note
//             (and the honest promise: an accidental reload REATTACHES — keepAlive, 255.A2).
//
// THE CONDUCTOR (B3, reworked 263.1 owner decision): the system verifies pwd equals the room, types
// the CLI launch (with the model) and watches for the OAuth login prompt (guided modal on detect).
// Task delivery is EXPLICIT, two-staged — the old "4s of silence" auto-delivery is GONE (it lost the
// task whenever an auth flow swallowed the quiet window and left no button to retry):
//   stage 1 — the TEST button: sends a canonical mini-prompt that demands an ack marker; the marker in
//             the transcript = green toast, the button swaps to "Start development";
//   stage 2 — the START DEVELOPMENT button: sends the room task prefixed with a "print the marker
//             first" demand, auto-submits (\r), and STAYS on screen (re-clickable) until the agent
//             prints the DEV marker — only that proves development actually began.
// Both markers are written SPLIT inside the prompts, so the terminal's echo of the prompt itself can
// never satisfy the detector. The user watches; Paste stays as the manual fallback.
// SESSION (B4): sessionId = dev:<automation>, keepAlive — a reload reattaches with history;
// only Exit (double-confirm) kills it.

type Readiness = { platform: string; installed: boolean; logged_in: boolean; busy: boolean | null };
type ModelInfo = { id: string; name: string };
type Step = "pwd" | "cli" | "login" | "task" | "free";
type StepState = "todo" | "doing" | "done" | "fail";
/** The explicit delivery ladder (263.1): idle → testing → tested → handing → developing. */
type Phase = "idle" | "testing" | "tested" | "handing" | "developing";

// THE HANDSHAKE MARKERS. The agent is told to PRINT these; the conductor only trusts what it sees in
// the transcript. Inside the prompts the marker is written SPLIT with a "+" between the halves — the
// terminal echoes the prompt back, and a split marker in the echo can never satisfy the detector
// (detection runs on a de-spaced buffer, so a space alone would not be enough of a guard).
const TEST_MARKER = "@@FRACTERA_TEST_OK@@";
const DEV_MARKER = "@@FRACTERA_DEV_STARTED@@";
// The final-report envelope (owner 2026-07-19): the agent wraps its closing report between these; the
// console captures the text, has the server translate it into the UI language, and shows it in a toast
// that never auto-closes (button-dismiss only).
const REPORT_BEGIN = "@@FRACTERA_REPORT_BEGIN@@";
const REPORT_END = "@@FRACTERA_REPORT_END@@";
// A space-tolerant matcher for a marker inside the SPACED transcript: PTY line-wraps may inject one
// whitespace between any two characters of the literal. The prompts write markers SPLIT with " + ",
// which this (at most ONE whitespace per gap) can never match — echo-safe.
const tolerant = (marker: string) =>
  new RegExp(marker.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s?"));
// The canonical test prompt (finding 12): folder + model + readiness, plus the ack marker.
// STRICTLY ASCII (owner's round-3 transcript): a non-ASCII em-dash went through the PTY as
// "<ffffffff>"/"???" mojibake. Everything we type into the terminal ourselves stays 7-bit.
const TEST_PROMPT =
  "If you can read this, print one single line that joins these two parts with NOTHING between them: @@FRACTERA_ + TEST_OK@@ - then print your current working folder and your model name, and wait for the next instruction.";
const devPrompt = (task: string) =>
  `FIRST, before anything else, print one single line that joins these two parts with NOTHING between them: @@FRACTERA_ + DEV_STARTED@@ - then immediately carry out the task below.

WHEN THE WHOLE TASK IS DONE (your gated apply succeeded and you verified the result), print your final report for the owner: one plain-English paragraph, max 500 characters, saying WHAT you built/changed and HOW you verified it. End the report with one extra line: "Tokens used: <your total token consumption for this session — exact if you can see it, otherwise your best estimate like ~120k, never omit the line>". Print the whole report between two marker lines: before it a line joining @@FRACTERA_ + REPORT_BEGIN@@ and after it a line joining @@FRACTERA_ + REPORT_END@@ (each joined with NOTHING between the parts).

${task}`;

// AUTO MODE (owner 2026-07-19): the agent must code WITHOUT stopping to ask permission every step —
// clicking "yes" every 2 seconds is unusable. Both CLIs take their bypass flag AT LAUNCH (it cannot be
// applied to a running session). This is safe HERE by construction: the terminal is jailed to the
// sterile room (a projection of one automation) and every change returns through the gated apply.
// IS_SANDBOX=1 (owner's round-4 transcript): claude refuses --dangerously-skip-permissions under root
// ("cannot be used with root/sudo privileges"). IS_SANDBOX=1 is Claude Code's own escape hatch for
// containerized/sandboxed root environments — and the sterile room IS one (jailed cwd + gated apply).
const PROVIDERS = [
  { id: "claude-code", label: "Claude Code", cli: (model: string) => `IS_SANDBOX=1 claude --dangerously-skip-permissions${model ? ` --model ${model}` : ""}\n` },
  { id: "codex", label: "Codex", cli: (model: string) => `codex --dangerously-bypass-approvals-and-sandbox${model ? ` -m ${model}` : ""}\n` },
] as const;

type CD = {
  workspace: string; sessionNew: string; sessionReattached: string;
  provider: string; model: string; startAgent: string; agentRunning: string;
  paste: string; pasteTitle: string; pasteSend: string; copyOut: string; copied: string;
  exit: string; exitConfirm: string;
  stepPwd: string; stepCli: string; stepLogin: string; stepTask: string; stepFree: string;
  noReload: string; notInstalled: string; notLoggedIn: string; busy: string;
  pwdFail: string;
  test: string; testRunning: string; testOk: string; testFail: string;
  startDev: string; devWaitAck: string; devHanded: string; cliFail: string;
  reportTitle: string; close: string; copy: string;
};
const I18N: Record<string, CD> = {
  en: { workspace: "Workspace", sessionNew: "new session", sessionReattached: "session restored", provider: "Coding agent", model: "Model", startAgent: "Start the agent", agentRunning: "Agent running", paste: "Paste", pasteTitle: "Paste into the terminal (login codes, answers)", pasteSend: "Send", copyOut: "Copy output", copied: "Copied.", exit: "Exit", exitConfirm: "End the session for good? The agent's terminal will be closed.", stepPwd: "Workspace verified", stepCli: "Agent launched", stepLogin: "Subscription login", stepTask: "Task handed over", stepFree: "Development in progress", noReload: "Please don't reload the page. If it reloads accidentally, the session reconnects with its history.", notInstalled: "not installed", notLoggedIn: "no subscription login", busy: "busy", pwdFail: "The workspace check failed — the terminal is not in the project room.", test: "Test", testRunning: "Testing…", testOk: "The agent responded — everything works. You can start development.", testFail: "The agent did not respond to the test. Recovery: press Exit to end the session, then reopen the console and try again.", startDev: "Start development", devWaitAck: "Task sent. The button stays until the agent confirms the start.", devHanded: "The agent confirmed — development is running.", cliFail: "The agent failed to start — the terminal shows the error. The agent picker is open again — try once more.", reportTitle: "Development report", close: "Close", copy: "Copy" },
  ru: { workspace: "Рабочая папка", sessionNew: "новая сессия", sessionReattached: "сессия восстановлена", provider: "Агент-программист", model: "Модель", startAgent: "Запустить агента", agentRunning: "Агент работает", paste: "Вставить", pasteTitle: "Вставить в терминал (коды входа, ответы)", pasteSend: "Отправить", copyOut: "Скопировать вывод", copied: "Скопировано.", exit: "Выход", exitConfirm: "Завершить сессию насовсем? Терминал агента будет закрыт.", stepPwd: "Рабочая папка проверена", stepCli: "Агент запущен", stepLogin: "Вход в подписку", stepTask: "Задание передано", stepFree: "Идёт разработка", noReload: "Не перезагружайте страницу. При случайной перезагрузке сессия восстановится с историей.", notInstalled: "не установлен", notLoggedIn: "нет входа в подписку", busy: "занят", pwdFail: "Проверка рабочей папки не прошла — терминал не в комнате проекта.", test: "Тест", testRunning: "Проверка…", testOk: "Агент ответил — всё работает. Можно запускать разработку.", testFail: "Агент не ответил на тест. Восстановление: нажмите «Выход», затем откройте пульт заново и повторите.", startDev: "Запустить разработку", devWaitAck: "Задание отправлено. Кнопка останется, пока агент не подтвердит старт.", devHanded: "Агент подтвердил — идёт разработка.", cliFail: "Агент не запустился — сообщение об ошибке видно в терминале. Выбор агента снова открыт — попробуйте ещё раз.", reportTitle: "Итог разработки", close: "Закрыть", copy: "Скопировать" },
  es: { workspace: "Carpeta de trabajo", sessionNew: "sesión nueva", sessionReattached: "sesión restaurada", provider: "Agente de código", model: "Modelo", startAgent: "Iniciar el agente", agentRunning: "Agente en marcha", paste: "Pegar", pasteTitle: "Pegar en la terminal (códigos, respuestas)", pasteSend: "Enviar", copyOut: "Copiar salida", copied: "Copiado.", exit: "Salir", exitConfirm: "¿Terminar la sesión definitivamente? La terminal del agente se cerrará.", stepPwd: "Carpeta verificada", stepCli: "Agente lanzado", stepLogin: "Acceso a la suscripción", stepTask: "Tarea entregada", stepFree: "Desarrollo en curso", noReload: "No recargues la página. Si se recarga por accidente, la sesión se reconecta con su historial.", notInstalled: "no instalado", notLoggedIn: "sin acceso a la suscripción", busy: "ocupado", pwdFail: "La verificación de la carpeta falló — la terminal no está en la sala del proyecto.", test: "Prueba", testRunning: "Probando…", testOk: "El agente respondió — todo funciona. Puedes iniciar el desarrollo.", testFail: "El agente no respondió a la prueba. Recuperación: pulsa «Salir», reabre la consola e inténtalo de nuevo.", startDev: "Iniciar desarrollo", devWaitAck: "Tarea enviada. El botón permanece hasta que el agente confirme el inicio.", devHanded: "El agente confirmó — el desarrollo está en marcha.", cliFail: "El agente no se inició — la terminal muestra el error. El selector de agente está abierto de nuevo — inténtalo otra vez.", reportTitle: "Informe del desarrollo", close: "Cerrar", copy: "Copiar" },
  fr: { workspace: "Dossier de travail", sessionNew: "nouvelle session", sessionReattached: "session restaurée", provider: "Agent de code", model: "Modèle", startAgent: "Démarrer l'agent", agentRunning: "Agent en cours", paste: "Coller", pasteTitle: "Coller dans le terminal (codes, réponses)", pasteSend: "Envoyer", copyOut: "Copier la sortie", copied: "Copié.", exit: "Quitter", exitConfirm: "Terminer la session définitivement ? Le terminal de l'agent sera fermé.", stepPwd: "Dossier vérifié", stepCli: "Agent lancé", stepLogin: "Connexion à l'abonnement", stepTask: "Tâche transmise", stepFree: "Développement en cours", noReload: "Ne rechargez pas la page. En cas de rechargement accidentel, la session se reconnecte avec son historique.", notInstalled: "non installé", notLoggedIn: "pas de connexion", busy: "occupé", pwdFail: "La vérification du dossier a échoué — le terminal n'est pas dans la salle du projet.", test: "Test", testRunning: "Test en cours…", testOk: "L'agent a répondu — tout fonctionne. Vous pouvez lancer le développement.", testFail: "L'agent n'a pas répondu au test. Récupération : cliquez sur « Quitter », rouvrez la console et réessayez.", startDev: "Lancer le développement", devWaitAck: "Tâche envoyée. Le bouton reste jusqu'à ce que l'agent confirme le démarrage.", devHanded: "L'agent a confirmé — le développement est en cours.", cliFail: "L'agent n'a pas démarré — le terminal affiche l'erreur. Le choix d'agent est de nouveau ouvert — réessayez.", reportTitle: "Rapport de développement", close: "Fermer", copy: "Copier" },
  it: { workspace: "Cartella di lavoro", sessionNew: "nuova sessione", sessionReattached: "sessione ripristinata", provider: "Agente di codice", model: "Modello", startAgent: "Avvia l'agente", agentRunning: "Agente in esecuzione", paste: "Incolla", pasteTitle: "Incolla nel terminale (codici, risposte)", pasteSend: "Invia", copyOut: "Copia output", copied: "Copiato.", exit: "Esci", exitConfirm: "Terminare la sessione definitivamente? Il terminale dell'agente verrà chiuso.", stepPwd: "Cartella verificata", stepCli: "Agente avviato", stepLogin: "Accesso all'abbonamento", stepTask: "Compito consegnato", stepFree: "Sviluppo in corso", noReload: "Non ricaricare la pagina. In caso di ricarica accidentale, la sessione si riconnette con la cronologia.", notInstalled: "non installato", notLoggedIn: "nessun accesso", busy: "occupato", pwdFail: "La verifica della cartella è fallita — il terminale non è nella stanza del progetto.", test: "Test", testRunning: "Test in corso…", testOk: "L'agente ha risposto — tutto funziona. Puoi avviare lo sviluppo.", testFail: "L'agente non ha risposto al test. Recupero: premi «Esci», riapri la console e riprova.", startDev: "Avvia lo sviluppo", devWaitAck: "Compito inviato. Il pulsante resta finché l'agente non conferma l'avvio.", devHanded: "L'agente ha confermato — lo sviluppo è in corso.", cliFail: "L'agente non si è avviato — il terminale mostra l'errore. La scelta dell'agente è di nuovo aperta — riprova.", reportTitle: "Rapporto di sviluppo", close: "Chiudi", copy: "Copia" },
  de: { workspace: "Arbeitsordner", sessionNew: "neue Sitzung", sessionReattached: "Sitzung wiederhergestellt", provider: "Coding-Agent", model: "Modell", startAgent: "Agent starten", agentRunning: "Agent läuft", paste: "Einfügen", pasteTitle: "In das Terminal einfügen (Codes, Antworten)", pasteSend: "Senden", copyOut: "Ausgabe kopieren", copied: "Kopiert.", exit: "Beenden", exitConfirm: "Sitzung endgültig beenden? Das Terminal des Agenten wird geschlossen.", stepPwd: "Ordner geprüft", stepCli: "Agent gestartet", stepLogin: "Abo-Anmeldung", stepTask: "Aufgabe übergeben", stepFree: "Entwicklung läuft", noReload: "Bitte die Seite nicht neu laden. Bei versehentlichem Neuladen verbindet sich die Sitzung mit ihrer Historie neu.", notInstalled: "nicht installiert", notLoggedIn: "keine Anmeldung", busy: "beschäftigt", pwdFail: "Die Ordnerprüfung schlug fehl — das Terminal ist nicht im Projektraum.", test: "Test", testRunning: "Test läuft…", testOk: "Der Agent hat geantwortet — alles funktioniert. Sie können die Entwicklung starten.", testFail: "Der Agent hat auf den Test nicht geantwortet. Wiederherstellung: «Beenden» drücken, die Konsole neu öffnen und erneut versuchen.", startDev: "Entwicklung starten", devWaitAck: "Aufgabe gesendet. Der Button bleibt, bis der Agent den Start bestätigt.", devHanded: "Der Agent hat bestätigt — die Entwicklung läuft.", cliFail: "Der Agent ist nicht gestartet — das Terminal zeigt den Fehler. Die Agentenauswahl ist wieder offen — bitte erneut versuchen.", reportTitle: "Entwicklungsbericht", close: "Schließen", copy: "Kopieren" },
  pt: { workspace: "Pasta de trabalho", sessionNew: "sessão nova", sessionReattached: "sessão restaurada", provider: "Agente de código", model: "Modelo", startAgent: "Iniciar o agente", agentRunning: "Agente em execução", paste: "Colar", pasteTitle: "Colar no terminal (códigos, respostas)", pasteSend: "Enviar", copyOut: "Copiar saída", copied: "Copiado.", exit: "Sair", exitConfirm: "Terminar a sessão definitivamente? O terminal do agente será fechado.", stepPwd: "Pasta verificada", stepCli: "Agente iniciado", stepLogin: "Login da assinatura", stepTask: "Tarefa entregue", stepFree: "Desenvolvimento em curso", noReload: "Não recarregue a página. Numa recarga acidental, a sessão reconecta-se com o histórico.", notInstalled: "não instalado", notLoggedIn: "sem login", busy: "ocupado", pwdFail: "A verificação da pasta falhou — o terminal não está na sala do projeto.", test: "Teste", testRunning: "Testando…", testOk: "O agente respondeu — tudo funciona. Pode iniciar o desenvolvimento.", testFail: "O agente não respondeu ao teste. Recuperação: prima «Sair», reabra a consola e tente novamente.", startDev: "Iniciar desenvolvimento", devWaitAck: "Tarefa enviada. O botão permanece até o agente confirmar o início.", devHanded: "O agente confirmou — o desenvolvimento está em curso.", cliFail: "O agente não iniciou — o terminal mostra o erro. A escolha do agente está aberta de novo — tente novamente.", reportTitle: "Relatório de desenvolvimento", close: "Fechar", copy: "Copiar" },
  pl: { workspace: "Folder roboczy", sessionNew: "nowa sesja", sessionReattached: "sesja przywrócona", provider: "Agent kodujący", model: "Model", startAgent: "Uruchom agenta", agentRunning: "Agent pracuje", paste: "Wklej", pasteTitle: "Wklej do terminala (kody, odpowiedzi)", pasteSend: "Wyślij", copyOut: "Kopiuj wyjście", copied: "Skopiowano.", exit: "Zakończ", exitConfirm: "Zakończyć sesję na stałe? Terminal agenta zostanie zamknięty.", stepPwd: "Folder zweryfikowany", stepCli: "Agent uruchomiony", stepLogin: "Logowanie subskrypcji", stepTask: "Zadanie przekazane", stepFree: "Trwa rozwój", noReload: "Nie przeładowuj strony. Przy przypadkowym przeładowaniu sesja połączy się ponownie z historią.", notInstalled: "niezainstalowany", notLoggedIn: "brak logowania", busy: "zajęty", pwdFail: "Weryfikacja folderu nie powiodła się — terminal nie jest w pokoju projektu.", test: "Test", testRunning: "Testowanie…", testOk: "Agent odpowiedział — wszystko działa. Możesz rozpocząć rozwój.", testFail: "Agent nie odpowiedział na test. Odzyskiwanie: naciśnij «Zakończ», otwórz konsolę ponownie i spróbuj jeszcze raz.", startDev: "Rozpocznij rozwój", devWaitAck: "Zadanie wysłane. Przycisk pozostaje, dopóki agent nie potwierdzi startu.", devHanded: "Agent potwierdził — rozwój trwa.", cliFail: "Agent nie wystartował — terminal pokazuje błąd. Wybór agenta jest znów otwarty — spróbuj ponownie.", reportTitle: "Raport z rozwoju", close: "Zamknij", copy: "Kopiuj" },
  tr: { workspace: "Çalışma klasörü", sessionNew: "yeni oturum", sessionReattached: "oturum geri yüklendi", provider: "Kodlama ajanı", model: "Model", startAgent: "Ajanı başlat", agentRunning: "Ajan çalışıyor", paste: "Yapıştır", pasteTitle: "Terminale yapıştır (kodlar, yanıtlar)", pasteSend: "Gönder", copyOut: "Çıktıyı kopyala", copied: "Kopyalandı.", exit: "Çıkış", exitConfirm: "Oturum kalıcı olarak sonlandırılsın mı? Ajanın terminali kapatılacak.", stepPwd: "Klasör doğrulandı", stepCli: "Ajan başlatıldı", stepLogin: "Abonelik girişi", stepTask: "Görev iletildi", stepFree: "Geliştirme sürüyor", noReload: "Sayfayı yeniden yüklemeyin. Yanlışlıkla yeniden yüklenirse oturum geçmişiyle birlikte yeniden bağlanır.", notInstalled: "kurulu değil", notLoggedIn: "abonelik girişi yok", busy: "meşgul", pwdFail: "Klasör doğrulaması başarısız — terminal proje odasında değil.", test: "Test", testRunning: "Test ediliyor…", testOk: "Ajan yanıt verdi — her şey çalışıyor. Geliştirmeyi başlatabilirsiniz.", testFail: "Ajan teste yanıt vermedi. Kurtarma: «Çıkış»a basın, konsolu yeniden açın ve tekrar deneyin.", startDev: "Geliştirmeyi başlat", devWaitAck: "Görev gönderildi. Ajan başlangıcı onaylayana kadar düğme kalır.", devHanded: "Ajan onayladı — geliştirme sürüyor.", cliFail: "Ajan başlatılamadı — terminal hatayı gösteriyor. Ajan seçimi yeniden açık — tekrar deneyin.", reportTitle: "Geliştirme raporu", close: "Kapat", copy: "Kopyala" },
  nl: { workspace: "Werkmap", sessionNew: "nieuwe sessie", sessionReattached: "sessie hersteld", provider: "Coding-agent", model: "Model", startAgent: "Agent starten", agentRunning: "Agent actief", paste: "Plakken", pasteTitle: "In de terminal plakken (codes, antwoorden)", pasteSend: "Versturen", copyOut: "Uitvoer kopiëren", copied: "Gekopieerd.", exit: "Afsluiten", exitConfirm: "Sessie definitief beëindigen? De terminal van de agent wordt gesloten.", stepPwd: "Werkmap geverifieerd", stepCli: "Agent gestart", stepLogin: "Abonnement-login", stepTask: "Taak overgedragen", stepFree: "Ontwikkeling bezig", noReload: "Herlaad de pagina niet. Bij een onbedoelde herlaad verbindt de sessie opnieuw met de historie.", notInstalled: "niet geïnstalleerd", notLoggedIn: "geen login", busy: "bezet", pwdFail: "De werkmapcontrole is mislukt — de terminal is niet in de projectkamer.", test: "Test", testRunning: "Testen…", testOk: "De agent reageerde — alles werkt. Je kunt de ontwikkeling starten.", testFail: "De agent reageerde niet op de test. Herstel: druk op «Afsluiten», open de console opnieuw en probeer het nogmaals.", startDev: "Ontwikkeling starten", devWaitAck: "Taak verzonden. De knop blijft totdat de agent de start bevestigt.", devHanded: "De agent bevestigde — de ontwikkeling loopt.", cliFail: "De agent is niet gestart — de terminal toont de fout. De agentkeuze is weer open — probeer het opnieuw.", reportTitle: "Ontwikkelingsrapport", close: "Sluiten", copy: "Kopiëren" },
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
  // THE DELIVERY LADDER (263.1, owner's design): Test → green toast → Start development → DEV marker.
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failToastId = useRef<string | number | null>(null);
  // A small FRESH window for CLI-startup errors (round 4): reset on every launch/test so replayed old
  // junk can never trigger it; scanned only between "Start the agent" and a confirmed development.
  const cliErrBufRef = useRef("");
  // Claude Code's one-time Bypass-Permissions consent screen (round 5): the conductor answers it
  // itself ("2. Yes, I accept") — once per launch, guarded by this flag.
  const bypassAckRef = useRef(false);
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
  // The final-report toast (owner 2026-07-19, v2): a custom sonner body — the built-in `action` slot
  // pins the button to the RIGHT and makes the text unselectable. Here the report text is selectable,
  // and the buttons live in their own BOTTOM row: Copy (the toast is the only place the report exists —
  // it must be copyable) + Close (still the only way to dismiss; duration stays Infinity).
  const showReport = useCallback((text: string) => {
    toast.custom((id) => (
      // pointer-events-auto is LOAD-BEARING (owner 2026-07-20): the dev console is a MODAL Radix dialog —
      // while it is open, body gets pointer-events:none and the toast inherits it, so Copy/Close were dead
      // until the console itself was closed. The card re-enables its own pointer events; the report must be
      // closable independently of the main development window.
      <div className="pointer-events-auto w-[min(480px,calc(100vw-32px))] rounded-lg border bg-background p-4 shadow-lg">
        <p className="text-sm font-semibold">{T.reportTitle}</p>
        <p className="mt-2 max-h-[50vh] select-text overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(text); toast.success(T.copied); }}>
            <Copy className="size-3.5" />
            {T.copy}
          </Button>
          <Button size="sm" onClick={() => toast.dismiss(id)}>{T.close}</Button>
        </div>
      </div>
    ), { duration: Infinity });
  }, [T.reportTitle, T.copy, T.copied, T.close]);

  const onData = useCallback((chunk: string) => {
    outRef.current = (outRef.current + chunk).slice(-100_000);
    const s = stepsRef.current;

    if (chunk.includes("[session reattached]")) {
      // A reattach proves ONE thing: the PTY (a zsh shell in the room) survived. It does NOT prove
      // the CLI agent ever started — the owner's live disaster (round 3): he had exited before
      // starting any agent, the restored session was BARE ZSH, my code assumed "agent running",
      // enabled Test, and the test prompt was executed BY THE SHELL ("zsh: no matches found").
      // So a reattach restores the terminal history and NOTHING else: the ladder restarts from the
      // very beginning (provider cards + "Start the agent"; Test stays disabled until then). Only
      // hard evidence moves us forward: the DEV marker in the 200KB replay flips to "developing"
      // below. The full instruction is never lost either way — the parent refetches the handoff on
      // every dialog open.
      setReattached(true);
      setSteps({ pwd: "done", cli: "todo", login: "todo", task: "todo", free: "todo" });
      // no return — the replayed chunk must still reach the marker scan below
    }
    // Step 1 — pwd verification: our own probe answer contains the room path on its own line.
    if (s.pwd === "doing" && outRef.current.includes(roomPath)) {
      setStep("pwd", "done");
    }
    // Step 2b — CLI-STARTUP FAILURE (owner's round-4 transcript): the click on "Start the agent" is NOT
    // evidence the agent runs. If the shell answers with a startup refusal ("cannot be used with
    // root/sudo") or bounces our text ("command not found" — the prompt landed in zsh, not an agent),
    // fail FAST: red toast, cancel any test spinner, bring the provider cards back. Evidence over clicks.
    if (startedRef.current && (phaseRef.current === "idle" || phaseRef.current === "testing")) {
      cliErrBufRef.current = (cliErrBufRef.current + stripAnsi(chunk)).slice(-500);
      const w = cliErrBufRef.current;
      // Step 2c — Claude Code's Bypass-Permissions consent screen (owner's round-5 transcript): the CLI
      // itself asks "Yes, I accept" once before entering auto mode. The conductor answers for the user:
      // "2" selects the accept option, the trailing Enter confirms. Harmless if already confirmed.
      if (!bypassAckRef.current && w.includes("Yes, I accept")) {
        bypassAckRef.current = true;
        cliErrBufRef.current = "";
        termRef.current?.sendStdin("2");
        setTimeout(() => termRef.current?.sendStdin("\r"), 250);
        return;
      }
      if (w.includes("cannot be used with root") || w.includes("command not found")) {
        cliErrBufRef.current = "";
        if (testTimer.current) clearTimeout(testTimer.current);
        if (failToastId.current != null) toast.dismiss(failToastId.current);
        startedRef.current = false;
        setAgentStarted(false);
        setPhase("idle");
        setStep("cli", "fail");
        failToastId.current = toast.error(T.cliFail, { duration: Infinity });
      }
    }
    // Step 3 — THE AUTH CONVEYOR (the :3002 pipeline): keep a clean joined buffer, debounce 300ms, match
    // the per-platform descriptors against a space-stripped copy (PTY line-wraps reassembled), extract
    // the URL (+ device code) and open the guided modal. One modal at a time.
    // 16000 (was 4000): the window must also hold the agent's final report envelope (round 6).
    rawBufRef.current = (rawBufRef.current + stripAnsi(chunk).replace(/\r\n|\r|\n/g, " ")).slice(-16_000);
    if (!activeAuthRef.current) {
      if (urlDetectTimer.current) clearTimeout(urlDetectTimer.current);
      urlDetectTimer.current = setTimeout(() => {
        if (activeAuthRef.current) return;
        const bufForSearch = rawBufRef.current.replace(/ /g, "");
        for (const descriptor of AUTH_FLOW_DESCRIPTORS) {
          const match = bufForSearch.match(descriptor.detectUrl);
          if (match) {
            // bufForSearch has all spaces removed — PTY line-wrap artifacts are gone, the URL is
            // reconstructed whole. detectUrl patterns end at &state=<value>, stopping at the boundary.
            let extractedUrl = match[0];
            // Guard against duplicate URLs if PTY reprints via \r.
            const dupeIdx = extractedUrl.indexOf("https://", 8);
            if (dupeIdx !== -1) extractedUrl = extractedUrl.slice(0, dupeIdx);
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
    // Step 4 — THE MARKER HANDSHAKE (263.1, replaces the old "4s of silence" auto-delivery which lost
    // the task whenever an auth flow ate the quiet window). We authored the prompts, so we demand a
    // printed ack: the agent's own output is the only proof. The scan runs on the de-spaced clean
    // buffer (PTY line-wraps reassembled); the prompts carry the marker SPLIT, so the echo never matches.
    const despaced = rawBufRef.current.replace(/ /g, "");
    if (phaseRef.current === "testing" && despaced.includes(TEST_MARKER)) {
      if (testTimer.current) clearTimeout(testTimer.current);
      if (failToastId.current != null) { toast.dismiss(failToastId.current); failToastId.current = null; }
      rawBufRef.current = "";
      setPhase("tested");
      setStep("login", "done");
      toast.success(T.testOk);
    } else if (phaseRef.current !== "developing" && despaced.includes(DEV_MARKER)) {
      // Development has REALLY begun — only now do the buttons leave the screen. Accepted from ANY
      // phase (a reattach replay may carry the marker before any click this session).
      rawBufRef.current = "";
      setPhase("developing");
      setAgentStarted(true);
      startedRef.current = true;
      setSteps({ pwd: "done", cli: "done", login: "done", task: "done", free: "doing" });
      toast.success(T.devHanded);
    }
    // Step 5 — THE FINAL REPORT (round 6, owner's design): the agent wraps its closing report between
    // the REPORT markers. Capture the text from the SPACED buffer (space-tolerant markers — PTY wraps),
    // have the server translate it into the UI language, and show it in a toast that NEVER auto-closes
    // (duration Infinity; the action button is the only way to dismiss — owner 2026-07-19).
    // NOT one-shot (owner 2026-07-20: "the report modal did not appear at all"): the old reportShownRef
    // flag allowed ONE report per console open, so an agent's second report in the same session (a
    // follow-up task) was swallowed forever. Same consumption pattern as the other markers above:
    // extract, then CLEAR the buffer — the next report accumulates fresh and fires again.
    if (phaseRef.current === "developing" && despaced.includes(REPORT_END)) {
      const buf = rawBufRef.current;
      const mBegin = tolerant(REPORT_BEGIN).exec(buf);
      const mEnd = tolerant(REPORT_END).exec(buf);
      if (mBegin && mEnd && mBegin.index + mBegin[0].length < mEnd.index) {
        rawBufRef.current = "";
        const report = buf.slice(mBegin.index + mBegin[0].length, mEnd.index).replace(/\s+/g, " ").trim();
        setStep("free", "done");
        fetch("/api/projects/dev-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report, lang }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { text?: string } | null) => showReport(d?.text || report))
          .catch(() => showReport(report));
      }
    }
  }, [roomPath, lang, setStep, showReport, T.testOk, T.devHanded, T.cliFail]);

  // The pwd probe once the shell settles (fresh sessions only).
  useEffect(() => {
    const t = setTimeout(() => {
      if (!reattached && stepsRef.current.pwd === "doing") termRef.current?.sendStdin("pwd\n");
    }, 1600);
    return () => clearTimeout(t);
  }, [reattached]);

  const startAgent = useCallback(() => {
    if (stepsRef.current.pwd !== "done") { toast.error(T.pwdFail); return; }
    if (failToastId.current != null) { toast.dismiss(failToastId.current); failToastId.current = null; }
    cliErrBufRef.current = "";
    bypassAckRef.current = false;
    const p = PROVIDERS.find((x) => x.id === provider) ?? PROVIDERS[0];
    setAgentStarted(true);
    startedRef.current = true;
    setStep("cli", "done");
    setStep("login", "doing");
    termRef.current?.sendStdin(p.cli(model));
  }, [provider, model, setStep, T.pwdFail]);

  // STAGE 1 — the TEST button (findings 12 + owner's two-stage design): send the canonical mini-prompt,
  // wait for the printed ack marker. Success = green toast + the button swaps to "Start development".
  // No ack within the window = a RED persistent toast whose primary advice is the clean cycle ("Exit,
  // re-enter") — the causes of a broken session are unpredictable, a fresh start covers them all.
  const armTestTimeout = useCallback(() => {
    if (testTimer.current) clearTimeout(testTimer.current);
    testTimer.current = setTimeout(() => {
      if (phaseRef.current !== "testing") return;
      // An open auth modal legitimately stalls the terminal — keep waiting, don't fail the test.
      if (activeAuthRef.current) { armTestTimeout(); return; }
      setPhase("idle");
      failToastId.current = toast.error(T.testFail, { duration: Infinity });
    }, 25_000);
  }, [T.testFail]);

  const runTest = useCallback(() => {
    if (failToastId.current != null) { toast.dismiss(failToastId.current); failToastId.current = null; }
    cliErrBufRef.current = "";
    setPhase("testing");
    // Send AND submit (finding 13): the trailing \r presses Enter in the CLI prompt.
    termRef.current?.sendStdin(TEST_PROMPT + "\n");
    setTimeout(() => termRef.current?.sendStdin("\r"), 250);
    armTestTimeout();
  }, [armTestTimeout]);

  // STAGE 2 — START DEVELOPMENT: hand the room task prefixed with the marker demand. The button does
  // NOT leave the screen on click — only the printed DEV marker (the handshake) hides it, so a delivery
  // swallowed by an auth prompt can simply be retried.
  const startDevelopment = useCallback(() => {
    setPhase("handing");
    setStep("task", "doing");
    toast.message(T.devWaitAck);
    termRef.current?.sendStdin(devPrompt(roomTask).replace(/\r?\n/g, "\n") + "\n");
    setTimeout(() => termRef.current?.sendStdin("\r"), 250);
  }, [roomTask, setStep, T.devWaitAck]);

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
    if (failToastId.current != null) { toast.dismiss(failToastId.current); failToastId.current = null; }
    if (testTimer.current) clearTimeout(testTimer.current);
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
        {/* THE DELIVERY LADDER (263.1): Test first; a green toast swaps it for Start development, which
            stays (re-clickable) until the agent prints the DEV marker — proof development really began.
            The Test button is ALWAYS VISIBLE from the first open (owner, second round: hiding it until
            the agent starts read as "there is no test button") — merely disabled until the CLI runs. */}
        {(phase === "idle" || phase === "testing") && (
          <Button size="sm" onClick={runTest} disabled={!agentStarted || phase === "testing" || !!activeAuth} data-dev-console-test="1">
            {phase === "testing" ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
            {phase === "testing" ? T.testRunning : T.test}
          </Button>
        )}
        {agentStarted && (phase === "tested" || phase === "handing") && (
          <Button size="sm" onClick={startDevelopment} disabled={!!activeAuth} data-dev-console-startdev="1">
            {phase === "handing" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            {T.startDev}
          </Button>
        )}
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
