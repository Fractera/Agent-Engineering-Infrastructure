// СЛОВАРЬ КАЛЕНДАРЯ — десять языков (закон 4г), англ. фолбэк. Живёт в папке вкладки (закон 0).
//
// Подписи ПЕРЕНЕСЕНЫ ИЗ v1 (`_shared/calendar-i18n.ts`) ДОСЛОВНО — владелец просил календарь, который
// выглядит ровно как в первой версии; менять формулировки при переносе значит менять продукт. Новые
// ключи только у административной половины (её в v1 не было в этом виде: там инструкция стояла над
// календарём, здесь она уходит в настройку под ним — общая раскладка кокпита v2).
//
// НАЗВАНИЯ МЕСЯЦЕВ И ДНЕЙ НЕДЕЛИ ЗДЕСЬ НЕ ЛЕЖАТ — как и в v1, их даёт `Intl.DateTimeFormat` по языку
// страницы: рантайм знает их для всех языков, а руками переведённый список рано или поздно оставит
// пустую подпись.
export type CalendarStrings = {
  filterAll: string;
  filterEvents: string;
  filterReminders: string;
  reminderCountLabel: string;
  eventCountLabel: string;
  emptyDay: string;
  emptyAutomation: string;
  loadFailed: string;
  typeEvent: string;
  typeReminder: string;
  prevMonth: string;
  nextMonth: string;
  pickDate: string;
  // административная половина
  instructionTitle: string;
  instructionBody: string;
  settings: string;
  settingsHint: string;
  table: string;
  entryType: string;
  noTypes: string;
};

