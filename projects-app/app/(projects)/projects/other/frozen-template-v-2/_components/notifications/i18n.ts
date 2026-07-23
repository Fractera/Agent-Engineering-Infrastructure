// СЛОВАРЬ ПОЛОСЫ-УВЕДОМЛЕНИЯ — десять языков (закон 4г), англ. фолбэк. Живёт в папке сущности (закон 0).
//
// 🔒 НИ ОДНОЙ ВЫДУМАННОЙ ФРАЗЫ (требование владельца, шаг 297): каждая строка СКОПИРОВАНА ДОСЛОВНО из уже
// существующего словаря v1 — переиспользуем мультиязычность, а не сочиняем новые переводы.
//   warning — `_shared/warning-i18n.ts` (`WARNING_I18N.blockTitle`);
//   unbuilt — `_shared/automation-state-pill-i18n.ts` (ведущая часть `inDev*`, «В разработке — …»);
//   details — `_shared/automation-menu-i18n.ts` (`howItWorksDetails`);
//   launch  — `_shared/wave-i18n.ts` (`bannerLaunch`) — кнопка запуска разработки, как в оригинале v1.
// Заголовка-предложения и слова «новый кейс» здесь НЕТ намеренно: их роль берут счётчики и цветные иконки,
// поэтому и переводить нечего. Тексты предупреждений и кейсов (проза автора) не переводятся.
// Тело модалки-заглушки берётся из `chrome/i18n.ts` (`placeholderNote`) — тоже готовый перевод.
export type NotificationStrings = {
  warning: string; // метка категории «предупреждение»
  unbuilt: string; // метка категории «не построено»
  details: string; // раскрыть список
  launch: string; // кнопка «Запустить разработку»
};

const I18N: Record<string, NotificationStrings> = {
  en: { warning: "Blocker", unbuilt: "In development", details: "Details", launch: "Launch development" },
  ru: { warning: "Препятствие", unbuilt: "В разработке", details: "Подробнее", launch: "Запустить разработку" },
  es: { warning: "Obstáculo", unbuilt: "En desarrollo", details: "Detalles", launch: "Lanzar el desarrollo" },
  fr: { warning: "Obstacle", unbuilt: "En développement", details: "Détails", launch: "Lancer le développement" },
  it: { warning: "Ostacolo", unbuilt: "In sviluppo", details: "Dettagli", launch: "Avvia lo sviluppo" },
  de: { warning: "Hindernis", unbuilt: "In Entwicklung", details: "Details", launch: "Entwicklung starten" },
  pt: { warning: "Obstáculo", unbuilt: "Em desenvolvimento", details: "Detalhes", launch: "Lançar o desenvolvimento" },
  pl: { warning: "Przeszkoda", unbuilt: "W trakcie tworzenia", details: "Szczegóły", launch: "Uruchom rozwój" },
  tr: { warning: "Engel", unbuilt: "Geliştirme aşamasında", details: "Ayrıntılar", launch: "Geliştirmeyi başlat" },
  nl: { warning: "Obstakel", unbuilt: "In ontwikkeling", details: "Details", launch: "Ontwikkeling starten" },
};

export function notificationStrings(lang: string): NotificationStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}
