// СЛОВАРЬ ОБЩЕЙ ОБВЯЗКИ РАЗДЕЛОВ — десять языков (закон 4г): счётчик содержимого раздела и навигация
// публичной страницы. Общий, потому что и то и другое — не про конкретную вкладку, а про страницу в целом.
export type SectionsStrings = {
  items: string; // "{n}" — сколько сущностей внутри раздела
  navAria: string;
  navTitle: string;
  openCockpit: string;
  close: string;
};

export const SECTIONS_I18N: Record<string, SectionsStrings> = {
  en: { items: "{n} items", navAria: "Page navigation", navTitle: "On this page", openCockpit: "Open the control room", close: "Close" },
  es: { items: "{n} elementos", navAria: "Navegación de la página", navTitle: "En esta página", openCockpit: "Abrir la sala de control", close: "Cerrar" },
  fr: { items: "{n} éléments", navAria: "Navigation de la page", navTitle: "Sur cette page", openCockpit: "Ouvrir le poste de pilotage", close: "Fermer" },
  it: { items: "{n} elementi", navAria: "Navigazione della pagina", navTitle: "In questa pagina", openCockpit: "Apri la cabina di regia", close: "Chiudi" },
  ru: { items: "{n} шт.", navAria: "Навигация по странице", navTitle: "На этой странице", openCockpit: "Открыть панель управления", close: "Закрыть" },
  de: { items: "{n} Einträge", navAria: "Seitennavigation", navTitle: "Auf dieser Seite", openCockpit: "Steuerpult öffnen", close: "Schließen" },
  pt: { items: "{n} itens", navAria: "Navegação da página", navTitle: "Nesta página", openCockpit: "Abrir o painel de controlo", close: "Fechar" },
  pl: { items: "{n} elem.", navAria: "Nawigacja po stronie", navTitle: "Na tej stronie", openCockpit: "Otwórz panel sterowania", close: "Zamknij" },
  tr: { items: "{n} öğe", navAria: "Sayfa gezinmesi", navTitle: "Bu sayfada", openCockpit: "Kontrol panelini aç", close: "Kapat" },
  nl: { items: "{n} items", navAria: "Paginanavigatie", navTitle: "Op deze pagina", openCockpit: "Bedieningspaneel openen", close: "Sluiten" },
};

export const sectionsStrings = (lang: string): SectionsStrings => SECTIONS_I18N[lang.slice(0, 2)] ?? SECTIONS_I18N.en;