export const CALENDAR_I18N: Record<string, CalendarStrings> = {
  en: {
    filterAll: "All",
    filterEvents: "Events",
    filterReminders: "Reminders",
    reminderCountLabel: "reminders",
    eventCountLabel: "events",
    emptyDay: "No entries on this date.",
    emptyAutomation: "No scheduled items yet.",
    loadFailed: "The calendar entries could not be loaded.",
    typeEvent: "event",
    typeReminder: "reminder",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    pickDate: "Pick a date",
    instructionTitle: "Scheduled events and reminders",
    instructionBody:
      "This calendar shows this automation's own scheduled events (blue) and reminders (amber). Entries come from the output rows — nothing is created here by hand.",
    settings: "Calendar settings",
    settingsHint: "Where the calendar reads its entries and which kinds it knows. Both come from the core — change the core, the calendar changes.",
    table: "Storage table",
    entryType: "Entry kind",
    noTypes: "This calendar declares no entry kinds yet.",
  },
  es: {
    filterAll: "Todos",
    filterEvents: "Eventos",
    filterReminders: "Recordatorios",
    reminderCountLabel: "recordatorios",
    eventCountLabel: "eventos",
    emptyDay: "No hay entradas en esta fecha.",
    emptyAutomation: "Aún no hay elementos programados.",
    loadFailed: "No se han podido cargar las entradas del calendario.",
    typeEvent: "evento",
    typeReminder: "recordatorio",
    prevMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    pickDate: "Elige una fecha",
    instructionTitle: "Eventos y recordatorios programados",
    instructionBody:
      "Este calendario muestra los propios eventos programados (azul) y recordatorios (ámbar) de esta automatización. Las entradas vienen de las filas de salida: aquí no se crea nada a mano.",
    settings: "Ajustes del calendario",
    settingsHint: "De dónde lee el calendario sus entradas y qué tipos conoce. Ambos vienen del núcleo: cambia el núcleo y cambia el calendario.",
    table: "Tabla de almacenamiento",
    entryType: "Tipo de entrada",
    noTypes: "Este calendario aún no declara tipos de entrada.",
  },
  fr: {
    filterAll: "Tous",
    filterEvents: "Événements",
    filterReminders: "Rappels",
    reminderCountLabel: "rappels",
    eventCountLabel: "événements",
    emptyDay: "Aucune entrée à cette date.",
    emptyAutomation: "Aucun élément planifié pour l'instant.",
    loadFailed: "Les entrées du calendrier n'ont pas pu être chargées.",
    typeEvent: "événement",
    typeReminder: "rappel",
    prevMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    pickDate: "Choisissez une date",
    instructionTitle: "Événements et rappels planifiés",
    instructionBody:
      "Ce calendrier affiche les propres événements planifiés (bleu) et rappels (ambre) de cette automatisation. Les entrées proviennent des lignes de sortie : rien n'est créé ici à la main.",
    settings: "Réglages du calendrier",
    settingsHint: "Où le calendrier lit ses entrées et quels types il connaît. Les deux viennent du noyau : changez le noyau, le calendrier change.",
    table: "Table de stockage",
    entryType: "Type d'entrée",
    noTypes: "Ce calendrier ne déclare encore aucun type d'entrée.",
  },
  it: {
    filterAll: "Tutti",
    filterEvents: "Eventi",
    filterReminders: "Promemoria",
    reminderCountLabel: "promemoria",
    eventCountLabel: "eventi",
    emptyDay: "Nessuna voce in questa data.",
    emptyAutomation: "Nessun elemento pianificato per ora.",
    loadFailed: "Non è stato possibile caricare le voci del calendario.",
    typeEvent: "evento",
    typeReminder: "promemoria",
    prevMonth: "Mese precedente",
    nextMonth: "Mese successivo",
    pickDate: "Scegli una data",
    instructionTitle: "Eventi e promemoria pianificati",
    instructionBody:
      "Questo calendario mostra gli eventi pianificati (blu) e i promemoria (ambra) di questa automazione. Le voci arrivano dalle righe di output: qui non si crea nulla a mano.",
    settings: "Impostazioni del calendario",
    settingsHint: "Da dove il calendario legge le sue voci e quali tipi conosce. Entrambi vengono dal nucleo: cambia il nucleo e cambia il calendario.",
    table: "Tabella di archiviazione",
    entryType: "Tipo di voce",
    noTypes: "Questo calendario non dichiara ancora tipi di voce.",
  },
  ru: {
    filterAll: "Все",
    filterEvents: "События",
    filterReminders: "Напоминания",
    reminderCountLabel: "напоминаний",
    eventCountLabel: "событий",
    emptyDay: "На эту дату записей нет.",
    emptyAutomation: "Запланированных записей пока нет.",
    loadFailed: "Записи календаря загрузить не удалось.",
    typeEvent: "событие",
    typeReminder: "напоминание",
    prevMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    pickDate: "Выберите дату",
    instructionTitle: "Запланированные события и напоминания",
    instructionBody:
      "Здесь показаны собственные запланированные события (синий) и напоминания (янтарный) этой автоматизации. Записи берутся из строк вывода — руками здесь ничего не создаётся.",
    settings: "Настройка календаря",
    settingsHint: "Откуда календарь читает записи и какие виды знает. И то и другое берётся из ядра — меняется ядро, меняется календарь.",
    table: "Таблица хранилища",
    entryType: "Вид записи",
    noTypes: "Календарь пока не объявил ни одного вида записей.",
  },
  de: {
    filterAll: "Alle",
    filterEvents: "Ereignisse",
    filterReminders: "Erinnerungen",
    reminderCountLabel: "Erinnerungen",
    eventCountLabel: "Ereignisse",
    emptyDay: "Keine Einträge an diesem Datum.",
    emptyAutomation: "Noch keine geplanten Einträge.",
    loadFailed: "Die Kalendereinträge konnten nicht geladen werden.",
    typeEvent: "Ereignis",
    typeReminder: "Erinnerung",
    prevMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    pickDate: "Datum wählen",
    instructionTitle: "Geplante Ereignisse und Erinnerungen",
    instructionBody:
      "Dieser Kalender zeigt die eigenen geplanten Ereignisse (blau) und Erinnerungen (bernstein) dieser Automatisierung. Die Einträge stammen aus den Ausgabezeilen — hier wird nichts von Hand angelegt.",
    settings: "Kalender-Einstellungen",
    settingsHint: "Woher der Kalender seine Einträge liest und welche Arten er kennt. Beides kommt aus dem Kern — ändere den Kern, ändert sich der Kalender.",
    table: "Speichertabelle",
    entryType: "Eintragsart",
    noTypes: "Dieser Kalender deklariert noch keine Eintragsarten.",
  },
  pt: {
    filterAll: "Todos",
    filterEvents: "Eventos",
    filterReminders: "Lembretes",
    reminderCountLabel: "lembretes",
    eventCountLabel: "eventos",
    emptyDay: "Sem entradas nesta data.",
    emptyAutomation: "Ainda não há itens agendados.",
    loadFailed: "Não foi possível carregar as entradas do calendário.",
    typeEvent: "evento",
    typeReminder: "lembrete",
    prevMonth: "Mês anterior",
    nextMonth: "Próximo mês",
    pickDate: "Escolha uma data",
    instructionTitle: "Eventos e lembretes agendados",
    instructionBody:
      "Este calendário mostra os próprios eventos agendados (azul) e lembretes (âmbar) desta automação. As entradas vêm das linhas de saída — aqui nada é criado à mão.",
    settings: "Definições do calendário",
    settingsHint: "De onde o calendário lê as suas entradas e que tipos conhece. Ambos vêm do núcleo — muda o núcleo, muda o calendário.",
    table: "Tabela de armazenamento",
    entryType: "Tipo de entrada",
    noTypes: "Este calendário ainda não declara tipos de entrada.",
  },
  pl: {
    filterAll: "Wszystkie",
    filterEvents: "Zdarzenia",
    filterReminders: "Przypomnienia",
    reminderCountLabel: "przypomnień",
    eventCountLabel: "zdarzeń",
    emptyDay: "Brak wpisów na tę datę.",
    emptyAutomation: "Nie ma jeszcze zaplanowanych wpisów.",
    loadFailed: "Nie udało się wczytać wpisów kalendarza.",
    typeEvent: "zdarzenie",
    typeReminder: "przypomnienie",
    prevMonth: "Poprzedni miesiąc",
    nextMonth: "Następny miesiąc",
    pickDate: "Wybierz datę",
    instructionTitle: "Zaplanowane zdarzenia i przypomnienia",
    instructionBody:
      "Ten kalendarz pokazuje własne zaplanowane zdarzenia (niebieski) i przypomnienia (bursztynowy) tej automatyzacji. Wpisy pochodzą z wierszy wyjściowych — nic nie tworzy się tu ręcznie.",
    settings: "Ustawienia kalendarza",
    settingsHint: "Skąd kalendarz czyta wpisy i jakie rodzaje zna. Jedno i drugie pochodzi z rdzenia — zmień rdzeń, zmieni się kalendarz.",
    table: "Tabela magazynu",
    entryType: "Rodzaj wpisu",
    noTypes: "Ten kalendarz nie deklaruje jeszcze rodzajów wpisów.",
  },
  tr: {
    filterAll: "Tümü",
    filterEvents: "Etkinlikler",
    filterReminders: "Hatırlatıcılar",
    reminderCountLabel: "hatırlatıcı",
    eventCountLabel: "etkinlik",
    emptyDay: "Bu tarihte kayıt yok.",
    emptyAutomation: "Henüz zamanlanmış öğe yok.",
    loadFailed: "Takvim kayıtları yüklenemedi.",
    typeEvent: "etkinlik",
    typeReminder: "hatırlatıcı",
    prevMonth: "Önceki ay",
    nextMonth: "Sonraki ay",
    pickDate: "Bir tarih seçin",
    instructionTitle: "Zamanlanmış etkinlikler ve hatırlatıcılar",
    instructionBody:
      "Bu takvim, bu otomasyonun kendi zamanlanmış etkinliklerini (mavi) ve hatırlatıcılarını (kehribar) gösterir. Kayıtlar çıktı satırlarından gelir — burada elle bir şey oluşturulmaz.",
    settings: "Takvim ayarları",
    settingsHint: "Takvimin kayıtlarını nereden okuduğu ve hangi türleri tanıdığı. İkisi de çekirdekten gelir — çekirdeği değiştir, takvim değişir.",
    table: "Depolama tablosu",
    entryType: "Kayıt türü",
    noTypes: "Bu takvim henüz kayıt türü tanımlamıyor.",
  },
  nl: {
    filterAll: "Alle",
    filterEvents: "Gebeurtenissen",
    filterReminders: "Herinneringen",
    reminderCountLabel: "herinneringen",
    eventCountLabel: "gebeurtenissen",
    emptyDay: "Geen items op deze datum.",
    emptyAutomation: "Nog geen geplande items.",
    loadFailed: "De agenda-items konden niet worden geladen.",
    typeEvent: "gebeurtenis",
    typeReminder: "herinnering",
    prevMonth: "Vorige maand",
    nextMonth: "Volgende maand",
    pickDate: "Kies een datum",
    instructionTitle: "Geplande gebeurtenissen en herinneringen",
    instructionBody:
      "Deze kalender toont de eigen geplande gebeurtenissen (blauw) en herinneringen (amber) van deze automatisering. De items komen uit de uitvoerrijen — hier wordt niets met de hand aangemaakt.",
    settings: "Kalenderinstellingen",
    settingsHint: "Waar de kalender zijn items leest en welke soorten hij kent. Beide komen uit de kern — verander de kern en de kalender verandert mee.",
    table: "Opslagtabel",
    entryType: "Soort item",
    noTypes: "Deze kalender declareert nog geen soorten items.",
  },
};

export const calendarStrings = (lang: string): CalendarStrings => CALENDAR_I18N[lang.slice(0, 2)] ?? CALENDAR_I18N.en;
