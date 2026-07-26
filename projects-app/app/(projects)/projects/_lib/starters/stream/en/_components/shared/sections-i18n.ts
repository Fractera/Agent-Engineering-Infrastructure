// СЛОВАРЬ ОБЩЕЙ ОБВЯЗКИ РАЗДЕЛОВ — десять языков (закон 4г): счётчик содержимого раздела и навигация
// публичной страницы. Общий, потому что и то и другое — не про конкретную вкладку, а про страницу в целом.
export type SectionsStrings = {
  items: string; // "{n}" — сколько сущностей внутри раздела
  navAria: string;
  navTitle: string;
  openCockpit: string;
  close: string;
  notBuiltYet: string; // у раздела ещё нет содержимого — честное состояние, а не причина исчезнуть
};

export const SECTIONS_I18N: Record<string, SectionsStrings> = {
  en: { items: "{n} items", navAria: "Page navigation", navTitle: "On this page", openCockpit: "Open the control room", close: "Close", notBuiltYet: "This section has no content yet." },
  es: { items: "{n} elementos", navAria: "Navegación de la página", navTitle: "En esta página", openCockpit: "Abrir la sala de control", close: "Cerrar", notBuiltYet: "Esta sección aún no tiene contenido." },
  fr: { items: "{n} éléments", navAria: "Navigation de la page", navTitle: "Sur cette page", openCockpit: "Ouvrir le poste de pilotage", close: "Fermer", notBuiltYet: "Cette section n’a pas encore de contenu." },
  it: { items: "{n} elementi", navAria: "Navigazione della pagina", navTitle: "In questa pagina", openCockpit: "Apri la cabina di regia", close: "Chiudi", notBuiltYet: "Questa sezione non ha ancora contenuti." },
  ru: { items: "{n} шт.", navAria: "Навигация по странице", navTitle: "На этой странице", openCockpit: "Открыть панель управления", close: "Закрыть", notBuiltYet: "У этого раздела пока нет содержимого." },
  de: { items: "{n} Einträge", navAria: "Seitennavigation", navTitle: "Auf dieser Seite", openCockpit: "Steuerpult öffnen", close: "Schließen", notBuiltYet: "Dieser Bereich hat noch keinen Inhalt." },
  pt: { items: "{n} itens", navAria: "Navegação da página", navTitle: "Nesta página", openCockpit: "Abrir o painel de controlo", close: "Fechar", notBuiltYet: "Esta secção ainda não tem conteúdo." },
  pl: { items: "{n} elem.", navAria: "Nawigacja po stronie", navTitle: "Na tej stronie", openCockpit: "Otwórz panel sterowania", close: "Zamknij", notBuiltYet: "Ta sekcja nie ma jeszcze treści." },
  tr: { items: "{n} öğe", navAria: "Sayfa gezinmesi", navTitle: "Bu sayfada", openCockpit: "Kontrol panelini aç", close: "Kapat", notBuiltYet: "Bu bölümde henüz içerik yok." },
  nl: { items: "{n} items", navAria: "Paginanavigatie", navTitle: "Op deze pagina", openCockpit: "Bedieningspaneel openen", close: "Sluiten", notBuiltYet: "Deze sectie heeft nog geen inhoud." },
};

export const sectionsStrings = (lang: string): SectionsStrings => SECTIONS_I18N[lang.slice(0, 2)] ?? SECTIONS_I18N.en;
