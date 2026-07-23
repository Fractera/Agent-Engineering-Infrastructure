// СЛОВАРЬ ПОЛОСЫ-УВЕДОМЛЕНИЯ — десять языков (закон 4г), англ. фолбэк. Живёт в папке сущности (закон 0).
//
// ПЕРЕНОС ПЕРЕВОДОВ ИЗ v1 (правило шага 297, память feedback-reuse-v1-translation-library): готовые фразы
// НЕ переводим заново, а копируем из библиотеки v1 дословно.
//   `warning` — из `_shared/warning-i18n.ts` (`WARNING_I18N.blockTitle`), дословно;
//   `unbuilt` — ведущая часть `_shared/automation-state-pill-i18n.ts` (`inDev*`, «В разработке — …»), дословно.
// Заново написаны только три фразы, которых в v1 нет: `title` (с числом), `newCase`, `details`.
// Тексты предупреждений и кейсов (авторская проза) НЕ переводятся — показываются как есть.
export type NotificationStrings = {
  title: string; // "{n}" — сколько объектов требуют внимания
  details: string; // раскрыть/подробнее
  warning: string; // метка категории «предупреждение» (v1 blockTitle)
  unbuilt: string; // метка категории «не построено» (v1 state-pill)
  newCase: string; // метка категории «новый кейс»
};

const I18N: Record<string, NotificationStrings> = {
  en: { title: "{n} objects need attention", details: "Details", warning: "Blocker", unbuilt: "In development", newCase: "New use case" },
  ru: { title: "объектов требуют внимания: {n}", details: "Подробнее", warning: "Препятствие", unbuilt: "В разработке", newCase: "Новый кейс" },
  es: { title: "{n} objetos requieren atención", details: "Detalles", warning: "Obstáculo", unbuilt: "En desarrollo", newCase: "Nuevo caso" },
  fr: { title: "{n} objets nécessitent votre attention", details: "Détails", warning: "Obstacle", unbuilt: "En développement", newCase: "Nouveau cas" },
  it: { title: "{n} oggetti richiedono attenzione", details: "Dettagli", warning: "Ostacolo", unbuilt: "In sviluppo", newCase: "Nuovo caso" },
  de: { title: "{n} Objekte erfordern Aufmerksamkeit", details: "Details", warning: "Hindernis", unbuilt: "In Entwicklung", newCase: "Neuer Fall" },
  pt: { title: "{n} objetos requerem atenção", details: "Detalhes", warning: "Obstáculo", unbuilt: "Em desenvolvimento", newCase: "Novo caso" },
  pl: { title: "obiektów wymaga uwagi: {n}", details: "Szczegóły", warning: "Przeszkoda", unbuilt: "W trakcie tworzenia", newCase: "Nowy przypadek" },
  tr: { title: "{n} nesne dikkat gerektiriyor", details: "Ayrıntılar", warning: "Engel", unbuilt: "Geliştirme aşamasında", newCase: "Yeni senaryo" },
  nl: { title: "{n} objecten vragen aandacht", details: "Details", warning: "Obstakel", unbuilt: "In ontwikkeling", newCase: "Nieuwe use case" },
};

export function notificationStrings(lang: string): NotificationStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}

/** Подставить число в строку с «{n}». */
export function fill(text: string, n: number): string {
  return text.replace("{n}", String(n));
}
