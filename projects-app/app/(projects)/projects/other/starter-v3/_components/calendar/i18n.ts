// СЛОВАРЬ КАЛЕНДАРЯ — десять языков (закон 4г), англ. фолбэк. Живёт в папке вкладки (закон 0).
//
// Подписи вида и планера ПЕРЕНЕСЕНЫ ИЗ v1 (`_shared/calendar-i18n.ts`) ДОСЛОВНО — владелец просил
// календарь, который выглядит ровно как в первой версии; менять формулировки при переносе значит менять
// продукт. Всё, чего в v1 не было, — уведомления и интеграции (шаг 292) — дописано ниже своими ключами.
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
  // уведомления (шаг 292)
  acknowledge: string;
  notifyBefore: string;
  minutes: string;
  atTheMoment: string;
  noSchedule: string;
  // интеграции (шаг 292)
  integrations: string;
  keysMissing: string;
  integrationsHint: string;
  noIntegrations: string;
  active: string;
  allOn: string;
  allOff: string;
  edit: string;
  save: string;
  cancel: string;
  saving: string;
  viewOnly: string;
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
    filterAll: "All", filterEvents: "Events", filterReminders: "Reminders",
    reminderCountLabel: "reminders", eventCountLabel: "events",
    emptyDay: "No entries on this date.", emptyAutomation: "No scheduled items yet.",
    loadFailed: "The calendar entries could not be loaded.",
    typeEvent: "event", typeReminder: "reminder",
    prevMonth: "Previous month", nextMonth: "Next month", pickDate: "Pick a date",
    acknowledge: "Okay, I understand", notifyBefore: "Warn me", minutes: "min",
    atTheMoment: "at the moment itself",
    noSchedule: "The schedule is off — nothing is watched and no reminder is raised.",
    keysMissing: "keys are not set — click to connect",
    integrations: "Integrations",
    integrationsHint: "What this event can also be sent to. Declared in the core; what exactly goes out is written per entry.",
    noIntegrations: "This entry has no integrations connected.",
    active: "Active", allOn: "Turn all on", allOff: "Turn all off",
    edit: "Edit", save: "Save", cancel: "Cancel", saving: "Saving…",
    viewOnly: "Open the control room to edit this.",
    instructionTitle: "Scheduled events and reminders",
    instructionBody:
      "This calendar shows this automation's own scheduled events (blue) and reminders (amber). Entries come from the output rows — nothing is created here by hand. On its own the calendar does exactly one thing: it raises a toast when an entry falls due, on the beat of the schedule.",
    settings: "Calendar settings",
    settingsHint: "Where the calendar reads its entries, which kinds it knows and which integrations it may use. All of it comes from the core — change the core, the calendar changes.",
    table: "Storage table", entryType: "Entry kind", noTypes: "This calendar declares no entry kinds yet.",
  },
  es: {
    filterAll: "Todos", filterEvents: "Eventos", filterReminders: "Recordatorios",
    reminderCountLabel: "recordatorios", eventCountLabel: "eventos",
    emptyDay: "No hay entradas en esta fecha.", emptyAutomation: "Aún no hay elementos programados.",
    loadFailed: "No se han podido cargar las entradas del calendario.",
    typeEvent: "evento", typeReminder: "recordatorio",
    prevMonth: "Mes anterior", nextMonth: "Mes siguiente", pickDate: "Elige una fecha",
    acknowledge: "Vale, lo entiendo", notifyBefore: "Avisarme", minutes: "min",
    atTheMoment: "en el momento exacto",
    noSchedule: "La programación está apagada: no se vigila nada ni se avisa de nada.",
    keysMissing: "claves no puestas — haz clic para conectar",
    integrations: "Integraciones",
    integrationsHint: "A dónde más puede enviarse este evento. Se declara en el núcleo; lo que sale exactamente se escribe en cada entrada.",
    noIntegrations: "Esta entrada no tiene integraciones conectadas.",
    active: "Activa", allOn: "Activar todas", allOff: "Desactivar todas",
    edit: "Editar", save: "Guardar", cancel: "Cancelar", saving: "Guardando…",
    viewOnly: "Abre la sala de control para editarlo.",
    instructionTitle: "Eventos y recordatorios programados",
    instructionBody:
      "Este calendario muestra los propios eventos programados (azul) y recordatorios (ámbar) de esta automatización. Las entradas vienen de las filas de salida: aquí no se crea nada a mano. Por sí solo el calendario hace exactamente una cosa: lanza un aviso cuando llega una entrada, al ritmo de la programación.",
    settings: "Ajustes del calendario",
    settingsHint: "De dónde lee el calendario sus entradas, qué tipos conoce y qué integraciones puede usar. Todo viene del núcleo: cambia el núcleo y cambia el calendario.",
    table: "Tabla de almacenamiento", entryType: "Tipo de entrada", noTypes: "Este calendario aún no declara tipos de entrada.",
  },
  fr: {
    filterAll: "Tous", filterEvents: "Événements", filterReminders: "Rappels",
    reminderCountLabel: "rappels", eventCountLabel: "événements",
    emptyDay: "Aucune entrée à cette date.", emptyAutomation: "Aucun élément planifié pour l'instant.",
    loadFailed: "Les entrées du calendrier n'ont pas pu être chargées.",
    typeEvent: "événement", typeReminder: "rappel",
    prevMonth: "Mois précédent", nextMonth: "Mois suivant", pickDate: "Choisissez une date",
    acknowledge: "D'accord, j'ai compris", notifyBefore: "Me prévenir", minutes: "min",
    atTheMoment: "au moment même",
    noSchedule: "La planification est arrêtée : rien n'est surveillé et aucun rappel n'est levé.",
    keysMissing: "clés non renseignées — cliquez pour connecter",
    integrations: "Intégrations",
    integrationsHint: "Où cet événement peut aussi être envoyé. Déclaré dans le noyau ; ce qui part exactement s'écrit dans chaque entrée.",
    noIntegrations: "Cette entrée n'a aucune intégration connectée.",
    active: "Active", allOn: "Tout activer", allOff: "Tout désactiver",
    edit: "Modifier", save: "Enregistrer", cancel: "Annuler", saving: "Enregistrement…",
    viewOnly: "Ouvrez le poste de pilotage pour le modifier.",
    instructionTitle: "Événements et rappels planifiés",
    instructionBody:
      "Ce calendrier affiche les propres événements planifiés (bleu) et rappels (ambre) de cette automatisation. Les entrées proviennent des lignes de sortie : rien n'est créé ici à la main. Seul, le calendrier fait exactement une chose : il lève une alerte quand une entrée arrive à échéance, au rythme de la planification.",
    settings: "Réglages du calendrier",
    settingsHint: "Où le calendrier lit ses entrées, quels types il connaît et quelles intégrations il peut utiliser. Tout vient du noyau : changez le noyau, le calendrier change.",
    table: "Table de stockage", entryType: "Type d'entrée", noTypes: "Ce calendrier ne déclare encore aucun type d'entrée.",
  },
  it: {
    filterAll: "Tutti", filterEvents: "Eventi", filterReminders: "Promemoria",
    reminderCountLabel: "promemoria", eventCountLabel: "eventi",
    emptyDay: "Nessuna voce in questa data.", emptyAutomation: "Nessun elemento pianificato per ora.",
    loadFailed: "Non è stato possibile caricare le voci del calendario.",
    typeEvent: "evento", typeReminder: "promemoria",
    prevMonth: "Mese precedente", nextMonth: "Mese successivo", pickDate: "Scegli una data",
    acknowledge: "Va bene, ho capito", notifyBefore: "Avvisami", minutes: "min",
    atTheMoment: "nel momento stesso",
    noSchedule: "La pianificazione è spenta: non si sorveglia nulla e non arriva alcun promemoria.",
    keysMissing: "chiavi non impostate — clicca per collegare",
    integrations: "Integrazioni",
    integrationsHint: "Dove questo evento può essere inviato anche. Dichiarato nel nucleo; che cosa esce esattamente si scrive in ogni voce.",
    noIntegrations: "Questa voce non ha integrazioni collegate.",
    active: "Attiva", allOn: "Attiva tutte", allOff: "Disattiva tutte",
    edit: "Modifica", save: "Salva", cancel: "Annulla", saving: "Salvataggio…",
    viewOnly: "Apri la cabina di regia per modificarlo.",
    instructionTitle: "Eventi e promemoria pianificati",
    instructionBody:
      "Questo calendario mostra gli eventi pianificati (blu) e i promemoria (ambra) di questa automazione. Le voci arrivano dalle righe di output: qui non si crea nulla a mano. Da solo il calendario fa esattamente una cosa: lancia un avviso quando una voce scade, al ritmo della pianificazione.",
    settings: "Impostazioni del calendario",
    settingsHint: "Da dove il calendario legge le voci, quali tipi conosce e quali integrazioni può usare. Tutto viene dal nucleo: cambia il nucleo e cambia il calendario.",
    table: "Tabella di archiviazione", entryType: "Tipo di voce", noTypes: "Questo calendario non dichiara ancora tipi di voce.",
  },
  ru: {
    filterAll: "Все", filterEvents: "События", filterReminders: "Напоминания",
    reminderCountLabel: "напоминаний", eventCountLabel: "событий",
    emptyDay: "На эту дату записей нет.", emptyAutomation: "Запланированных записей пока нет.",
    loadFailed: "Записи календаря загрузить не удалось.",
    typeEvent: "событие", typeReminder: "напоминание",
    prevMonth: "Предыдущий месяц", nextMonth: "Следующий месяц", pickDate: "Выберите дату",
    acknowledge: "Окей, я это понимаю", notifyBefore: "Предупредить за", minutes: "мин",
    atTheMoment: "в сам момент",
    noSchedule: "Расписание выключено — календарь никто не проверяет и ни о чём не напоминает.",
    keysMissing: "ключи не введены — нажмите, чтобы подключить",
    integrations: "Интеграции",
    integrationsHint: "Куда это событие может уйти ещё. Объявлено в ядре; что именно уходит — записано у каждой записи.",
    noIntegrations: "У этой записи нет подключённых интеграций.",
    active: "Активна", allOn: "Включить все", allOff: "Выключить все",
    edit: "Редактировать", save: "Сохранить", cancel: "Отмена", saving: "Сохраняю…",
    viewOnly: "Чтобы править, откройте панель управления.",
    instructionTitle: "Запланированные события и напоминания",
    instructionBody:
      "Здесь показаны собственные запланированные события (синий) и напоминания (янтарный) этой автоматизации. Записи берутся из строк вывода — руками здесь ничего не создаётся. Сам по себе календарь умеет ровно одно: показать уведомление, когда запись наступила, в такте расписания.",
    settings: "Настройка календаря",
    settingsHint: "Откуда календарь читает записи, какие виды знает и какие интеграции ему доступны. Всё это берётся из ядра — меняется ядро, меняется календарь.",
    table: "Таблица хранилища", entryType: "Вид записи", noTypes: "Календарь пока не объявил ни одного вида записей.",
  },
  de: {
    filterAll: "Alle", filterEvents: "Ereignisse", filterReminders: "Erinnerungen",
    reminderCountLabel: "Erinnerungen", eventCountLabel: "Ereignisse",
    emptyDay: "Keine Einträge an diesem Datum.", emptyAutomation: "Noch keine geplanten Einträge.",
    loadFailed: "Die Kalendereinträge konnten nicht geladen werden.",
    typeEvent: "Ereignis", typeReminder: "Erinnerung",
    prevMonth: "Vorheriger Monat", nextMonth: "Nächster Monat", pickDate: "Datum wählen",
    acknowledge: "Okay, ich habe verstanden", notifyBefore: "Vorwarnung", minutes: "Min",
    atTheMoment: "genau im Moment",
    noSchedule: "Der Zeitplan ist aus — es wird nichts überwacht und an nichts erinnert.",
    keysMissing: "Schlüssel fehlen — zum Verbinden klicken",
    integrations: "Integrationen",
    integrationsHint: "Wohin dieses Ereignis außerdem gehen kann. Im Kern deklariert; was genau hinausgeht, steht am jeweiligen Eintrag.",
    noIntegrations: "Dieser Eintrag hat keine Integrationen verbunden.",
    active: "Aktiv", allOn: "Alle einschalten", allOff: "Alle ausschalten",
    edit: "Bearbeiten", save: "Speichern", cancel: "Abbrechen", saving: "Speichern…",
    viewOnly: "Zum Bearbeiten die Leitstelle öffnen.",
    instructionTitle: "Geplante Ereignisse und Erinnerungen",
    instructionBody:
      "Dieser Kalender zeigt die eigenen geplanten Ereignisse (blau) und Erinnerungen (bernstein) dieser Automatisierung. Die Einträge stammen aus den Ausgabezeilen — hier wird nichts von Hand angelegt. Für sich allein tut der Kalender genau eines: Er meldet einen fälligen Eintrag, im Takt des Zeitplans.",
    settings: "Kalender-Einstellungen",
    settingsHint: "Woher der Kalender seine Einträge liest, welche Arten er kennt und welche Integrationen er nutzen darf. Alles kommt aus dem Kern — ändere den Kern, ändert sich der Kalender.",
    table: "Speichertabelle", entryType: "Eintragsart", noTypes: "Dieser Kalender deklariert noch keine Eintragsarten.",
  },
  pt: {
    filterAll: "Todos", filterEvents: "Eventos", filterReminders: "Lembretes",
    reminderCountLabel: "lembretes", eventCountLabel: "eventos",
    emptyDay: "Sem entradas nesta data.", emptyAutomation: "Ainda não há itens agendados.",
    loadFailed: "Não foi possível carregar as entradas do calendário.",
    typeEvent: "evento", typeReminder: "lembrete",
    prevMonth: "Mês anterior", nextMonth: "Próximo mês", pickDate: "Escolha uma data",
    acknowledge: "Certo, eu percebi", notifyBefore: "Avisar", minutes: "min",
    atTheMoment: "no próprio momento",
    noSchedule: "O agendamento está desligado — nada é vigiado nem lembrado.",
    keysMissing: "chaves não definidas — clique para ligar",
    integrations: "Integrações",
    integrationsHint: "Para onde este evento também pode ser enviado. Declarado no núcleo; o que sai exatamente escreve-se em cada entrada.",
    noIntegrations: "Esta entrada não tem integrações ligadas.",
    active: "Ativa", allOn: "Ligar todas", allOff: "Desligar todas",
    edit: "Editar", save: "Guardar", cancel: "Cancelar", saving: "A guardar…",
    viewOnly: "Abra a sala de controlo para editar.",
    instructionTitle: "Eventos e lembretes agendados",
    instructionBody:
      "Este calendário mostra os próprios eventos agendados (azul) e lembretes (âmbar) desta automação. As entradas vêm das linhas de saída — aqui nada é criado à mão. Por si só o calendário faz exatamente uma coisa: lança um aviso quando uma entrada chega, no ritmo do agendamento.",
    settings: "Definições do calendário",
    settingsHint: "De onde o calendário lê as entradas, que tipos conhece e que integrações pode usar. Tudo vem do núcleo — muda o núcleo, muda o calendário.",
    table: "Tabela de armazenamento", entryType: "Tipo de entrada", noTypes: "Este calendário ainda não declara tipos de entrada.",
  },
  pl: {
    filterAll: "Wszystkie", filterEvents: "Zdarzenia", filterReminders: "Przypomnienia",
    reminderCountLabel: "przypomnień", eventCountLabel: "zdarzeń",
    emptyDay: "Brak wpisów na tę datę.", emptyAutomation: "Nie ma jeszcze zaplanowanych wpisów.",
    loadFailed: "Nie udało się wczytać wpisów kalendarza.",
    typeEvent: "zdarzenie", typeReminder: "przypomnienie",
    prevMonth: "Poprzedni miesiąc", nextMonth: "Następny miesiąc", pickDate: "Wybierz datę",
    acknowledge: "Dobrze, rozumiem", notifyBefore: "Ostrzeż na", minutes: "min",
    atTheMoment: "dokładnie w tym momencie",
    noSchedule: "Harmonogram jest wyłączony — nic nie jest pilnowane ani przypominane.",
    keysMissing: "brak kluczy — kliknij, aby podłączyć",
    integrations: "Integracje",
    integrationsHint: "Dokąd to zdarzenie może jeszcze trafić. Zadeklarowane w rdzeniu; co dokładnie wychodzi, zapisuje się przy wpisie.",
    noIntegrations: "Ten wpis nie ma podłączonych integracji.",
    active: "Aktywna", allOn: "Włącz wszystkie", allOff: "Wyłącz wszystkie",
    edit: "Edytuj", save: "Zapisz", cancel: "Anuluj", saving: "Zapisywanie…",
    viewOnly: "Aby edytować, otwórz panel sterowania.",
    instructionTitle: "Zaplanowane zdarzenia i przypomnienia",
    instructionBody:
      "Ten kalendarz pokazuje własne zaplanowane zdarzenia (niebieski) i przypomnienia (bursztynowy) tej automatyzacji. Wpisy pochodzą z wierszy wyjściowych — nic nie tworzy się tu ręcznie. Sam z siebie kalendarz robi dokładnie jedno: podnosi powiadomienie, gdy wpis nadchodzi, w rytmie harmonogramu.",
    settings: "Ustawienia kalendarza",
    settingsHint: "Skąd kalendarz czyta wpisy, jakie rodzaje zna i jakich integracji może użyć. Wszystko pochodzi z rdzenia — zmień rdzeń, zmieni się kalendarz.",
    table: "Tabela magazynu", entryType: "Rodzaj wpisu", noTypes: "Ten kalendarz nie deklaruje jeszcze rodzajów wpisów.",
  },
  tr: {
    filterAll: "Tümü", filterEvents: "Etkinlikler", filterReminders: "Hatırlatıcılar",
    reminderCountLabel: "hatırlatıcı", eventCountLabel: "etkinlik",
    emptyDay: "Bu tarihte kayıt yok.", emptyAutomation: "Henüz zamanlanmış öğe yok.",
    loadFailed: "Takvim kayıtları yüklenemedi.",
    typeEvent: "etkinlik", typeReminder: "hatırlatıcı",
    prevMonth: "Önceki ay", nextMonth: "Sonraki ay", pickDate: "Bir tarih seçin",
    acknowledge: "Tamam, anladım", notifyBefore: "Şu kadar önce uyar", minutes: "dk",
    atTheMoment: "tam o anda",
    noSchedule: "Zamanlama kapalı — hiçbir şey izlenmiyor ve hatırlatılmıyor.",
    keysMissing: "anahtarlar girilmedi — bağlamak için tıklayın",
    integrations: "Entegrasyonlar",
    integrationsHint: "Bu etkinliğin ayrıca nereye gönderilebileceği. Çekirdekte tanımlanır; tam olarak ne gittiği her kayıtta yazılır.",
    noIntegrations: "Bu kaydın bağlı entegrasyonu yok.",
    active: "Etkin", allOn: "Hepsini aç", allOff: "Hepsini kapat",
    edit: "Düzenle", save: "Kaydet", cancel: "İptal", saving: "Kaydediliyor…",
    viewOnly: "Düzenlemek için kontrol odasını açın.",
    instructionTitle: "Zamanlanmış etkinlikler ve hatırlatıcılar",
    instructionBody:
      "Bu takvim, bu otomasyonun kendi zamanlanmış etkinliklerini (mavi) ve hatırlatıcılarını (kehribar) gösterir. Kayıtlar çıktı satırlarından gelir — burada elle bir şey oluşturulmaz. Takvim tek başına tam olarak tek bir şey yapar: zamanı gelen kaydı, zamanlama ritminde bildirir.",
    settings: "Takvim ayarları",
    settingsHint: "Takvimin kayıtlarını nereden okuduğu, hangi türleri tanıdığı ve hangi entegrasyonları kullanabileceği. Hepsi çekirdekten gelir — çekirdeği değiştir, takvim değişir.",
    table: "Depolama tablosu", entryType: "Kayıt türü", noTypes: "Bu takvim henüz kayıt türü tanımlamıyor.",
  },
  nl: {
    filterAll: "Alle", filterEvents: "Gebeurtenissen", filterReminders: "Herinneringen",
    reminderCountLabel: "herinneringen", eventCountLabel: "gebeurtenissen",
    emptyDay: "Geen items op deze datum.", emptyAutomation: "Nog geen geplande items.",
    loadFailed: "De agenda-items konden niet worden geladen.",
    typeEvent: "gebeurtenis", typeReminder: "herinnering",
    prevMonth: "Vorige maand", nextMonth: "Volgende maand", pickDate: "Kies een datum",
    acknowledge: "Oké, ik begrijp het", notifyBefore: "Waarschuw", minutes: "min",
    atTheMoment: "op het moment zelf",
    noSchedule: "De planning staat uit — er wordt niets bewaakt en nergens aan herinnerd.",
    keysMissing: "sleutels niet ingesteld — klik om te verbinden",
    integrations: "Integraties",
    integrationsHint: "Waar deze gebeurtenis ook heen kan. Gedeclareerd in de kern; wat er precies uitgaat staat bij elk item.",
    noIntegrations: "Dit item heeft geen integraties gekoppeld.",
    active: "Actief", allOn: "Alle aan", allOff: "Alle uit",
    edit: "Bewerken", save: "Opslaan", cancel: "Annuleren", saving: "Opslaan…",
    viewOnly: "Open de regelkamer om dit te bewerken.",
    instructionTitle: "Geplande gebeurtenissen en herinneringen",
    instructionBody:
      "Deze kalender toont de eigen geplande gebeurtenissen (blauw) en herinneringen (amber) van deze automatisering. De items komen uit de uitvoerrijen — hier wordt niets met de hand aangemaakt. Op zichzelf doet de kalender precies één ding: hij meldt een item zodra het aan de beurt is, op het ritme van de planning.",
    settings: "Kalenderinstellingen",
    settingsHint: "Waar de kalender zijn items leest, welke soorten hij kent en welke integraties hij mag gebruiken. Alles komt uit de kern — verander de kern en de kalender verandert mee.",
    table: "Opslagtabel", entryType: "Soort item", noTypes: "Deze kalender declareert nog geen soorten items.",
  },
};

export const calendarStrings = (lang: string): CalendarStrings => CALENDAR_I18N[lang.slice(0, 2)] ?? CALENDAR_I18N.en;
