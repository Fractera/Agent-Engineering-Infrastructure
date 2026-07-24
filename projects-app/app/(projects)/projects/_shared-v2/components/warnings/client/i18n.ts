// СЛОВАРЬ Центра проблем — десять языков (закон 4г), англ. фолбэк. Дев-слой. Строки СКОПИРОВАНЫ ДОСЛОВНО из
// v1 `_shared/warning-i18n.ts` (`problemsTitle`/`problemsDescription`/`problemsBadge`/`problemsEmpty`/
// `blockTitle`/`prev`/`next`/`ofCounter`) — переиспользуем мультиязычность, не сочиняем.
export type WarningStrings = {
  title: string; description: string; badge: string; empty: string; blockTitle: string;
  prev: string; next: string; counter: string; // counter has {i}/{n}
};

const I18N: Record<string, WarningStrings> = {
  en: { title: "Development problems", description: "The coding agent reported blockers it cannot pass alone. Answer each one — the answer goes back into development.", badge: "Development problems", empty: "No open problems.", blockTitle: "Blocker", prev: "Previous", next: "Next", counter: "{i} of {n}" },
  ru: { title: "Проблемы разработки", description: "Агент-кодер сообщил о препятствиях, которые не может пройти сам. Ответьте на каждое — ответ уйдёт обратно в разработку.", badge: "Проблемы разработки", empty: "Открытых проблем нет.", blockTitle: "Препятствие", prev: "Назад", next: "Далее", counter: "{i} из {n}" },
  es: { title: "Problemas de desarrollo", description: "El agente programador informó de obstáculos que no puede superar solo. Responda a cada uno: la respuesta vuelve al desarrollo.", badge: "Problemas de desarrollo", empty: "No hay problemas abiertos.", blockTitle: "Obstáculo", prev: "Anterior", next: "Siguiente", counter: "{i} de {n}" },
  fr: { title: "Problèmes de développement", description: "L'agent codeur a signalé des obstacles qu'il ne peut pas franchir seul. Répondez à chacun — la réponse repart dans le développement.", badge: "Problèmes de développement", empty: "Aucun problème ouvert.", blockTitle: "Obstacle", prev: "Précédent", next: "Suivant", counter: "{i} sur {n}" },
  it: { title: "Problemi di sviluppo", description: "L'agente programmatore ha segnalato ostacoli che non può superare da solo. Risponda a ciascuno: la risposta torna nello sviluppo.", badge: "Problemi di sviluppo", empty: "Nessun problema aperto.", blockTitle: "Ostacolo", prev: "Precedente", next: "Successivo", counter: "{i} di {n}" },
  de: { title: "Entwicklungsprobleme", description: "Der Coding-Agent meldete Hindernisse, die er allein nicht überwinden kann. Beantworten Sie jedes — die Antwort fließt zurück in die Entwicklung.", badge: "Entwicklungsprobleme", empty: "Keine offenen Probleme.", blockTitle: "Hindernis", prev: "Zurück", next: "Weiter", counter: "{i} von {n}" },
  pt: { title: "Problemas de desenvolvimento", description: "O agente programador relatou obstáculos que não consegue superar sozinho. Responda a cada um — a resposta volta ao desenvolvimento.", badge: "Problemas de desenvolvimento", empty: "Sem problemas abertos.", blockTitle: "Obstáculo", prev: "Anterior", next: "Seguinte", counter: "{i} de {n}" },
  pl: { title: "Problemy rozwoju", description: "Agent-programista zgłosił przeszkody, których nie może pokonać sam. Odpowiedz na każdą — odpowiedź wraca do rozwoju.", badge: "Problemy rozwoju", empty: "Brak otwartych problemów.", blockTitle: "Przeszkoda", prev: "Wstecz", next: "Dalej", counter: "{i} z {n}" },
  tr: { title: "Geliştirme sorunları", description: "Kodlayıcı ajan tek başına aşamayacağı engeller bildirdi. Her birine yanıt verin — yanıt geliştirmeye geri döner.", badge: "Geliştirme sorunları", empty: "Açık sorun yok.", blockTitle: "Engel", prev: "Geri", next: "İleri", counter: "{i} / {n}" },
  nl: { title: "Ontwikkelproblemen", description: "De codeeragent meldde obstakels die hij niet alleen kan passeren. Beantwoord elk — het antwoord gaat terug de ontwikkeling in.", badge: "Ontwikkelproblemen", empty: "Geen open problemen.", blockTitle: "Obstakel", prev: "Vorige", next: "Volgende", counter: "{i} van {n}" },
};

export function warningStrings(lang: string): WarningStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}
