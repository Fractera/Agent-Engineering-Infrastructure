// СЛОВАРЬ ПОЛОСЫ-УВЕДОМЛЕНИЯ — десять языков (закон 4г), англ. фолбэк. Дев-слой (`_shared-v2`).
//
// 🔒 НИ ОДНОЙ ВЫДУМАННОЙ ФРАЗЫ (требование владельца, шаг 297): каждая строка СКОПИРОВАНА ДОСЛОВНО из
// существующего словаря v1 (`warning-i18n`, `automation-state-pill-i18n`, `wave-i18n`, `use-cases-i18n`).
// `task` — метка категории «задание» (шаг 302): владелец записал задачу кнопкой «Отправить задание».
export type NotificationStrings = {
  warning: string; // метка категории «предупреждение»
  unbuilt: string; // метка категории «не построено»
  details: string; // раскрыть список
  launch: string; // кнопка «Запустить разработку»
  ready: string; // повод «кейсы подтверждены — можно запускать разработку» (дословно v1 `reviewedYes`)
  blocked: string; // гейт запуска: кейсы не подтверждены (дословно v1 `reviewedNo`)
  answered: string; // владелец ОТВЕТИЛ на предупреждение — ответ ушёл в сырую инструкцию объекта
  task: string; // метка категории «задание» — владелец записал задачу кнопкой «Отправить задание»
};

const I18N: Record<string, NotificationStrings> = {
  en: { warning: "Blocker", unbuilt: "In development", details: "Details", launch: "Launch development", ready: "You confirmed these cases — development can start.", blocked: "Not confirmed yet — development steps stay blocked until you read them.", answered: "Your answer was sent to the agent", task: "Task" },
  ru: { warning: "Препятствие", unbuilt: "В разработке", details: "Подробнее", launch: "Запустить разработку", ready: "Вы подтвердили эти кейсы — разработку можно начинать.", blocked: "Пока не подтверждено — шаги разработки заблокированы, пока вы их не прочитаете.", answered: "Ваш ответ отправлен агенту", task: "Задание" },
  es: { warning: "Obstáculo", unbuilt: "En desarrollo", details: "Detalles", launch: "Lanzar el desarrollo", ready: "Confirmaste estos casos — el desarrollo puede empezar.", blocked: "Aún sin confirmar — los pasos de desarrollo quedan bloqueados hasta que los leas.", answered: "Tu respuesta fue enviada al agente", task: "Tarea" },
  fr: { warning: "Obstacle", unbuilt: "En développement", details: "Détails", launch: "Lancer le développement", ready: "Vous avez confirmé ces cas — le développement peut commencer.", blocked: "Pas encore confirmé — les étapes de développement restent bloquées jusqu'à ce que vous les lisiez.", answered: "Votre réponse a été envoyée à l'agent", task: "Tâche" },
  it: { warning: "Ostacolo", unbuilt: "In sviluppo", details: "Dettagli", launch: "Avvia lo sviluppo", ready: "Hai confermato questi casi — lo sviluppo può iniziare.", blocked: "Non ancora confermato — i passi di sviluppo restano bloccati finché non li leggi.", answered: "La tua risposta è stata inviata all'agente", task: "Attività" },
  de: { warning: "Hindernis", unbuilt: "In Entwicklung", details: "Details", launch: "Entwicklung starten", ready: "Du hast diese Fälle bestätigt — die Entwicklung kann beginnen.", blocked: "Noch nicht bestätigt — Entwicklungsschritte bleiben blockiert, bis du sie liest.", answered: "Deine Antwort wurde an den Agenten gesendet", task: "Aufgabe" },
  pt: { warning: "Obstáculo", unbuilt: "Em desenvolvimento", details: "Detalhes", launch: "Lançar o desenvolvimento", ready: "Confirmou estes casos — o desenvolvimento pode começar.", blocked: "Ainda não confirmado — os passos de desenvolvimento ficam bloqueados até os ler.", answered: "A sua resposta foi enviada ao agente", task: "Tarefa" },
  pl: { warning: "Przeszkoda", unbuilt: "W trakcie tworzenia", details: "Szczegóły", launch: "Uruchom rozwój", ready: "Potwierdziłeś te przypadki — rozwój może się rozpocząć.", blocked: "Jeszcze niepotwierdzone — kroki rozwoju pozostają zablokowane, dopóki ich nie przeczytasz.", answered: "Twoja odpowiedź została wysłana do agenta", task: "Zadanie" },
  tr: { warning: "Engel", unbuilt: "Geliştirme aşamasında", details: "Ayrıntılar", launch: "Geliştirmeyi başlat", ready: "Bu senaryoları onayladınız — geliştirme başlayabilir.", blocked: "Henüz onaylanmadı — onları okuyana kadar geliştirme adımları engelli kalır.", answered: "Yanıtınız ajana gönderildi", task: "Görev" },
  nl: { warning: "Obstakel", unbuilt: "In ontwikkeling", details: "Details", launch: "Ontwikkeling starten", ready: "Je hebt deze cases bevestigd — de ontwikkeling kan beginnen.", blocked: "Nog niet bevestigd — ontwikkelstappen blijven geblokkeerd totdat je ze leest.", answered: "Je antwoord is naar de agent gestuurd", task: "Taak" },
};

export function notificationStrings(lang: string): NotificationStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}
