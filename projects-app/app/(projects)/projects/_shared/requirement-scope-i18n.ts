// REQUIREMENT-PANEL SCOPE WORDS (owner 2026-07-16) — the suffix of the "Build mode — …" button, naming WHAT
// the requirement targets: «Режим строительства — таблицы / дашборда / карты / …». Grammatically correct per
// language (Russian genitive), so a SEPARATE dictionary from the accordion titles (nominative). Used ONLY
// for the panel's button/header suffix — the Quiz subject keeps the plain entity label. Ten languages,
// deterministic, in code (rule 4г).

export type RequirementScopeKey =
  | "table" | "dashboard" | "analytics" | "calendar" | "cron" | "map" | "processes" | "fork-activation";

export const REQUIREMENT_SCOPE_I18N: Record<string, Record<RequirementScopeKey, string>> = {
  en: { table: "table", dashboard: "dashboard", analytics: "analytics", calendar: "calendar", cron: "cron", map: "map", processes: "processes", "fork-activation": "fork activation" },
  ru: { table: "таблицы", dashboard: "дашборда", analytics: "аналитики", calendar: "календаря", cron: "крона", map: "карты", processes: "процессов", "fork-activation": "активации форка" },
  es: { table: "tabla", dashboard: "panel", analytics: "analítica", calendar: "calendario", cron: "cron", map: "mapa", processes: "procesos", "fork-activation": "activación de fork" },
  fr: { table: "tableau", dashboard: "tableau de bord", analytics: "analytique", calendar: "calendrier", cron: "cron", map: "carte", processes: "processus", "fork-activation": "activation de fork" },
  it: { table: "tabella", dashboard: "dashboard", analytics: "analitica", calendar: "calendario", cron: "cron", map: "mappa", processes: "processi", "fork-activation": "attivazione fork" },
  de: { table: "Tabelle", dashboard: "Dashboard", analytics: "Analytik", calendar: "Kalender", cron: "Cron", map: "Karte", processes: "Prozesse", "fork-activation": "Fork-Aktivierung" },
  pt: { table: "tabela", dashboard: "painel", analytics: "análises", calendar: "calendário", cron: "cron", map: "mapa", processes: "processos", "fork-activation": "ativação de fork" },
  pl: { table: "tabeli", dashboard: "pulpitu", analytics: "analityki", calendar: "kalendarza", cron: "crona", map: "mapy", processes: "procesów", "fork-activation": "aktywacji forka" },
  tr: { table: "tablo", dashboard: "panel", analytics: "analitik", calendar: "takvim", cron: "cron", map: "harita", processes: "süreçler", "fork-activation": "fork etkinleştirme" },
  nl: { table: "tabel", dashboard: "dashboard", analytics: "analytics", calendar: "kalender", cron: "cron", map: "kaart", processes: "processen", "fork-activation": "fork-activering" },
};

export function requirementScope(lang: string, key: RequirementScopeKey): string {
  return (REQUIREMENT_SCOPE_I18N[lang] ?? REQUIREMENT_SCOPE_I18N.en)[key];
}
