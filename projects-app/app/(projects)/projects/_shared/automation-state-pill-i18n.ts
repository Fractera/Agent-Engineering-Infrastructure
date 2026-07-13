// TEN-LANGUAGE UI for the automation STATE pill (CLAUDE.md 4г) — the "In development / Stopped / Active"
// label next to the immutable type badge on every automation page (components/automation-state-pill.client.tsx).
// Hand-authored fixed chrome, same pattern as quiz-i18n.ts. inDevN/inDevOne mirror quiz-i18n.ts's
// casesWritten/casesWrittenOne plural pair; fill {n} with `fill()` (reused from quiz-i18n.ts).

export type AutomationStatePillStrings = {
  inDevN: string;    // {n}
  inDevOne: string;
  stopped: string;
  active: string;
};

export const AUTOMATION_STATE_PILL_I18N: Record<string, AutomationStatePillStrings> = {
  en: { inDevN: "In development — {n} nodes to build", inDevOne: "In development — 1 node to build", stopped: "Stopped", active: "Active" },
  ru: { inDevN: "В разработке — узлов на постройку: {n}", inDevOne: "В разработке — 1 узел на постройку", stopped: "Остановлена", active: "Активна" },
  es: { inDevN: "En desarrollo — {n} nodos por construir", inDevOne: "En desarrollo — 1 nodo por construir", stopped: "Detenida", active: "Activa" },
  fr: { inDevN: "En développement — {n} nœuds à construire", inDevOne: "En développement — 1 nœud à construire", stopped: "Arrêtée", active: "Active" },
  it: { inDevN: "In sviluppo — {n} nodi da costruire", inDevOne: "In sviluppo — 1 nodo da costruire", stopped: "Ferma", active: "Attiva" },
  de: { inDevN: "In Entwicklung — {n} Knoten zu bauen", inDevOne: "In Entwicklung — 1 Knoten zu bauen", stopped: "Gestoppt", active: "Aktiv" },
  pt: { inDevN: "Em desenvolvimento — {n} nós por construir", inDevOne: "Em desenvolvimento — 1 nó por construir", stopped: "Parada", active: "Ativa" },
  pl: { inDevN: "W trakcie tworzenia — węzłów do zbudowania: {n}", inDevOne: "W trakcie tworzenia — 1 węzeł do zbudowania", stopped: "Zatrzymana", active: "Aktywna" },
  tr: { inDevN: "Geliştirme aşamasında — inşa edilecek {n} düğüm", inDevOne: "Geliştirme aşamasında — inşa edilecek 1 düğüm", stopped: "Durduruldu", active: "Etkin" },
  nl: { inDevN: "In ontwikkeling — {n} nodes te bouwen", inDevOne: "In ontwikkeling — 1 node te bouwen", stopped: "Gestopt", active: "Actief" },
};

export function automationStatePillStrings(lang: string): AutomationStatePillStrings {
  return AUTOMATION_STATE_PILL_I18N[lang.slice(0, 2)] ?? AUTOMATION_STATE_PILL_I18N.en;
}
