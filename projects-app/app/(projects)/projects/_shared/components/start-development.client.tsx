"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Loader2, ListChecks, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { DevConsole } from "./dev-console.client";

// THE LAUNCH DIALOG (step 233 → the wave in 240 → the light hand-off in 249 → the dev console in 255).
// ONE development path (owner 2026-07-19, 263.1): the sterile-room terminal. The step-250 in-product
// OpenAI developer was CUT OUT this day — it wrote into the live automation through tools, bypassing the
// room + gated apply entirely (its one live run duplicated an input node and mis-wired it). Any future
// built-in fallback must go through the same projection → room → gated-apply discipline as every agent.
// The legacy copyable hand-off stays available at GET /api/projects/handoff for manual use.
//
// THE GATES STAY (they were never about steps): the use-case review gate (step 231, confirm button right
// here), the advisory stub-node screen (263.1) and the no-cases refusal.
type Case = { cuid: string; title: string; summary: string; status: string };
type Mode =
  | "loading" | "review" | "confirm" | "console"
  | "no-cases" | "nothing-staged" | "stub-nodes";

type SD = {
  title: string;
  preparing: string;
  reviewHeading: string; reviewIntro: string; confirm: string; confirming: string;
  // runIntro…builtInAlt: DORMANT strings of the removed step-250 built-in developer (263.1) — kept in the
  // entries so the ten language blocks need no surgery; nothing renders them.
  runIntro: string; phaseContext: string; turnLabel: string;
  doneTitle: string; doneDecompositionTitle: string; doneDecompositionBody: string;
  copyReport: string; copied: string;
  runFailed: string; runAborted: string;
  alreadyRunning: string; noKey: string; modelNoTools: string;
  noCasesTitle: string; noCasesBody: string; noStagedTitle: string; noStagedBody: string;
  stubTitle: string; stubBody: string;
  /** owner 2026-07-19 (263.1): the stub gate is ADVISORY — the hint + the "launch anyway" button. */
  stubAdvisory: string; launchAnyway: string;
  failed: string; noDescription: string;
  confirmTitle: string; confirmBody: string; cancelEdit: string; startNow: string; builtInAlt: string;
};
const I18N: Record<string, SD> = {
  en: {
    title: "Start development",
    preparing: "Preparing…",
    reviewHeading: "Read your use cases and confirm before development starts",
    reviewIntro: "This is where you and the AI agree. Read what it understood; if anything is wrong, close this and fix the case with its pencil. Development starts only after you confirm.",
    confirm: "I read them — the AI understood me", confirming: "Confirming…",
    runIntro: "The built-in AI developer is working. Closing this window stops the run.",
    phaseContext: "Context handed to {model} — {n} staged task(s).",
    turnLabel: "Turn {n}",
    doneTitle: "Development finished",
    doneDecompositionTitle: "The task is bigger than one automation",
    doneDecompositionBody: "The AI made no changes and saved a decomposition plan instead. Open the warnings panel to read and copy it.",
    copyReport: "Copy report", copied: "Copied.",
    runFailed: "The run stopped with an error: {code}", runAborted: "The run was stopped.",
    alreadyRunning: "Development is already running for this automation — wait for it to finish.",
    noKey: "Save the OpenAI key in the settings first.",
    modelNoTools: "The model {model} does not support tools — pick another model in the settings.",
    noCasesTitle: "Describe the use cases first", noCasesBody: "This automation has no use cases yet. Open the Quiz on this page and describe your scenarios — development cannot start without them.",
    noStagedTitle: "Nothing staged for development", noStagedBody: "There are no pending requirements right now — describe a change first (a node's brief, a requirement, or a Sparkles comment).",
    stubTitle: "Some nodes have no description", stubBody: "These nodes still carry the blank template text: {nodes}. A coding agent cannot build a node nobody described — open each one and say what it should do, or delete it. Then launch again.",
    stubAdvisory: "This is advisory only: the agent can usually infer an undescribed node's purpose from your use cases and the automation's description.", launchAnyway: "Launch anyway",
    failed: "Could not start development.", noDescription: "No description yet.",
    confirmTitle: "Development is about to start", confirmBody: "The coding agent will work in this project's own room, live in the terminal below. You can cancel and keep editing — this window returns whenever you press the launch button.",
    cancelEdit: "Cancel and keep editing", startNow: "Start now", builtInAlt: "Use the built-in developer (OpenAI) instead",
  },
  ru: {
    title: "Запустить разработку",
    preparing: "Готовлю…",
    reviewHeading: "Прочитайте кейсы и подтвердите — до начала разработки",
    reviewIntro: "Здесь вы и ИИ договариваетесь. Прочитайте, что он понял; если что-то не так — закройте и поправьте кейс карандашом. Разработка начнётся только после подтверждения.",
    confirm: "Я прочитал — ИИ понял меня правильно", confirming: "Подтверждаю…",
    runIntro: "Встроенный ИИ-разработчик работает. Закрытие окна остановит запуск.",
    phaseContext: "Контекст передан модели {model} — заданий: {n}.",
    turnLabel: "Ход {n}",
    doneTitle: "Разработка завершена",
    doneDecompositionTitle: "Задача больше одной автоматизации",
    doneDecompositionBody: "ИИ не вносил изменений и вместо этого сохранил план декомпозиции. Откройте панель предупреждений, чтобы прочитать и скопировать его.",
    copyReport: "Скопировать отчёт", copied: "Скопировано.",
    runFailed: "Запуск остановился с ошибкой: {code}", runAborted: "Запуск остановлен.",
    alreadyRunning: "Разработка этой автоматизации уже идёт — дождитесь завершения.",
    noKey: "Сначала сохраните ключ OpenAI в настройках.",
    modelNoTools: "Модель {model} не поддерживает инструменты — выберите другую в настройках.",
    noCasesTitle: "Сначала опишите пользовательские кейсы", noCasesBody: "У этой автоматизации ещё нет кейсов. Откройте Quiz на этой странице и опишите сценарии — без них разработку не начать.",
    noStagedTitle: "В разработку ничего не передано", noStagedBody: "Сейчас нет ожидающих требований — сначала опишите изменение (требование узла, требование сущности или комментарий через ✦).",
    stubTitle: "У некоторых узлов нет описания", stubBody: "Эти узлы всё ещё несут пустой шаблонный текст: {nodes}. Агент-программист не может построить узел, который никто не описал — откройте каждый и скажите, что он должен делать, или удалите его. Затем запустите разработку снова.",
    stubAdvisory: "Это носит рекомендательный характер: агент обычно сам понимает назначение неописанного узла из ваших кейсов и описания автоматизации.", launchAnyway: "Всё равно запустить",
    failed: "Не удалось запустить разработку.", noDescription: "Пока без описания.",
    confirmTitle: "Разработка сейчас начнётся", confirmBody: "Агент-программист будет работать в собственной комнате проекта, вживую в терминале ниже. Можно отменить и продолжить правки — это окно вернётся при следующем нажатии кнопки запуска.",
    cancelEdit: "Отменить и продолжить правки", startNow: "Стартовать сейчас", builtInAlt: "Использовать встроенного разработчика (OpenAI)",
  },
  es: {
    title: "Iniciar desarrollo",
    preparing: "Preparando…",
    reviewHeading: "Lee tus casos de uso y confirma antes de empezar el desarrollo",
    reviewIntro: "Aquí es donde tú y la IA os ponéis de acuerdo. Lee lo que entendió; si algo está mal, cierra y corrige el caso con su lápiz. El desarrollo empieza solo después de que confirmes.",
    confirm: "Los leí — la IA me entendió", confirming: "Confirmando…",
    runIntro: "El desarrollador de IA integrado está trabajando. Cerrar esta ventana detiene la ejecución.",
    phaseContext: "Contexto entregado a {model} — {n} tareas pendientes.",
    turnLabel: "Turno {n}",
    doneTitle: "Desarrollo terminado",
    doneDecompositionTitle: "La tarea es más grande que una automatización",
    doneDecompositionBody: "La IA no hizo cambios y guardó en su lugar un plan de descomposición. Abre el panel de avisos para leerlo y copiarlo.",
    copyReport: "Copiar informe", copied: "Copiado.",
    runFailed: "La ejecución se detuvo con un error: {code}", runAborted: "Ejecución detenida.",
    alreadyRunning: "El desarrollo de esta automatización ya está en marcha — espera a que termine.",
    noKey: "Guarda primero la clave de OpenAI en los ajustes.",
    modelNoTools: "El modelo {model} no admite herramientas — elige otro en los ajustes.",
    noCasesTitle: "Describe primero los casos de uso", noCasesBody: "Esta automatización aún no tiene casos de uso. Abre el Quiz en esta página y describe tus escenarios — sin ellos no se puede empezar el desarrollo.",
    noStagedTitle: "Nada pendiente de desarrollo", noStagedBody: "Ahora mismo no hay requisitos pendientes — describe primero un cambio (el requisito de un nodo, de una entidad o un comentario con ✦).",
    stubTitle: "Algunos nodos no tienen descripción", stubBody: "Estos nodos aún llevan el texto de plantilla vacío: {nodes}. Un agente de código no puede construir un nodo que nadie describió — abra cada uno y diga qué debe hacer, o elimínelo. Luego vuelva a lanzar.",
    stubAdvisory: "Esto es solo una recomendación: el agente normalmente deduce el propósito de un nodo sin describir a partir de tus casos de uso y la descripción de la automatización.", launchAnyway: "Lanzar de todos modos",
    failed: "No se pudo iniciar el desarrollo.", noDescription: "Aún sin descripción.",
    confirmTitle: "El desarrollo está a punto de comenzar", confirmBody: "El agente trabajará en la sala propia del proyecto, en vivo en la terminal. Puedes cancelar y seguir editando — esta ventana vuelve con el botón de inicio.",
    cancelEdit: "Cancelar y seguir editando", startNow: "Empezar ahora", builtInAlt: "Usar el desarrollador integrado (OpenAI)",
  },
  fr: {
    title: "Démarrer le développement",
    preparing: "Préparation…",
    reviewHeading: "Lisez vos cas d'usage et confirmez avant le début du développement",
    reviewIntro: "C'est ici que vous et l'IA vous mettez d'accord. Lisez ce qu'elle a compris ; si quelque chose ne va pas, fermez et corrigez le cas avec son crayon. Le développement ne commence qu'après votre confirmation.",
    confirm: "Je les ai lus — l'IA m'a compris", confirming: "Confirmation…",
    runIntro: "Le développeur IA intégré travaille. Fermer cette fenêtre arrête l'exécution.",
    phaseContext: "Contexte transmis à {model} — {n} tâches en attente.",
    turnLabel: "Tour {n}",
    doneTitle: "Développement terminé",
    doneDecompositionTitle: "La tâche dépasse une seule automatisation",
    doneDecompositionBody: "L'IA n'a fait aucun changement et a enregistré à la place un plan de décomposition. Ouvrez le panneau des avertissements pour le lire et le copier.",
    copyReport: "Copier le rapport", copied: "Copié.",
    runFailed: "L'exécution s'est arrêtée avec une erreur : {code}", runAborted: "Exécution arrêtée.",
    alreadyRunning: "Le développement de cette automatisation est déjà en cours — attendez qu'il se termine.",
    noKey: "Enregistrez d'abord la clé OpenAI dans les réglages.",
    modelNoTools: "Le modèle {model} ne prend pas en charge les outils — choisissez-en un autre dans les réglages.",
    noCasesTitle: "Décrivez d'abord les cas d'usage", noCasesBody: "Cette automatisation n'a pas encore de cas d'usage. Ouvrez le Quiz sur cette page et décrivez vos scénarios — sans eux, le développement ne peut pas commencer.",
    noStagedTitle: "Rien en attente de développement", noStagedBody: "Aucune exigence en attente pour l'instant — décrivez d'abord un changement (l'exigence d'un nœud, d'une entité ou un commentaire via ✦).",
    stubTitle: "Certains nœuds n'ont pas de description", stubBody: "Ces nœuds portent encore le texte de modèle vide : {nodes}. Un agent de code ne peut pas construire un nœud que personne n'a décrit — ouvrez chacun et dites ce qu'il doit faire, ou supprimez-le. Puis relancez.",
    stubAdvisory: "Ceci n'est qu'une recommandation : l'agent déduit généralement le rôle d'un nœud non décrit à partir de vos cas d'usage et de la description de l'automatisation.", launchAnyway: "Lancer quand même",
    failed: "Impossible de démarrer le développement.", noDescription: "Pas encore de description.",
    confirmTitle: "Le développement va commencer", confirmBody: "L'agent travaillera dans la salle du projet, en direct dans le terminal. Vous pouvez annuler et continuer vos modifications — cette fenêtre revient au prochain lancement.",
    cancelEdit: "Annuler et continuer", startNow: "Démarrer maintenant", builtInAlt: "Utiliser le développeur intégré (OpenAI)",
  },
  it: {
    title: "Avvia lo sviluppo",
    preparing: "Preparo…",
    reviewHeading: "Leggi i tuoi casi d'uso e conferma prima che inizi lo sviluppo",
    reviewIntro: "Qui tu e l'IA vi mettete d'accordo. Leggi ciò che ha capito; se qualcosa non va, chiudi e correggi il caso con la sua matita. Lo sviluppo inizia solo dopo la tua conferma.",
    confirm: "Li ho letti — l'IA mi ha capito", confirming: "Conferma…",
    runIntro: "Lo sviluppatore IA integrato sta lavorando. Chiudere questa finestra interrompe l'esecuzione.",
    phaseContext: "Contesto consegnato a {model} — {n} compiti in attesa.",
    turnLabel: "Turno {n}",
    doneTitle: "Sviluppo completato",
    doneDecompositionTitle: "Il compito è più grande di una singola automazione",
    doneDecompositionBody: "L'IA non ha fatto modifiche e ha salvato invece un piano di scomposizione. Apri il pannello degli avvisi per leggerlo e copiarlo.",
    copyReport: "Copia il rapporto", copied: "Copiato.",
    runFailed: "L'esecuzione si è fermata con un errore: {code}", runAborted: "Esecuzione interrotta.",
    alreadyRunning: "Lo sviluppo di questa automazione è già in corso — attendi che finisca.",
    noKey: "Salva prima la chiave OpenAI nelle impostazioni.",
    modelNoTools: "Il modello {model} non supporta gli strumenti — scegline un altro nelle impostazioni.",
    noCasesTitle: "Descrivi prima i casi d'uso", noCasesBody: "Questa automazione non ha ancora casi d'uso. Apri il Quiz in questa pagina e descrivi i tuoi scenari — senza di essi non si può iniziare lo sviluppo.",
    noStagedTitle: "Niente in attesa di sviluppo", noStagedBody: "Al momento non ci sono richieste in sospeso — descrivi prima una modifica (la richiesta di un nodo, di un'entità o un commento con ✦).",
    stubTitle: "Alcuni nodi non hanno descrizione", stubBody: "Questi nodi portano ancora il testo di modello vuoto: {nodes}. Un agente di codice non può costruire un nodo che nessuno ha descritto — apra ciascuno e dica cosa deve fare, oppure lo elimini. Poi rilanci.",
    stubAdvisory: "È solo una raccomandazione: l'agente di solito deduce lo scopo di un nodo non descritto dai casi d'uso e dalla descrizione dell'automazione.", launchAnyway: "Avvia comunque",
    failed: "Impossibile avviare lo sviluppo.", noDescription: "Ancora nessuna descrizione.",
    confirmTitle: "Lo sviluppo sta per iniziare", confirmBody: "L'agente lavorerà nella stanza del progetto, in diretta nel terminale. Puoi annullare e continuare a modificare — questa finestra torna al prossimo avvio.",
    cancelEdit: "Annulla e continua", startNow: "Avvia ora", builtInAlt: "Usa lo sviluppatore integrato (OpenAI)",
  },
  de: {
    title: "Entwicklung starten",
    preparing: "Vorbereitung…",
    reviewHeading: "Lies deine Anwendungsfälle und bestätige, bevor die Entwicklung beginnt",
    reviewIntro: "Hier einigt ihr euch, du und die KI. Lies, was sie verstanden hat; wenn etwas nicht stimmt, schließe und korrigiere den Fall mit seinem Stift. Die Entwicklung startet erst nach deiner Bestätigung.",
    confirm: "Ich habe sie gelesen — die KI hat mich verstanden", confirming: "Bestätige…",
    runIntro: "Der eingebaute KI-Entwickler arbeitet. Das Schließen dieses Fensters stoppt den Lauf.",
    phaseContext: "Kontext an {model} übergeben — {n} anstehende Aufgaben.",
    turnLabel: "Zug {n}",
    doneTitle: "Entwicklung abgeschlossen",
    doneDecompositionTitle: "Die Aufgabe ist größer als eine Automatisierung",
    doneDecompositionBody: "Die KI hat keine Änderungen gemacht und stattdessen einen Zerlegungsplan gespeichert. Öffne das Warnungs-Panel, um ihn zu lesen und zu kopieren.",
    copyReport: "Bericht kopieren", copied: "Kopiert.",
    runFailed: "Der Lauf endete mit einem Fehler: {code}", runAborted: "Lauf gestoppt.",
    alreadyRunning: "Die Entwicklung dieser Automatisierung läuft bereits — warte, bis sie fertig ist.",
    noKey: "Speichere zuerst den OpenAI-Schlüssel in den Einstellungen.",
    modelNoTools: "Das Modell {model} unterstützt keine Tools — wähle in den Einstellungen ein anderes.",
    noCasesTitle: "Beschreibe zuerst die Anwendungsfälle", noCasesBody: "Diese Automatisierung hat noch keine Anwendungsfälle. Öffne das Quiz auf dieser Seite und beschreibe deine Szenarien — ohne sie kann die Entwicklung nicht beginnen.",
    noStagedTitle: "Nichts zur Entwicklung vorgemerkt", noStagedBody: "Es gibt gerade keine offenen Anforderungen — beschreibe zuerst eine Änderung (die Anforderung eines Knotens, einer Entität oder einen Kommentar über ✦).",
    stubTitle: "Einige Knoten haben keine Beschreibung", stubBody: "Diese Knoten tragen noch den leeren Vorlagentext: {nodes}. Ein Coding-Agent kann keinen Knoten bauen, den niemand beschrieben hat — öffne jeden und sage, was er tun soll, oder lösche ihn. Dann starte erneut.",
    stubAdvisory: "Dies ist nur eine Empfehlung: Der Agent leitet den Zweck eines unbeschriebenen Knotens meist aus Ihren Anwendungsfällen und der Beschreibung der Automatisierung ab.", launchAnyway: "Trotzdem starten",
    failed: "Die Entwicklung konnte nicht gestartet werden.", noDescription: "Noch keine Beschreibung.",
    confirmTitle: "Die Entwicklung beginnt gleich", confirmBody: "Der Agent arbeitet im eigenen Raum des Projekts, live im Terminal. Du kannst abbrechen und weiter bearbeiten — dieses Fenster kehrt beim nächsten Start zurück.",
    cancelEdit: "Abbrechen und weiter bearbeiten", startNow: "Jetzt starten", builtInAlt: "Den eingebauten Entwickler (OpenAI) verwenden",
  },
  pt: {
    title: "Iniciar desenvolvimento",
    preparing: "A preparar…",
    reviewHeading: "Leia os seus casos de uso e confirme antes de o desenvolvimento começar",
    reviewIntro: "É aqui que você e a IA chegam a acordo. Leia o que ela percebeu; se algo estiver errado, feche e corrija o caso com o lápis. O desenvolvimento só começa depois de confirmar.",
    confirm: "Li-os — a IA percebeu-me", confirming: "A confirmar…",
    runIntro: "O desenvolvedor de IA integrado está a trabalhar. Fechar esta janela interrompe a execução.",
    phaseContext: "Contexto entregue a {model} — {n} tarefas pendentes.",
    turnLabel: "Turno {n}",
    doneTitle: "Desenvolvimento concluído",
    doneDecompositionTitle: "A tarefa é maior do que uma automação",
    doneDecompositionBody: "A IA não fez alterações e guardou em vez disso um plano de decomposição. Abra o painel de avisos para o ler e copiar.",
    copyReport: "Copiar relatório", copied: "Copiado.",
    runFailed: "A execução parou com um erro: {code}", runAborted: "Execução interrompida.",
    alreadyRunning: "O desenvolvimento desta automação já está em curso — aguarde que termine.",
    noKey: "Guarde primeiro a chave OpenAI nas definições.",
    modelNoTools: "O modelo {model} não suporta ferramentas — escolha outro nas definições.",
    noCasesTitle: "Descreva primeiro os casos de uso", noCasesBody: "Esta automação ainda não tem casos de uso. Abra o Quiz nesta página e descreva os seus cenários — sem eles o desenvolvimento não pode começar.",
    noStagedTitle: "Nada pendente de desenvolvimento", noStagedBody: "Não há requisitos pendentes neste momento — descreva primeiro uma alteração (o requisito de um nó, de uma entidade ou um comentário via ✦).",
    stubTitle: "Alguns nós não têm descrição", stubBody: "Estes nós ainda trazem o texto de modelo vazio: {nodes}. Um agente de código não pode construir um nó que ninguém descreveu — abra cada um e diga o que deve fazer, ou elimine-o. Depois lance de novo.",
    stubAdvisory: "Isto é apenas uma recomendação: o agente normalmente deduz o propósito de um nó não descrito a partir dos casos de uso e da descrição da automação.", launchAnyway: "Lançar mesmo assim",
    failed: "Não foi possível iniciar o desenvolvimento.", noDescription: "Ainda sem descrição.",
    confirmTitle: "O desenvolvimento vai começar", confirmBody: "O agente trabalhará na sala própria do projeto, ao vivo no terminal. Pode cancelar e continuar a editar — esta janela volta no próximo arranque.",
    cancelEdit: "Cancelar e continuar", startNow: "Começar agora", builtInAlt: "Usar o desenvolvedor integrado (OpenAI)",
  },
  pl: {
    title: "Uruchom rozwój",
    preparing: "Przygotowuję…",
    reviewHeading: "Przeczytaj swoje przypadki użycia i potwierdź przed rozpoczęciem rozwoju",
    reviewIntro: "Tutaj ty i AI dochodzicie do porozumienia. Przeczytaj, co zrozumiała; jeśli coś jest nie tak, zamknij i popraw przypadek ołówkiem. Rozwój zaczyna się dopiero po twoim potwierdzeniu.",
    confirm: "Przeczytałem je — AI mnie zrozumiała", confirming: "Potwierdzam…",
    runIntro: "Wbudowany deweloper AI pracuje. Zamknięcie tego okna zatrzyma uruchomienie.",
    phaseContext: "Kontekst przekazany modelowi {model} — oczekujących zadań: {n}.",
    turnLabel: "Ruch {n}",
    doneTitle: "Rozwój zakończony",
    doneDecompositionTitle: "Zadanie jest większe niż jedna automatyzacja",
    doneDecompositionBody: "AI nie wprowadziła zmian i zamiast tego zapisała plan dekompozycji. Otwórz panel ostrzeżeń, aby go przeczytać i skopiować.",
    copyReport: "Skopiuj raport", copied: "Skopiowano.",
    runFailed: "Uruchomienie zatrzymało się z błędem: {code}", runAborted: "Uruchomienie zatrzymane.",
    alreadyRunning: "Rozwój tej automatyzacji już trwa — poczekaj, aż się zakończy.",
    noKey: "Najpierw zapisz klucz OpenAI w ustawieniach.",
    modelNoTools: "Model {model} nie obsługuje narzędzi — wybierz inny w ustawieniach.",
    noCasesTitle: "Najpierw opisz przypadki użycia", noCasesBody: "Ta automatyzacja nie ma jeszcze przypadków użycia. Otwórz Quiz na tej stronie i opisz swoje scenariusze — bez nich rozwój nie może się rozpocząć.",
    noStagedTitle: "Nic nie czeka na rozwój", noStagedBody: "Obecnie nie ma oczekujących wymagań — najpierw opisz zmianę (wymaganie węzła, encji lub komentarz przez ✦).",
    stubTitle: "Niektóre węzły nie mają opisu", stubBody: "Te węzły wciąż niosą pusty tekst szablonu: {nodes}. Agent kodujący nie zbuduje węzła, którego nikt nie opisał — otwórz każdy i powiedz, co ma robić, albo go usuń. Potem uruchom ponownie.",
    stubAdvisory: "To tylko zalecenie: agent zwykle sam wywnioskuje przeznaczenie nieopisanego węzła z przypadków użycia i opisu automatyzacji.", launchAnyway: "Uruchom mimo to",
    failed: "Nie udało się uruchomić rozwoju.", noDescription: "Jeszcze bez opisu.",
    confirmTitle: "Rozwój zaraz się rozpocznie", confirmBody: "Agent będzie pracować we własnym pokoju projektu, na żywo w terminalu. Możesz anulować i dalej edytować — to okno wróci przy następnym uruchomieniu.",
    cancelEdit: "Anuluj i edytuj dalej", startNow: "Rozpocznij teraz", builtInAlt: "Użyj wbudowanego dewelopera (OpenAI)",
  },
  tr: {
    title: "Geliştirmeyi başlat",
    preparing: "Hazırlanıyor…",
    reviewHeading: "Geliştirme başlamadan önce kullanım senaryolarınızı okuyun ve onaylayın",
    reviewIntro: "Burada siz ve yapay zekâ anlaşırsınız. Ne anladığını okuyun; bir şey yanlışsa kapatın ve senaryoyu kalemiyle düzeltin. Geliştirme yalnızca onayınızdan sonra başlar.",
    confirm: "Onları okudum — yapay zekâ beni anladı", confirming: "Onaylanıyor…",
    runIntro: "Yerleşik yapay zekâ geliştirici çalışıyor. Bu pencereyi kapatmak çalışmayı durdurur.",
    phaseContext: "Bağlam {model} modeline iletildi — bekleyen görev: {n}.",
    turnLabel: "Tur {n}",
    doneTitle: "Geliştirme tamamlandı",
    doneDecompositionTitle: "Görev tek bir otomasyondan büyük",
    doneDecompositionBody: "Yapay zekâ değişiklik yapmadı ve bunun yerine bir ayrıştırma planı kaydetti. Okumak ve kopyalamak için uyarılar panelini açın.",
    copyReport: "Raporu kopyala", copied: "Kopyalandı.",
    runFailed: "Çalışma bir hatayla durdu: {code}", runAborted: "Çalışma durduruldu.",
    alreadyRunning: "Bu otomasyonun geliştirmesi zaten sürüyor — bitmesini bekleyin.",
    noKey: "Önce ayarlarda OpenAI anahtarını kaydedin.",
    modelNoTools: "{model} modeli araçları desteklemiyor — ayarlardan başka bir model seçin.",
    noCasesTitle: "Önce kullanım senaryolarını tanımlayın", noCasesBody: "Bu otomasyonun henüz kullanım senaryosu yok. Bu sayfadaki Quiz'i açın ve senaryolarınızı tanımlayın — onlar olmadan geliştirme başlayamaz.",
    noStagedTitle: "Geliştirme bekleyen bir şey yok", noStagedBody: "Şu anda bekleyen gereksinim yok — önce bir değişiklik tanımlayın (bir düğümün, bir varlığın gereksinimi ya da ✦ ile bir yorum).",
    stubTitle: "Bazı düğümlerin açıklaması yok", stubBody: "Bu düğümler hâlâ boş şablon metnini taşıyor: {nodes}. Kodlama ajanı kimsenin tanımlamadığı bir düğümü inşa edemez — her birini açıp ne yapması gerektiğini söyleyin ya da silin. Sonra yeniden başlatın.",
    stubAdvisory: "Bu yalnızca bir öneridir: ajan, tanımlanmamış bir düğümün amacını genellikle kullanım senaryolarınızdan ve otomasyonun açıklamasından çıkarır.", launchAnyway: "Yine de başlat",
    failed: "Geliştirme başlatılamadı.", noDescription: "Henüz açıklama yok.",
    confirmTitle: "Geliştirme başlamak üzere", confirmBody: "Ajan, projenin kendi odasında, aşağıdaki terminalde canlı çalışacak. İptal edip düzenlemeye devam edebilirsiniz — bu pencere bir sonraki başlatmada geri döner.",
    cancelEdit: "İptal et ve düzenlemeye devam et", startNow: "Şimdi başlat", builtInAlt: "Yerleşik geliştiriciyi (OpenAI) kullan",
  },
  nl: {
    title: "Ontwikkeling starten",
    preparing: "Voorbereiden…",
    reviewHeading: "Lees je use cases en bevestig voordat de ontwikkeling begint",
    reviewIntro: "Hier komen jij en de AI tot overeenstemming. Lees wat ze begrepen heeft; klopt er iets niet, sluit dan en corrigeer de case met het potlood. De ontwikkeling begint pas na jouw bevestiging.",
    confirm: "Ik heb ze gelezen — de AI heeft me begrepen", confirming: "Bevestigen…",
    runIntro: "De ingebouwde AI-ontwikkelaar is aan het werk. Dit venster sluiten stopt de run.",
    phaseContext: "Context overgedragen aan {model} — {n} openstaande taken.",
    turnLabel: "Beurt {n}",
    doneTitle: "Ontwikkeling voltooid",
    doneDecompositionTitle: "De taak is groter dan één automatisering",
    doneDecompositionBody: "De AI heeft geen wijzigingen gemaakt en in plaats daarvan een decompositieplan opgeslagen. Open het waarschuwingenpaneel om het te lezen en te kopiëren.",
    copyReport: "Rapport kopiëren", copied: "Gekopieerd.",
    runFailed: "De run stopte met een fout: {code}", runAborted: "Run gestopt.",
    alreadyRunning: "De ontwikkeling van deze automatisering loopt al — wacht tot die klaar is.",
    noKey: "Sla eerst de OpenAI-sleutel op in de instellingen.",
    modelNoTools: "Het model {model} ondersteunt geen tools — kies een ander in de instellingen.",
    noCasesTitle: "Beschrijf eerst de use cases", noCasesBody: "Deze automatisering heeft nog geen use cases. Open de Quiz op deze pagina en beschrijf je scenario's — zonder deze kan de ontwikkeling niet beginnen.",
    noStagedTitle: "Niets wacht op ontwikkeling", noStagedBody: "Er zijn momenteel geen openstaande eisen — beschrijf eerst een wijziging (de eis van een node, een entiteit of een opmerking via ✦).",
    stubTitle: "Sommige nodes hebben geen beschrijving", stubBody: "Deze nodes dragen nog de lege sjabloontekst: {nodes}. Een coding agent kan geen node bouwen die niemand beschreven heeft — open elke node en zeg wat die moet doen, of verwijder hem. Start daarna opnieuw.",
    stubAdvisory: "Dit is slechts een aanbeveling: de agent leidt het doel van een onbeschreven node meestal af uit uw use cases en de beschrijving van de automatisering.", launchAnyway: "Toch starten",
    failed: "Kon de ontwikkeling niet starten.", noDescription: "Nog geen beschrijving.",
    confirmTitle: "De ontwikkeling gaat zo beginnen", confirmBody: "De agent werkt in de eigen kamer van het project, live in de terminal. Je kunt annuleren en verder bewerken — dit venster keert terug bij de volgende start.",
    cancelEdit: "Annuleren en verder bewerken", startNow: "Nu starten", builtInAlt: "De ingebouwde ontwikkelaar (OpenAI) gebruiken",
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
  /** Kept for the banner's wiring; the develop flow closes per-object, so it is never fired. */
  onLaunched?: () => void;
}) {
  void onLaunched;
  const lang = useUiLang();
  const L = I18N[lang] ?? I18N.en;
  const [mode, setMode] = useState<Mode>("loading");
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  // Step 247 (П5): the node names the launch gate refused over — shown so the owner knows WHICH to describe.
  const [stubNodes, setStubNodes] = useState<string[]>([]);
  // The dev console (step 255): the room the terminal works in + the first task the conductor hands over.
  const [roomPath, setRoomPath] = useState("");
  const [roomTask, setRoomTask] = useState("");

  // THE ENTRY (step 255): the gates run via GET handoff (the ONE launchGate set); passing them shows the
  // CONFIRM screen (cancel-and-keep-editing / start-now — the owner's repeatable cycle) and stores the
  // room hand-off for the console. `force` = the advisory stub screen's "launch anyway" (263.1).
  const load = useCallback(async (force = false) => {
    setMode("loading");
    setBusy(true);
    try {
      const r = await fetch(
        `/api/projects/handoff?automation=${encodeURIComponent(automation)}${force ? "&force=1" : ""}`,
        { cache: "no-store" },
      );
      const d = (await r.json().catch(() => ({}))) as {
        ok?: boolean; reason?: string; nodes?: string[]; room?: string; roomPath?: string;
      };
      if (!r.ok) {
        if (d.reason === "stub-nodes") {
          setStubNodes(d.nodes ?? []);
          setMode("stub-nodes");
        } else if (d.reason === "not-reviewed") {
          const cr = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
          const cd = (await cr.json().catch(() => ({}))) as { cases?: Case[] };
          setCases(cd.cases ?? []);
          setMode("review");
        } else if (d.reason === "no-cases" || d.reason === "nothing-staged") {
          setMode(d.reason);
        } else {
          toast.error(L.failed);
          onOpenChange(false);
        }
        return;
      }
      setRoomPath(d.roomPath ?? "");
      setRoomTask(d.room ?? "");
      setMode("confirm");
    } catch {
      toast.error(L.failed);
      onOpenChange(false);
    } finally { setBusy(false); }
  }, [automation, L, onOpenChange]);

  // Confirm the cases, then immediately continue to the run — one uninterrupted flow.
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

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      {/* The launch dialog closes ONLY via its explicit controls (owner 2026-07-19): Escape belongs to
          the TERMINAL (Claude Code uses it to interrupt), and a stray outside-click/Esc must never kill
          a live agent session. Radix's Esc/outside-click closing is disabled for every mode — the X
          button, "cancel and keep editing" and Exit remain the only doors. */}
      <DialogContent
        className={`flex max-h-[92vh] flex-col overflow-hidden ${mode === "console" ? "sm:max-w-5xl" : "sm:max-w-2xl"}`}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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

        {/* THE CONFIRM SCREEN (step 255, the owner's cycle): cancel-and-keep-editing always returns here. */}
        {mode === "confirm" && (
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">{L.confirmTitle}</p>
            <p className="text-sm text-muted-foreground">{L.confirmBody}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{L.cancelEdit}</Button>
              <Button onClick={() => setMode("console")} data-start-console="1">
                <Rocket className="size-4" /> {L.startNow}
              </Button>
            </div>
            {/* The step-250 built-in OpenAI developer's link stood here — removed 2026-07-19 (263.1): it
                bypassed the room + gated apply and wrote straight into the live automation. */}
          </div>
        )}

        {/* THE DEV CONSOLE (step 255) — the live external-agent session. */}
        {mode === "console" && (
          <DevConsole
            automation={automation}
            roomPath={roomPath}
            roomTask={roomTask}
            lang={lang}
            onExited={() => onOpenChange(false)}
          />
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

        {mode === "nothing-staged" && (
          <div className="space-y-1 py-4 text-sm">
            <p className="font-medium">{L.noStagedTitle}</p>
            <p className="text-muted-foreground">{L.noStagedBody}</p>
          </div>
        )}

        {mode === "stub-nodes" && (
          <div className="space-y-2 py-4 text-sm">
            <p className="font-medium">{L.stubTitle}</p>
            <p className="text-muted-foreground">
              {L.stubBody.replace("{nodes}", stubNodes.map((n) => `«${n}»`).join(", "))}
            </p>
            {/* ADVISORY, not a wall (owner 2026-07-19): the hint says so, and "launch anyway" re-runs the
                gates with force — the agent infers an undescribed node's purpose from the use cases. */}
            <p className="text-xs text-muted-foreground">{L.stubAdvisory}</p>
            <Button size="sm" variant="outline" onClick={() => load(true)} disabled={busy}>
              {L.launchAnyway}
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
