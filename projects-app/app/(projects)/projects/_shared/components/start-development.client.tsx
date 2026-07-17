"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Copy, Loader2, ListChecks, Rocket, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";

// THE LAUNCH DIALOG (step 233 → the wave in 240 → the LIGHT HAND-OFF in 249). The owner's single hand-off,
// with the step machinery REMOVED (owner 2026-07-17): no Development Step file, no page lock, no number to
// run. The dialog now shows TWO copyable tasks, stacked:
//
//   1. FIRST SESSION — the full-context task: an address + a mandate (the agent loads the architecture JSON
//      itself). Copy this when the coding agent has not worked on this automation yet.
//   2. CONTINUATION — the delta task: only the changes staged since the last hand-off (one or many), briefs
//      inline, with an explicit "do not reload the full JSON" (a warm agent already holds the context —
//      re-pasting everything would only overflow it).
//
// Discipline is the owner's own (maximal minimalism, his decision): after copying, a toast says to wait for
// the agent to finish before editing further. No lock is taken anywhere.
//
// THE GATES STAY (they were never about steps): the use-case review gate (step 231, confirm button right
// here), the stub-node refusal (step 247 П5) and "nothing staged". They now live in GET /api/projects/handoff.
type Case = { cuid: string; title: string; summary: string; status: string };
type Mode = "loading" | "review" | "ready" | "no-cases" | "nothing-staged" | "stub-nodes";

