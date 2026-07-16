// WARNING / PROBLEMS I18N (step 246) — the strings of the agent→owner escalation surfaces: the node
// drawer's blocker block and the automation-level problems modal. Ten languages (rule 4г), deterministic,
// in code.

export type WarningStrings = {
  blockTitle: string;        // "⚠ Blocker" heading in the drawer / modal item
  scoutButton: string;       // "Use the Hermes agent as a scout"
  copyInstruction: string;   // copy the ready Hermes instruction
  copied: string;
  answerLabel: string;       // the answer field label
  answerPlaceholder: string; // hint: paste the scout's report / your decision
  sendAnswer: string;
  answerSent: string;        // toast — the object is unblocked, re-enters the wave
  answerFailed: string;
  expectedLabel: string;     // "What the agent expects back"
  problemsTitle: string;     // modal title
  problemsDescription: string;
  problemsBadge: string;     // tooltip/aria of the ⚠ N badge
  problemsEmpty: string;
  prev: string;
  next: string;
  ofCounter: string;         // "{i} of {n}"
};

export const WARNING_I18N: Record<string, WarningStrings> = {
  en: {
    blockTitle: "Blocker", scoutButton: "Use the Hermes agent as a scout",
    copyInstruction: "Copy instruction for Hermes", copied: "Copied",
    answerLabel: "Scout's answer / your decision",
    answerPlaceholder: "Paste the Hermes report or write your decision…",
    sendAnswer: "Send answer", answerSent: "Answer recorded — the object re-enters the development wave",
    answerFailed: "Could not record the answer",
    expectedLabel: "What the agent expects back",
    problemsTitle: "Development problems", problemsDescription: "The coding agent reported blockers it cannot pass alone. Answer each one — the answer goes back into development.",
    problemsBadge: "Development problems", problemsEmpty: "No open problems.",
    prev: "Previous", next: "Next", ofCounter: "{i} of {n}",
  },
  ru: {
    blockTitle: "Препятствие", scoutButton: "Использовать Гермес-агента как разведчика",
    copyInstruction: "Скопировать инструкцию для Гермеса", copied: "Скопировано",
    answerLabel: "Ответ разведчика / ваше решение",
    answerPlaceholder: "Вставьте отчёт Гермеса или напишите своё решение…",
    sendAnswer: "Отправить ответ", answerSent: "Ответ записан — объект вернётся в волну разработки",
    answerFailed: "Не удалось записать ответ",
    expectedLabel: "Что агент ждёт в ответ",
    problemsTitle: "Проблемы разработки", problemsDescription: "Агент-кодер сообщил о препятствиях, которые не может пройти сам. Ответьте на каждое — ответ уйдёт обратно в разработку.",
    problemsBadge: "Проблемы разработки", problemsEmpty: "Открытых проблем нет.",
    prev: "Назад", next: "Далее", ofCounter: "{i} из {n}",
  },
  es: {
    blockTitle: "Obstáculo", scoutButton: "Usar el agente Hermes como explorador",
    copyInstruction: "Copiar instrucción para Hermes", copied: "Copiado",
    answerLabel: "Respuesta del explorador / su decisión",
    answerPlaceholder: "Pegue el informe de Hermes o escriba su decisión…",
    sendAnswer: "Enviar respuesta", answerSent: "Respuesta registrada: el objeto vuelve a la ola de desarrollo",
    answerFailed: "No se pudo registrar la respuesta",
    expectedLabel: "Qué espera recibir el agente",
    problemsTitle: "Problemas de desarrollo", problemsDescription: "El agente programador informó de obstáculos que no puede superar solo. Responda a cada uno: la respuesta vuelve al desarrollo.",
    problemsBadge: "Problemas de desarrollo", problemsEmpty: "No hay problemas abiertos.",
    prev: "Anterior", next: "Siguiente", ofCounter: "{i} de {n}",
  },
  fr: {
    blockTitle: "Obstacle", scoutButton: "Utiliser l'agent Hermès comme éclaireur",
    copyInstruction: "Copier l'instruction pour Hermès", copied: "Copié",
    answerLabel: "Réponse de l'éclaireur / votre décision",
    answerPlaceholder: "Collez le rapport d'Hermès ou écrivez votre décision…",
    sendAnswer: "Envoyer la réponse", answerSent: "Réponse enregistrée — l'objet revient dans la vague de développement",
    answerFailed: "Impossible d'enregistrer la réponse",
    expectedLabel: "Ce que l'agent attend en retour",
    problemsTitle: "Problèmes de développement", problemsDescription: "L'agent codeur a signalé des obstacles qu'il ne peut pas franchir seul. Répondez à chacun — la réponse repart dans le développement.",
    problemsBadge: "Problèmes de développement", problemsEmpty: "Aucun problème ouvert.",
    prev: "Précédent", next: "Suivant", ofCounter: "{i} sur {n}",
  },
  it: {
    blockTitle: "Ostacolo", scoutButton: "Usare l'agente Hermes come esploratore",
    copyInstruction: "Copia istruzione per Hermes", copied: "Copiato",
    answerLabel: "Risposta dell'esploratore / la sua decisione",
    answerPlaceholder: "Incolli il rapporto di Hermes o scriva la sua decisione…",
    sendAnswer: "Invia risposta", answerSent: "Risposta registrata — l'oggetto torna nell'ondata di sviluppo",
    answerFailed: "Impossibile registrare la risposta",
    expectedLabel: "Cosa l'agente si aspetta in cambio",
    problemsTitle: "Problemi di sviluppo", problemsDescription: "L'agente programmatore ha segnalato ostacoli che non può superare da solo. Risponda a ciascuno: la risposta torna nello sviluppo.",
    problemsBadge: "Problemi di sviluppo", problemsEmpty: "Nessun problema aperto.",
    prev: "Precedente", next: "Successivo", ofCounter: "{i} di {n}",
  },
  de: {
    blockTitle: "Hindernis", scoutButton: "Hermes-Agent als Späher einsetzen",
    copyInstruction: "Anweisung für Hermes kopieren", copied: "Kopiert",
    answerLabel: "Antwort des Spähers / Ihre Entscheidung",
    answerPlaceholder: "Fügen Sie den Hermes-Bericht ein oder schreiben Sie Ihre Entscheidung…",
    sendAnswer: "Antwort senden", answerSent: "Antwort erfasst — das Objekt kehrt in die Entwicklungswelle zurück",
    answerFailed: "Antwort konnte nicht erfasst werden",
    expectedLabel: "Was der Agent zurückerwartet",
    problemsTitle: "Entwicklungsprobleme", problemsDescription: "Der Coding-Agent meldete Hindernisse, die er allein nicht überwinden kann. Beantworten Sie jedes — die Antwort fließt zurück in die Entwicklung.",
    problemsBadge: "Entwicklungsprobleme", problemsEmpty: "Keine offenen Probleme.",
    prev: "Zurück", next: "Weiter", ofCounter: "{i} von {n}",
  },
  pt: {
    blockTitle: "Obstáculo", scoutButton: "Usar o agente Hermes como batedor",
    copyInstruction: "Copiar instrução para o Hermes", copied: "Copiado",
    answerLabel: "Resposta do batedor / a sua decisão",
    answerPlaceholder: "Cole o relatório do Hermes ou escreva a sua decisão…",
    sendAnswer: "Enviar resposta", answerSent: "Resposta registada — o objeto volta à onda de desenvolvimento",
    answerFailed: "Não foi possível registar a resposta",
    expectedLabel: "O que o agente espera receber",
    problemsTitle: "Problemas de desenvolvimento", problemsDescription: "O agente programador relatou obstáculos que não consegue superar sozinho. Responda a cada um — a resposta volta ao desenvolvimento.",
    problemsBadge: "Problemas de desenvolvimento", problemsEmpty: "Sem problemas abertos.",
    prev: "Anterior", next: "Seguinte", ofCounter: "{i} de {n}",
  },
  pl: {
    blockTitle: "Przeszkoda", scoutButton: "Użyj agenta Hermes jako zwiadowcy",
    copyInstruction: "Kopiuj instrukcję dla Hermesa", copied: "Skopiowano",
    answerLabel: "Odpowiedź zwiadowcy / Twoja decyzja",
    answerPlaceholder: "Wklej raport Hermesa lub napisz swoją decyzję…",
    sendAnswer: "Wyślij odpowiedź", answerSent: "Odpowiedź zapisana — obiekt wraca do fali rozwoju",
    answerFailed: "Nie udało się zapisać odpowiedzi",
    expectedLabel: "Czego agent oczekuje w zamian",
    problemsTitle: "Problemy rozwoju", problemsDescription: "Agent-programista zgłosił przeszkody, których nie może pokonać sam. Odpowiedz na każdą — odpowiedź wraca do rozwoju.",
    problemsBadge: "Problemy rozwoju", problemsEmpty: "Brak otwartych problemów.",
    prev: "Wstecz", next: "Dalej", ofCounter: "{i} z {n}",
  },
  tr: {
    blockTitle: "Engel", scoutButton: "Hermes ajanını keşifçi olarak kullan",
    copyInstruction: "Hermes için talimatı kopyala", copied: "Kopyalandı",
    answerLabel: "Keşifçinin yanıtı / kararınız",
    answerPlaceholder: "Hermes raporunu yapıştırın veya kararınızı yazın…",
    sendAnswer: "Yanıtı gönder", answerSent: "Yanıt kaydedildi — nesne geliştirme dalgasına geri dönüyor",
    answerFailed: "Yanıt kaydedilemedi",
    expectedLabel: "Ajanın karşılığında beklediği",
    problemsTitle: "Geliştirme sorunları", problemsDescription: "Kodlayıcı ajan tek başına aşamayacağı engeller bildirdi. Her birine yanıt verin — yanıt geliştirmeye geri döner.",
    problemsBadge: "Geliştirme sorunları", problemsEmpty: "Açık sorun yok.",
    prev: "Geri", next: "İleri", ofCounter: "{i} / {n}",
  },
  nl: {
    blockTitle: "Obstakel", scoutButton: "Hermes-agent als verkenner inzetten",
    copyInstruction: "Instructie voor Hermes kopiëren", copied: "Gekopieerd",
    answerLabel: "Antwoord van de verkenner / uw beslissing",
    answerPlaceholder: "Plak het Hermes-rapport of schrijf uw beslissing…",
    sendAnswer: "Antwoord versturen", answerSent: "Antwoord vastgelegd — het object keert terug in de ontwikkelgolf",
    answerFailed: "Antwoord kon niet worden vastgelegd",
    expectedLabel: "Wat de agent terug verwacht",
    problemsTitle: "Ontwikkelproblemen", problemsDescription: "De codeeragent meldde obstakels die hij niet alleen kan passeren. Beantwoord elk — het antwoord gaat terug de ontwikkeling in.",
    problemsBadge: "Ontwikkelproblemen", problemsEmpty: "Geen open problemen.",
    prev: "Vorige", next: "Volgende", ofCounter: "{i} van {n}",
  },
};

export function warningStrings(lang: string): WarningStrings {
  return WARNING_I18N[lang] ?? WARNING_I18N.en;
}
