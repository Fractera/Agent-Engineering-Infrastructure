// TEN-LANGUAGE UI for the "Calendar" accordion (CLAUDE.md rule 4г) — en, es, fr, it, ru, de, pt, pl, tr, nl;
// anything else -> English. Month/weekday NAMES are NOT hand-translated here — the component resolves them
// live via `Intl.DateTimeFormat` (deterministic, built into the runtime, zero risk of an incomplete
// translation leaving a blank label). This file covers everything Intl cannot: instruction copy, filters,
// counters, empty states, entry-type labels.

export type CalendarStrings = {
  instructionTitle: string;
  instructionBody: string;
  filterAll: string;
  filterEvents: string;
  filterReminders: string;
  reminderCountLabel: string; // "{n} <label>"
  eventCountLabel: string;    // "{n} <label>"
  emptyDay: string;
  emptyAutomation: string;
  typeEvent: string;
  typeReminder: string;
  prevMonth: string;
  nextMonth: string;
  pickDate: string;
};

const CALENDAR_I18N: Record<string, CalendarStrings> = {
  en: {
    instructionTitle: "Scheduled events and reminders",
    instructionBody:
      "This calendar shows this automation's own scheduled events (blue) and reminders (amber) — a static " +
      "preview for now, not yet fed by an interactive request.",
    filterAll: "All",
    filterEvents: "Events",
    filterReminders: "Reminders",
    reminderCountLabel: "reminders",
    eventCountLabel: "events",
    emptyDay: "No entries on this date.",
    emptyAutomation: "No scheduled items yet.",
    typeEvent: "event",
    typeReminder: "reminder",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    pickDate: "Pick a date",
  },
  ru: {
    instructionTitle: "Запланированные события и напоминания",
    instructionBody:
      "Здесь показаны собственные запланированные события (синий) и напоминания (янтарный) этой " +
      "автоматизации — пока статичный предпросмотр, без интерактивного создания записей.",
    filterAll: "Все",
    filterEvents: "События",
    filterReminders: "Напоминания",
    reminderCountLabel: "напоминаний",
    eventCountLabel: "событий",
    emptyDay: "На эту дату записей нет.",
    emptyAutomation: "Запланированных записей пока нет.",
    typeEvent: "событие",
    typeReminder: "напоминание",
    prevMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    pickDate: "Выберите дату",
  },
  es: {
    instructionTitle: "Eventos y recordatorios programados",
    instructionBody:
      "Este calendario muestra los propios eventos programados (azul) y recordatorios (ámbar) de esta " +
      "automatización — por ahora una vista estática, aún sin creación interactiva de entradas.",
    filterAll: "Todos",
    filterEvents: "Eventos",
    filterReminders: "Recordatorios",
    reminderCountLabel: "recordatorios",
    eventCountLabel: "eventos",
    emptyDay: "No hay entradas en esta fecha.",
    emptyAutomation: "Aún no hay elementos programados.",
    typeEvent: "evento",
    typeReminder: "recordatorio",
    prevMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    pickDate: "Elige una fecha",
  },
  fr: {
    instructionTitle: "Événements et rappels planifiés",
    instructionBody:
      "Ce calendrier affiche les propres événements planifiés (bleu) et rappels (ambre) de cette " +
      "automatisation — pour l'instant un aperçu statique, sans création interactive d'entrées.",
    filterAll: "Tous",
    filterEvents: "Événements",
    filterReminders: "Rappels",
    reminderCountLabel: "rappels",
    eventCountLabel: "événements",
    emptyDay: "Aucune entrée à cette date.",
    emptyAutomation: "Aucun élément planifié pour l'instant.",
    typeEvent: "événement",
    typeReminder: "rappel",
    prevMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    pickDate: "Choisissez une date",
  },
  it: {
    instructionTitle: "Eventi e promemoria pianificati",
    instructionBody:
      "Questo calendario mostra gli eventi pianificati (blu) e i promemoria (ambra) di questa automazione — " +
      "per ora un'anteprima statica, senza ancora la creazione interattiva delle voci.",
    filterAll: "Tutti",
    filterEvents: "Eventi",
    filterReminders: "Promemoria",
    reminderCountLabel: "promemoria",
    eventCountLabel: "eventi",
    emptyDay: "Nessuna voce in questa data.",
    emptyAutomation: "Nessun elemento pianificato per ora.",
    typeEvent: "evento",
    typeReminder: "promemoria",
    prevMonth: "Mese precedente",
    nextMonth: "Mese successivo",
    pickDate: "Scegli una data",
  },
  de: {
    instructionTitle: "Geplante Ereignisse und Erinnerungen",
    instructionBody:
      "Dieser Kalender zeigt die eigenen geplanten Ereignisse (blau) und Erinnerungen (bernstein) dieser " +
      "Automatisierung — vorerst eine statische Vorschau, noch ohne interaktive Erstellung von Einträgen.",
    filterAll: "Alle",
    filterEvents: "Ereignisse",
    filterReminders: "Erinnerungen",
    reminderCountLabel: "Erinnerungen",
    eventCountLabel: "Ereignisse",
    emptyDay: "Keine Einträge an diesem Datum.",
    emptyAutomation: "Noch keine geplanten Einträge.",
    typeEvent: "Ereignis",
    typeReminder: "Erinnerung",
    prevMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    pickDate: "Datum wählen",
  },
  pt: {
    instructionTitle: "Eventos e lembretes agendados",
    instructionBody:
      "Este calendário mostra os próprios eventos agendados (azul) e lembretes (âmbar) desta automação — " +
      "por enquanto uma pré-visualização estática, ainda sem criação interativa de entradas.",
    filterAll: "Todos",
    filterEvents: "Eventos",
    filterReminders: "Lembretes",
    reminderCountLabel: "lembretes",
    eventCountLabel: "eventos",
    emptyDay: "Sem entradas nesta data.",
    emptyAutomation: "Ainda não há itens agendados.",
    typeEvent: "evento",
    typeReminder: "lembrete",
    prevMonth: "Mês anterior",
    nextMonth: "Próximo mês",
    pickDate: "Escolha uma data",
  },
  pl: {
    instructionTitle: "Zaplanowane zdarzenia i przypomnienia",
    instructionBody:
      "Ten kalendarz pokazuje własne zaplanowane zdarzenia (niebieski) i przypomnienia (bursztynowy) tej " +
      "automatyzacji — na razie statyczny podgląd, jeszcze bez interaktywnego tworzenia wpisów.",
    filterAll: "Wszystkie",
    filterEvents: "Zdarzenia",
    filterReminders: "Przypomnienia",
    reminderCountLabel: "przypomnień",
    eventCountLabel: "zdarzeń",
    emptyDay: "Brak wpisów na tę datę.",
    emptyAutomation: "Nie ma jeszcze zaplanowanych wpisów.",
    typeEvent: "zdarzenie",
    typeReminder: "przypomnienie",
    prevMonth: "Poprzedni miesiąc",
    nextMonth: "Następny miesiąc",
    pickDate: "Wybierz datę",
  },
  tr: {
    instructionTitle: "Zamanlanmış etkinlikler ve hatırlatıcılar",
    instructionBody:
      "Bu takvim, bu otomasyonun kendi zamanlanmış etkinliklerini (mavi) ve hatırlatıcılarını (kehribar) " +
      "gösterir — şimdilik statik bir önizleme, henüz etkileşimli kayıt oluşturma yok.",
    filterAll: "Tümü",
    filterEvents: "Etkinlikler",
    filterReminders: "Hatırlatıcılar",
    reminderCountLabel: "hatırlatıcı",
    eventCountLabel: "etkinlik",
    emptyDay: "Bu tarihte kayıt yok.",
    emptyAutomation: "Henüz zamanlanmış öğe yok.",
    typeEvent: "etkinlik",
    typeReminder: "hatırlatıcı",
    prevMonth: "Önceki ay",
    nextMonth: "Sonraki ay",
    pickDate: "Bir tarih seçin",
  },
  nl: {
    instructionTitle: "Geplande gebeurtenissen en herinneringen",
    instructionBody:
      "Deze kalender toont de eigen geplande gebeurtenissen (blauw) en herinneringen (amber) van deze " +
      "automatisering — voorlopig een statische preview, nog zonder interactieve invoer.",
    filterAll: "Alle",
    filterEvents: "Gebeurtenissen",
    filterReminders: "Herinneringen",
    reminderCountLabel: "herinneringen",
    eventCountLabel: "gebeurtenissen",
    emptyDay: "Geen items op deze datum.",
    emptyAutomation: "Nog geen geplande items.",
    typeEvent: "gebeurtenis",
    typeReminder: "herinnering",
    prevMonth: "Vorige maand",
    nextMonth: "Volgende maand",
    pickDate: "Kies een datum",
  },
};

export function calendarStrings(lang: string): CalendarStrings {
  return CALENDAR_I18N[lang.slice(0, 2)] ?? CALENDAR_I18N.en;
}
