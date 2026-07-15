// TEN-LANGUAGE UI for the two MODE indicators next to the automation STATE pill (CLAUDE.md 4г) — Hook
// (request-triggered, "designed" activation console) and Cron (own periodic tick, independent of it). See
// components/automation-mode-indicators.client.tsx. Hand-authored fixed chrome, same pattern as
// automation-state-pill-i18n.ts.

export type AutomationModeIndicatorsStrings = {
  hookLabel: string;
  hookOn: string;
  hookOff: string;
  cronLabel: string;
  cronOn: string;
  cronOff: string;
};

export const AUTOMATION_MODE_INDICATORS_I18N: Record<string, AutomationModeIndicatorsStrings> = {
  en: { hookLabel: "Hook", hookOn: "Listening", hookOff: "Not designed yet", cronLabel: "Cron", cronOn: "Scheduled", cronOff: "Off" },
  ru: { hookLabel: "Hook", hookOn: "Слушает", hookOff: "Ещё не спроектирован", cronLabel: "Cron", cronOn: "По расписанию", cronOff: "Выключен" },
  es: { hookLabel: "Hook", hookOn: "Escuchando", hookOff: "Aún no diseñada", cronLabel: "Cron", cronOn: "Programado", cronOff: "Apagado" },
  fr: { hookLabel: "Hook", hookOn: "À l'écoute", hookOff: "Pas encore conçue", cronLabel: "Cron", cronOn: "Planifié", cronOff: "Désactivé" },
  it: { hookLabel: "Hook", hookOn: "In ascolto", hookOff: "Non ancora progettata", cronLabel: "Cron", cronOn: "Pianificato", cronOff: "Spento" },
  de: { hookLabel: "Hook", hookOn: "Wartet auf Anfragen", hookOff: "Noch nicht entworfen", cronLabel: "Cron", cronOn: "Geplant", cronOff: "Aus" },
  pt: { hookLabel: "Hook", hookOn: "Escutando", hookOff: "Ainda não projetada", cronLabel: "Cron", cronOn: "Agendado", cronOff: "Desligado" },
  pl: { hookLabel: "Hook", hookOn: "Nasłuchuje", hookOff: "Jeszcze nie zaprojektowana", cronLabel: "Cron", cronOn: "Zaplanowany", cronOff: "Wyłączony" },
  tr: { hookLabel: "Hook", hookOn: "Dinliyor", hookOff: "Henüz tasarlanmadı", cronLabel: "Cron", cronOn: "Zamanlandı", cronOff: "Kapalı" },
  nl: { hookLabel: "Hook", hookOn: "Luistert", hookOff: "Nog niet ontworpen", cronLabel: "Cron", cronOn: "Gepland", cronOff: "Uit" },
};

export function automationModeIndicatorsStrings(lang: string): AutomationModeIndicatorsStrings {
  return AUTOMATION_MODE_INDICATORS_I18N[lang.slice(0, 2)] ?? AUTOMATION_MODE_INDICATORS_I18N.en;
}
