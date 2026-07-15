// TEN-LANGUAGE UI for the "Cron" accordion (step: Cron entity, CLAUDE.md rule 4г) — en, es, fr, it, ru, de,
// pt, pl, tr, nl; anything else -> English. This is OUR own default content (the accordion chrome), not a
// real automation's — resolved at render time like every other *-i18n.ts dictionary.

export type CronStrings = {
  description: string;
  enabledLabel: string;
  statusOn: string;
  statusOff: string;
  intervalLabel: string;
  everyMinute: string;
  every5Min: string;
  every15Min: string;
  every30Min: string;
  hourly: string;
  every6h: string;
  every12h: string;
  daily: string;
  loading: string;
  granularityNote: string;
  saved: string;
  saveFailed: string;
  noCronYet: string;
};

const CRON_I18N: Record<string, CronStrings> = {
  en: {
    description:
      "A periodic tick that wakes this automation up on its own — independent of the owner's own requests " +
      "through the ask console (the Hook path). Turn it on and pick how often it checks for scheduled work.",
    enabledLabel: "Scheduled runs",
    statusOn: "On",
    statusOff: "Off",
    intervalLabel: "Interval",
    everyMinute: "Every minute",
    every5Min: "Every 5 minutes",
    every15Min: "Every 15 minutes",
    every30Min: "Every 30 minutes",
    hourly: "Every hour",
    every6h: "Every 6 hours",
    every12h: "Every 12 hours",
    daily: "Once a day",
    loading: "Loading…",
    granularityNote: "The shortest interval is one minute (the scheduler's own granularity).",
    saved: "Schedule updated",
    saveFailed: "Could not update the schedule",
    noCronYet: "This automation has no schedule declared yet.",
  },
  ru: {
    description:
      "Периодический тик, который сам будит эту автоматизацию — независимо от запросов владельца через " +
      "консоль «Спросить» (путь Hook). Включите и выберите, как часто проверять запланированную работу.",
    enabledLabel: "Запуск по расписанию",
    statusOn: "Включено",
    statusOff: "Выключено",
    intervalLabel: "Периодичность",
    everyMinute: "Каждую минуту",
    every5Min: "Каждые 5 минут",
    every15Min: "Каждые 15 минут",
    every30Min: "Каждые 30 минут",
    hourly: "Каждый час",
    every6h: "Каждые 6 часов",
    every12h: "Каждые 12 часов",
    daily: "Раз в день",
    loading: "Загрузка…",
    granularityNote: "Минимальный интервал — одна минута (ограничение самого планировщика).",
    saved: "Расписание обновлено",
    saveFailed: "Не удалось обновить расписание",
    noCronYet: "У этой автоматизации ещё не объявлено расписание.",
  },
  es: {
    description:
      "Un tic periódico que activa esta automatización por sí sola — independientemente de las solicitudes " +
      "del propietario a través de la consola de preguntas (la ruta Hook). Actívalo y elige la frecuencia.",
    enabledLabel: "Ejecuciones programadas",
    statusOn: "Activado",
    statusOff: "Desactivado",
    intervalLabel: "Intervalo",
    everyMinute: "Cada minuto",
    every5Min: "Cada 5 minutos",
    every15Min: "Cada 15 minutos",
    every30Min: "Cada 30 minutos",
    hourly: "Cada hora",
    every6h: "Cada 6 horas",
    every12h: "Cada 12 horas",
    daily: "Una vez al día",
    loading: "Cargando…",
    granularityNote: "El intervalo más corto es un minuto (granularidad propia del planificador).",
    saved: "Horario actualizado",
    saveFailed: "No se pudo actualizar el horario",
    noCronYet: "Esta automatización aún no tiene un horario declarado.",
  },
  fr: {
    description:
      "Un tic périodique qui réveille cette automatisation par elle-même — indépendamment des demandes du " +
      "propriétaire via la console de question (le chemin Hook). Activez-le et choisissez la fréquence.",
    enabledLabel: "Exécutions planifiées",
    statusOn: "Activé",
    statusOff: "Désactivé",
    intervalLabel: "Intervalle",
    everyMinute: "Toutes les minutes",
    every5Min: "Toutes les 5 minutes",
    every15Min: "Toutes les 15 minutes",
    every30Min: "Toutes les 30 minutes",
    hourly: "Toutes les heures",
    every6h: "Toutes les 6 heures",
    every12h: "Toutes les 12 heures",
    daily: "Une fois par jour",
    loading: "Chargement…",
    granularityNote: "L'intervalle le plus court est une minute (granularité propre au planificateur).",
    saved: "Planification mise à jour",
    saveFailed: "Impossible de mettre à jour la planification",
    noCronYet: "Cette automatisation n'a pas encore de planification déclarée.",
  },
  it: {
    description:
      "Un tick periodico che risveglia questa automazione da sola — indipendentemente dalle richieste del " +
      "proprietario tramite la console di richiesta (il percorso Hook). Attivalo e scegli la frequenza.",
    enabledLabel: "Esecuzioni pianificate",
    statusOn: "Attivo",
    statusOff: "Disattivo",
    intervalLabel: "Intervallo",
    everyMinute: "Ogni minuto",
    every5Min: "Ogni 5 minuti",
    every15Min: "Ogni 15 minuti",
    every30Min: "Ogni 30 minuti",
    hourly: "Ogni ora",
    every6h: "Ogni 6 ore",
    every12h: "Ogni 12 ore",
    daily: "Una volta al giorno",
    loading: "Caricamento…",
    granularityNote: "L'intervallo più breve è un minuto (granularità propria dello scheduler).",
    saved: "Pianificazione aggiornata",
    saveFailed: "Impossibile aggiornare la pianificazione",
    noCronYet: "Questa automazione non ha ancora una pianificazione dichiarata.",
  },
  de: {
    description:
      "Ein periodischer Takt, der diese Automatisierung von selbst weckt — unabhängig von den Anfragen des " +
      "Besitzers über die Frage-Konsole (den Hook-Pfad). Aktivieren Sie ihn und wählen Sie die Häufigkeit.",
    enabledLabel: "Geplante Läufe",
    statusOn: "Ein",
    statusOff: "Aus",
    intervalLabel: "Intervall",
    everyMinute: "Jede Minute",
    every5Min: "Alle 5 Minuten",
    every15Min: "Alle 15 Minuten",
    every30Min: "Alle 30 Minuten",
    hourly: "Stündlich",
    every6h: "Alle 6 Stunden",
    every12h: "Alle 12 Stunden",
    daily: "Einmal täglich",
    loading: "Wird geladen…",
    granularityNote: "Das kürzeste Intervall ist eine Minute (eigene Granularität des Schedulers).",
    saved: "Zeitplan aktualisiert",
    saveFailed: "Zeitplan konnte nicht aktualisiert werden",
    noCronYet: "Für diese Automatisierung ist noch kein Zeitplan deklariert.",
  },
  pt: {
    description:
      "Um tique periódico que ativa esta automação por conta própria — independentemente dos pedidos do " +
      "proprietário através do console de perguntas (o caminho Hook). Ative-o e escolha a frequência.",
    enabledLabel: "Execuções agendadas",
    statusOn: "Ativado",
    statusOff: "Desativado",
    intervalLabel: "Intervalo",
    everyMinute: "A cada minuto",
    every5Min: "A cada 5 minutos",
    every15Min: "A cada 15 minutos",
    every30Min: "A cada 30 minutos",
    hourly: "A cada hora",
    every6h: "A cada 6 horas",
    every12h: "A cada 12 horas",
    daily: "Uma vez por dia",
    loading: "Carregando…",
    granularityNote: "O intervalo mais curto é um minuto (granularidade própria do agendador).",
    saved: "Agendamento atualizado",
    saveFailed: "Não foi possível atualizar o agendamento",
    noCronYet: "Esta automação ainda não tem um agendamento declarado.",
  },
  pl: {
    description:
      "Okresowy sygnał, który sam wybudza tę automatyzację — niezależnie od żądań właściciela przez konsolę " +
      "pytań (ścieżkę Hook). Włącz go i wybierz, jak często sprawdzać zaplanowaną pracę.",
    enabledLabel: "Uruchomienia zaplanowane",
    statusOn: "Włączone",
    statusOff: "Wyłączone",
    intervalLabel: "Odstęp",
    everyMinute: "Co minutę",
    every5Min: "Co 5 minut",
    every15Min: "Co 15 minut",
    every30Min: "Co 30 minut",
    hourly: "Co godzinę",
    every6h: "Co 6 godzin",
    every12h: "Co 12 godzin",
    daily: "Raz dziennie",
    loading: "Wczytywanie…",
    granularityNote: "Najkrótszy odstęp to jedna minuta (własna granulacja harmonogramu).",
    saved: "Harmonogram zaktualizowany",
    saveFailed: "Nie udało się zaktualizować harmonogramu",
    noCronYet: "Ta automatyzacja nie ma jeszcze zadeklarowanego harmonogramu.",
  },
  tr: {
    description:
      "Bu otomasyonu kendi başına uyandıran periyodik bir tik — sahibinin soru konsolu (Hook yolu) " +
      "üzerinden yaptığı isteklerden bağımsız olarak. Açın ve ne sıklıkta kontrol edileceğini seçin.",
    enabledLabel: "Zamanlanmış çalıştırmalar",
    statusOn: "Açık",
    statusOff: "Kapalı",
    intervalLabel: "Aralık",
    everyMinute: "Her dakika",
    every5Min: "Her 5 dakikada bir",
    every15Min: "Her 15 dakikada bir",
    every30Min: "Her 30 dakikada bir",
    hourly: "Her saat",
    every6h: "Her 6 saatte bir",
    every12h: "Her 12 saatte bir",
    daily: "Günde bir kez",
    loading: "Yükleniyor…",
    granularityNote: "En kısa aralık bir dakikadır (zamanlayıcının kendi ayrıntı düzeyi).",
    saved: "Zamanlama güncellendi",
    saveFailed: "Zamanlama güncellenemedi",
    noCronYet: "Bu otomasyon için henüz bir zamanlama tanımlanmadı.",
  },
  nl: {
    description:
      "Een periodieke tik die deze automatisering zelfstandig wekt — onafhankelijk van de verzoeken van de " +
      "eigenaar via de vraagconsole (het Hook-pad). Zet hem aan en kies hoe vaak er wordt gecontroleerd.",
    enabledLabel: "Geplande uitvoeringen",
    statusOn: "Aan",
    statusOff: "Uit",
    intervalLabel: "Interval",
    everyMinute: "Elke minuut",
    every5Min: "Elke 5 minuten",
    every15Min: "Elke 15 minuten",
    every30Min: "Elke 30 minuten",
    hourly: "Elk uur",
    every6h: "Elke 6 uur",
    every12h: "Elke 12 uur",
    daily: "Eenmaal per dag",
    loading: "Laden…",
    granularityNote: "Het kortste interval is één minuut (eigen granulariteit van de planner).",
    saved: "Schema bijgewerkt",
    saveFailed: "Kon het schema niet bijwerken",
    noCronYet: "Voor deze automatisering is nog geen schema gedeclareerd.",
  },
};

export function cronStrings(lang: string): CronStrings {
  return CRON_I18N[lang.slice(0, 2)] ?? CRON_I18N.en;
}