type SD = {
  title: string;
  preparing: string;
  reviewHeading: string; reviewIntro: string; confirm: string; confirming: string;
  readyIntro: string;
  firstTitle: string; firstBody: string;
  nextTitle: string; nextBody: string;
  copy: string; copiedWait: string;
  noCasesTitle: string; noCasesBody: string; noStagedTitle: string; noStagedBody: string;
  stubTitle: string; stubBody: string;
  failed: string; noDescription: string;
};
const I18N: Record<string, SD> = {
  en: {
    title: "Start development",
    preparing: "Preparing the task…",
    reviewHeading: "Read your use cases and confirm before development starts",
    reviewIntro: "This is where you and the AI agree. Read what it understood; if anything is wrong, close this and fix the case with its pencil. Development starts only after you confirm.",
    confirm: "I read them — the AI understood me", confirming: "Confirming…",
    readyIntro: "Copy ONE of the two tasks below and paste it into your AI coding agent's chat (Claude Code / Codex / …).",
    firstTitle: "First session", firstBody: "The agent has not worked on this automation yet: this task gives it the full context.",
    nextTitle: "Continue the session", nextBody: "The agent is already working on this automation: this task carries only the new changes ({n}).",
    copy: "Copy", copiedWait: "Copied. After handing it to the agent, wait for it to finish before making new changes.",
    noCasesTitle: "Describe the use cases first", noCasesBody: "This automation has no use cases yet. Open the Quiz on this page and describe your scenarios — development cannot start without them.",
    noStagedTitle: "Nothing staged for development", noStagedBody: "There are no pending requirements right now — describe a change first (a node's brief, a requirement, or a Sparkles comment).",
    stubTitle: "Some nodes have no description", stubBody: "These nodes still carry the blank template text: {nodes}. A coding agent cannot build a node nobody described — open each one and say what it should do, or delete it. Then launch again.",
    failed: "Could not prepare the task.", noDescription: "No description yet.",
  },
  ru: {
    title: "Запустить разработку",
    preparing: "Готовлю задание…",
    reviewHeading: "Прочитайте кейсы и подтвердите — до начала разработки",
    reviewIntro: "Здесь вы и ИИ договариваетесь. Прочитайте, что он понял; если что-то не так — закройте и поправьте кейс карандашом. Разработка начнётся только после подтверждения.",
    confirm: "Я прочитал — ИИ понял меня правильно", confirming: "Подтверждаю…",
    readyIntro: "Скопируйте ОДНО из двух заданий ниже и вставьте его в чат вашего ИИ-агента-кодера (Claude Code / Codex / …).",
    firstTitle: "Первая сессия", firstBody: "Агент ещё не работал с этой автоматизацией: задание даст ему полный контекст.",
    nextTitle: "Продолжить сессию", nextBody: "Агент уже работает с этой автоматизацией: задание содержит только новые изменения ({n}).",
    copy: "Скопировать", copiedWait: "Скопировано. Передав задание агенту, дождитесь завершения его работы, прежде чем вносить новые изменения.",
    noCasesTitle: "Сначала опишите пользовательские кейсы", noCasesBody: "У этой автоматизации ещё нет кейсов. Откройте Quiz на этой странице и опишите сценарии — без них разработку не начать.",
    noStagedTitle: "В разработку ничего не передано", noStagedBody: "Сейчас нет ожидающих требований — сначала опишите изменение (требование узла, требование сущности или комментарий через ✦).",
    stubTitle: "У некоторых узлов нет описания", stubBody: "Эти узлы всё ещё несут пустой шаблонный текст: {nodes}. Агент-программист не может построить узел, который никто не описал — откройте каждый и скажите, что он должен делать, или удалите его. Затем запустите разработку снова.",
    failed: "Не удалось подготовить задание.", noDescription: "Пока без описания.",
  },
  es: {
    title: "Iniciar desarrollo",
    preparing: "Preparando la tarea…",
    reviewHeading: "Lee tus casos de uso y confirma antes de empezar el desarrollo",
    reviewIntro: "Aquí es donde tú y la IA os ponéis de acuerdo. Lee lo que entendió; si algo está mal, cierra y corrige el caso con su lápiz. El desarrollo empieza solo después de que confirmes.",
    confirm: "Los leí — la IA me entendió", confirming: "Confirmando…",
    readyIntro: "Copia UNA de las dos tareas de abajo y pégala en el chat de tu agente de código de IA (Claude Code / Codex / …).",
    firstTitle: "Primera sesión", firstBody: "El agente aún no ha trabajado con esta automatización: esta tarea le da el contexto completo.",
    nextTitle: "Continuar la sesión", nextBody: "El agente ya trabaja con esta automatización: esta tarea lleva solo los cambios nuevos ({n}).",
    copy: "Copiar", copiedWait: "Copiado. Tras entregarla al agente, espera a que termine antes de hacer nuevos cambios.",
    noCasesTitle: "Describe primero los casos de uso", noCasesBody: "Esta automatización aún no tiene casos de uso. Abre el Quiz en esta página y describe tus escenarios — sin ellos no se puede empezar el desarrollo.",
    noStagedTitle: "Nada pendiente de desarrollo", noStagedBody: "Ahora mismo no hay requisitos pendientes — describe primero un cambio (el requisito de un nodo, de una entidad o un comentario con ✦).",
    stubTitle: "Algunos nodos no tienen descripción", stubBody: "Estos nodos aún llevan el texto de plantilla vacío: {nodes}. Un agente de código no puede construir un nodo que nadie describió — abra cada uno y diga qué debe hacer, o elimínelo. Luego vuelva a lanzar.",
    failed: "No se pudo preparar la tarea.", noDescription: "Aún sin descripción.",
  },
  fr: {
    title: "Démarrer le développement",
    preparing: "Préparation de la tâche…",
    reviewHeading: "Lisez vos cas d'usage et confirmez avant le début du développement",
    reviewIntro: "C'est ici que vous et l'IA vous mettez d'accord. Lisez ce qu'elle a compris ; si quelque chose ne va pas, fermez et corrigez le cas avec son crayon. Le développement ne commence qu'après votre confirmation.",
    confirm: "Je les ai lus — l'IA m'a compris", confirming: "Confirmation…",
    readyIntro: "Copiez UNE des deux tâches ci-dessous et collez-la dans le chat de votre agent de code IA (Claude Code / Codex / …).",
    firstTitle: "Première session", firstBody: "L'agent n'a pas encore travaillé sur cette automatisation : cette tâche lui donne le contexte complet.",
    nextTitle: "Poursuivre la session", nextBody: "L'agent travaille déjà sur cette automatisation : cette tâche ne porte que les nouveaux changements ({n}).",
    copy: "Copier", copiedWait: "Copié. Après l'avoir remise à l'agent, attendez qu'il termine avant de faire de nouveaux changements.",
    noCasesTitle: "Décrivez d'abord les cas d'usage", noCasesBody: "Cette automatisation n'a pas encore de cas d'usage. Ouvrez le Quiz sur cette page et décrivez vos scénarios — sans eux, le développement ne peut pas commencer.",
    noStagedTitle: "Rien en attente de développement", noStagedBody: "Aucune exigence en attente pour l'instant — décrivez d'abord un changement (l'exigence d'un nœud, d'une entité ou un commentaire via ✦).",
    stubTitle: "Certains nœuds n'ont pas de description", stubBody: "Ces nœuds portent encore le texte de modèle vide : {nodes}. Un agent de code ne peut pas construire un nœud que personne n'a décrit — ouvrez chacun et dites ce qu'il doit faire, ou supprimez-le. Puis relancez.",
    failed: "Impossible de préparer la tâche.", noDescription: "Pas encore de description.",
  },
  it: {
    title: "Avvia lo sviluppo",
    preparing: "Preparo il compito…",
    reviewHeading: "Leggi i tuoi casi d'uso e conferma prima che inizi lo sviluppo",
    reviewIntro: "Qui tu e l'IA vi mettete d'accordo. Leggi ciò che ha capito; se qualcosa non va, chiudi e correggi il caso con la sua matita. Lo sviluppo inizia solo dopo la tua conferma.",
    confirm: "Li ho letti — l'IA mi ha capito", confirming: "Conferma…",
    readyIntro: "Copia UNO dei due compiti qui sotto e incollalo nella chat del tuo agente di codice IA (Claude Code / Codex / …).",
    firstTitle: "Prima sessione", firstBody: "L'agente non ha ancora lavorato su questa automazione: questo compito gli dà il contesto completo.",
    nextTitle: "Continua la sessione", nextBody: "L'agente sta già lavorando su questa automazione: questo compito porta solo le modifiche nuove ({n}).",
    copy: "Copia", copiedWait: "Copiato. Dopo averlo consegnato all'agente, attendi che finisca prima di fare nuove modifiche.",
    noCasesTitle: "Descrivi prima i casi d'uso", noCasesBody: "Questa automazione non ha ancora casi d'uso. Apri il Quiz in questa pagina e descrivi i tuoi scenari — senza di essi non si può iniziare lo sviluppo.",
    noStagedTitle: "Niente in attesa di sviluppo", noStagedBody: "Al momento non ci sono richieste in sospeso — descrivi prima una modifica (la richiesta di un nodo, di un'entità o un commento con ✦).",
    stubTitle: "Alcuni nodi non hanno descrizione", stubBody: "Questi nodi portano ancora il testo di modello vuoto: {nodes}. Un agente di codice non può costruire un nodo che nessuno ha descritto — apra ciascuno e dica cosa deve fare, oppure lo elimini. Poi rilanci.",
    failed: "Impossibile preparare il compito.", noDescription: "Ancora nessuna descrizione.",
  },
  de: {
    title: "Entwicklung starten",
    preparing: "Aufgabe wird vorbereitet…",
    reviewHeading: "Lies deine Anwendungsfälle und bestätige, bevor die Entwicklung beginnt",
    reviewIntro: "Hier einigt ihr euch, du und die KI. Lies, was sie verstanden hat; wenn etwas nicht stimmt, schließe und korrigiere den Fall mit seinem Stift. Die Entwicklung startet erst nach deiner Bestätigung.",
    confirm: "Ich habe sie gelesen — die KI hat mich verstanden", confirming: "Bestätige…",
    readyIntro: "Kopiere EINE der beiden Aufgaben unten und füge sie in den Chat deines KI-Coding-Agenten ein (Claude Code / Codex / …).",
    firstTitle: "Erste Sitzung", firstBody: "Der Agent hat noch nicht an dieser Automatisierung gearbeitet: diese Aufgabe gibt ihm den vollen Kontext.",
    nextTitle: "Sitzung fortsetzen", nextBody: "Der Agent arbeitet bereits an dieser Automatisierung: diese Aufgabe trägt nur die neuen Änderungen ({n}).",
    copy: "Kopieren", copiedWait: "Kopiert. Warte nach der Übergabe an den Agenten, bis er fertig ist, bevor du neue Änderungen machst.",
    noCasesTitle: "Beschreibe zuerst die Anwendungsfälle", noCasesBody: "Diese Automatisierung hat noch keine Anwendungsfälle. Öffne das Quiz auf dieser Seite und beschreibe deine Szenarien — ohne sie kann die Entwicklung nicht beginnen.",
    noStagedTitle: "Nichts zur Entwicklung vorgemerkt", noStagedBody: "Es gibt gerade keine offenen Anforderungen — beschreibe zuerst eine Änderung (die Anforderung eines Knotens, einer Entität oder einen Kommentar über ✦).",
    stubTitle: "Einige Knoten haben keine Beschreibung", stubBody: "Diese Knoten tragen noch den leeren Vorlagentext: {nodes}. Ein Coding-Agent kann keinen Knoten bauen, den niemand beschrieben hat — öffne jeden und sage, was er tun soll, oder lösche ihn. Dann starte erneut.",
    failed: "Die Aufgabe konnte nicht vorbereitet werden.", noDescription: "Noch keine Beschreibung.",
  },
  pt: {
    title: "Iniciar desenvolvimento",
    preparing: "A preparar a tarefa…",
    reviewHeading: "Leia os seus casos de uso e confirme antes de o desenvolvimento começar",
    reviewIntro: "É aqui que você e a IA chegam a acordo. Leia o que ela percebeu; se algo estiver errado, feche e corrija o caso com o lápis. O desenvolvimento só começa depois de confirmar.",
    confirm: "Li-os — a IA percebeu-me", confirming: "A confirmar…",
    readyIntro: "Copie UMA das duas tarefas abaixo e cole-a no chat do seu agente de código de IA (Claude Code / Codex / …).",
    firstTitle: "Primeira sessão", firstBody: "O agente ainda não trabalhou nesta automação: esta tarefa dá-lhe o contexto completo.",
    nextTitle: "Continuar a sessão", nextBody: "O agente já está a trabalhar nesta automação: esta tarefa traz apenas as alterações novas ({n}).",
    copy: "Copiar", copiedWait: "Copiado. Depois de a entregar ao agente, espere que termine antes de fazer novas alterações.",
    noCasesTitle: "Descreva primeiro os casos de uso", noCasesBody: "Esta automação ainda não tem casos de uso. Abra o Quiz nesta página e descreva os seus cenários — sem eles o desenvolvimento não pode começar.",
    noStagedTitle: "Nada pendente de desenvolvimento", noStagedBody: "Não há requisitos pendentes neste momento — descreva primeiro uma alteração (o requisito de um nó, de uma entidade ou um comentário via ✦).",
    stubTitle: "Alguns nós não têm descrição", stubBody: "Estes nós ainda trazem o texto de modelo vazio: {nodes}. Um agente de código não pode construir um nó que ninguém descreveu — abra cada um e diga o que deve fazer, ou elimine-o. Depois lance de novo.",
    failed: "Não foi possível preparar a tarefa.", noDescription: "Ainda sem descrição.",
  },
  pl: {
    title: "Uruchom rozwój",
    preparing: "Przygotowuję zadanie…",
    reviewHeading: "Przeczytaj swoje przypadki użycia i potwierdź przed rozpoczęciem rozwoju",
    reviewIntro: "Tutaj ty i AI dochodzicie do porozumienia. Przeczytaj, co zrozumiała; jeśli coś jest nie tak, zamknij i popraw przypadek ołówkiem. Rozwój zaczyna się dopiero po twoim potwierdzeniu.",
    confirm: "Przeczytałem je — AI mnie zrozumiała", confirming: "Potwierdzam…",
    readyIntro: "Skopiuj JEDNO z dwóch zadań poniżej i wklej je do czatu swojego agenta kodującego AI (Claude Code / Codex / …).",
    firstTitle: "Pierwsza sesja", firstBody: "Agent nie pracował jeszcze z tą automatyzacją: to zadanie daje mu pełny kontekst.",
    nextTitle: "Kontynuuj sesję", nextBody: "Agent już pracuje z tą automatyzacją: to zadanie niesie tylko nowe zmiany ({n}).",
    copy: "Kopiuj", copiedWait: "Skopiowano. Po przekazaniu agentowi poczekaj, aż skończy, zanim wprowadzisz nowe zmiany.",
    noCasesTitle: "Najpierw opisz przypadki użycia", noCasesBody: "Ta automatyzacja nie ma jeszcze przypadków użycia. Otwórz Quiz na tej stronie i opisz swoje scenariusze — bez nich rozwój nie może się rozpocząć.",
    noStagedTitle: "Nic nie czeka na rozwój", noStagedBody: "Obecnie nie ma oczekujących wymagań — najpierw opisz zmianę (wymaganie węzła, encji lub komentarz przez ✦).",
    stubTitle: "Niektóre węzły nie mają opisu", stubBody: "Te węzły wciąż niosą pusty tekst szablonu: {nodes}. Agent kodujący nie zbuduje węzła, którego nikt nie opisał — otwórz każdy i powiedz, co ma robić, albo go usuń. Potem uruchom ponownie.",
    failed: "Nie udało się przygotować zadania.", noDescription: "Jeszcze bez opisu.",
  },
  tr: {
    title: "Geliştirmeyi başlat",
    preparing: "Görev hazırlanıyor…",
    reviewHeading: "Geliştirme başlamadan önce kullanım senaryolarınızı okuyun ve onaylayın",
    reviewIntro: "Burada siz ve yapay zekâ anlaşırsınız. Ne anladığını okuyun; bir şey yanlışsa kapatın ve senaryoyu kalemiyle düzeltin. Geliştirme yalnızca onayınızdan sonra başlar.",
    confirm: "Onları okudum — yapay zekâ beni anladı", confirming: "Onaylanıyor…",
    readyIntro: "Aşağıdaki iki görevden BİRİNİ kopyalayın ve yapay zekâ kod ajanınızın sohbetine yapıştırın (Claude Code / Codex / …).",
    firstTitle: "İlk oturum", firstBody: "Ajan bu otomasyonla henüz çalışmadı: bu görev ona tam bağlamı verir.",
    nextTitle: "Oturuma devam et", nextBody: "Ajan bu otomasyonla zaten çalışıyor: bu görev yalnızca yeni değişiklikleri taşır ({n}).",
    copy: "Kopyala", copiedWait: "Kopyalandı. Ajana teslim ettikten sonra, yeni değişiklikler yapmadan önce bitirmesini bekleyin.",
    noCasesTitle: "Önce kullanım senaryolarını tanımlayın", noCasesBody: "Bu otomasyonun henüz kullanım senaryosu yok. Bu sayfadaki Quiz'i açın ve senaryolarınızı tanımlayın — onlar olmadan geliştirme başlayamaz.",
    noStagedTitle: "Geliştirme bekleyen bir şey yok", noStagedBody: "Şu anda bekleyen gereksinim yok — önce bir değişiklik tanımlayın (bir düğümün, bir varlığın gereksinimi ya da ✦ ile bir yorum).",
    stubTitle: "Bazı düğümlerin açıklaması yok", stubBody: "Bu düğümler hâlâ boş şablon metnini taşıyor: {nodes}. Kodlama ajanı kimsenin tanımlamadığı bir düğümü inşa edemez — her birini açıp ne yapması gerektiğini söyleyin ya da silin. Sonra yeniden başlatın.",
    failed: "Görev hazırlanamadı.", noDescription: "Henüz açıklama yok.",
  },
  nl: {
    title: "Ontwikkeling starten",
    preparing: "Taak wordt voorbereid…",
    reviewHeading: "Lees je use cases en bevestig voordat de ontwikkeling begint",
    reviewIntro: "Hier komen jij en de AI tot overeenstemming. Lees wat ze begrepen heeft; klopt er iets niet, sluit dan en corrigeer de case met het potlood. De ontwikkeling begint pas na jouw bevestiging.",
    confirm: "Ik heb ze gelezen — de AI heeft me begrepen", confirming: "Bevestigen…",
    readyIntro: "Kopieer ÉÉN van de twee taken hieronder en plak die in de chat van je AI coding agent (Claude Code / Codex / …).",
    firstTitle: "Eerste sessie", firstBody: "De agent heeft nog niet aan deze automatisering gewerkt: deze taak geeft hem de volledige context.",
    nextTitle: "Sessie voortzetten", nextBody: "De agent werkt al aan deze automatisering: deze taak bevat alleen de nieuwe wijzigingen ({n}).",
    copy: "Kopiëren", copiedWait: "Gekopieerd. Wacht na de overdracht aan de agent tot hij klaar is voordat je nieuwe wijzigingen maakt.",
    noCasesTitle: "Beschrijf eerst de use cases", noCasesBody: "Deze automatisering heeft nog geen use cases. Open de Quiz op deze pagina en beschrijf je scenario's — zonder deze kan de ontwikkeling niet beginnen.",
    noStagedTitle: "Niets wacht op ontwikkeling", noStagedBody: "Er zijn momenteel geen openstaande eisen — beschrijf eerst een wijziging (de eis van een node, een entiteit of een opmerking via ✦).",
    stubTitle: "Sommige nodes hebben geen beschrijving", stubBody: "Deze nodes dragen nog de lege sjabloontekst: {nodes}. Een coding agent kan geen node bouwen die niemand beschreven heeft — open elke node en zeg wat die moet doen, of verwijder hem. Start daarna opnieuw.",
    failed: "Kon de taak niet voorbereiden.", noDescription: "Nog geen beschrijving.",
  },
};

export function StartDevelopment({
  automation,
  open,
  onOpenChange,
  onLaunched,
}: {
  automation: string;
  /** Controlled by the banner (step 240) — this dialog no longer has a trigger of its own. */
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Kept for the banner's wiring; the light flow (step 249) takes no lock, so it is never fired. */
  onLaunched?: () => void;
}) {
  void onLaunched;
  const lang = useUiLang();
  const L = I18N[lang] ?? I18N.en;
  const [mode, setMode] = useState<Mode>("loading");
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [fullTask, setFullTask] = useState("");
  const [deltaTask, setDeltaTask] = useState("");
  const [staged, setStaged] = useState(0);
  // Step 247 (П5): the node names the launch gate refused over — shown so the owner knows WHICH to describe.
  const [stubNodes, setStubNodes] = useState<string[]>([]);

  // Ask the server for the two copyable tasks. The gate answers 409 (not-reviewed → show the cases to
  // confirm right here; no-cases / nothing-staged / stub-nodes → say why). 200 → both tasks are ready.
  const load = useCallback(async () => {
    setMode("loading");
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/handoff?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (r.ok) {
        const d = (await r.json()) as { full: string; delta: string; staged: number };
        setFullTask(d.full);
        setDeltaTask(d.delta);
        setStaged(d.staged);
        setMode("ready");
        return;
      }
      const d = (await r.json().catch(() => ({}))) as { reason?: string; nodes?: string[] };
      if (d.reason === "stub-nodes") {
        setStubNodes(d.nodes ?? []);
        setMode("stub-nodes");
      } else if (d.reason === "not-reviewed") {
        const cr = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        const cd = (await cr.json().catch(() => ({}))) as { cases?: Case[] };
        setCases(cd.cases ?? []);
        setMode("review");
      } else if (d.reason === "no-cases") {
        setMode("no-cases");
      } else if (d.reason === "nothing-staged") {
        setMode("nothing-staged");
      } else {
        toast.error(L.failed);
        onOpenChange(false);
      }
    } finally { setBusy(false); }
  }, [automation, L, onOpenChange]);

  // Confirm the cases, then immediately continue to the tasks — one uninterrupted flow.
  const confirmAndContinue = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/use-cases/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      if (!r.ok) { toast.error(L.failed); return; }
      await load();
    } finally { setBusy(false); }
  }, [automation, L, load]);

  const onOpen = (v: boolean) => {
    onOpenChange(v);
    if (v) void load();
  };
  useEffect(() => {
    if (open && mode === "loading" && !busy) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copyTask = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(L.copiedWait, { duration: 6000 });
  };

  return (
    <>
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
              <Loader2 className="size-4 animate-spin" /> {L.preparing}
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

          {/* READY — the two copyable tasks, stacked (step 249: first session / continuation). */}
          {mode === "ready" && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground">{L.readyIntro}</p>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Rocket className="size-4 text-muted-foreground" /> {L.firstTitle}
                </p>
                <p className="text-sm text-muted-foreground">{L.firstBody}</p>
                <Button size="sm" variant="outline" onClick={() => copyTask(fullTask)}>
                  <Copy className="size-3.5" /> {L.copy}
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquarePlus className="size-4 text-muted-foreground" /> {L.nextTitle}
                </p>
                <p className="text-sm text-muted-foreground">{L.nextBody.replace("{n}", String(staged))}</p>
                <Button size="sm" variant="outline" onClick={() => copyTask(deltaTask)}>
                  <Copy className="size-3.5" /> {L.copy}
                </Button>
              </div>
            </div>
          )}

          {mode === "no-cases" && (
            <div className="space-y-1 py-4 text-sm">
              <p className="font-medium">{L.noCasesTitle}</p>
              <p className="text-muted-foreground">{L.noCasesBody}</p>
            </div>
          )}

          {mode === "nothing-staged" && (
            <div className="space-y-1 py-4 text-sm">
              <p className="font-medium">{L.noStagedTitle}</p>
              <p className="text-muted-foreground">{L.noStagedBody}</p>
            </div>
          )}

          {mode === "stub-nodes" && (
            <div className="space-y-1 py-4 text-sm">
              <p className="font-medium">{L.stubTitle}</p>
              <p className="text-muted-foreground">
                {L.stubBody.replace("{nodes}", stubNodes.map((n) => `«${n}»`).join(", "))}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
