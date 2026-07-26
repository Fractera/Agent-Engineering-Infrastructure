// СЛОВАРЬ РАСПИСАНИЯ — десять языков (закон 4г), англ. фолбэк. Живёт в папке вкладки (закон 0).
export type CronStrings = {
  every: string; // "{n}" — раз в сколько минут
  minutes: string;
  nextIn: string; // "{n}" — до следующей проверки
  running: string;
  paused: string;
  settings: string;
  settingsHint: string;
  enabled: string;
  period: string;
  saving: string;
};

export const CRON_I18N: Record<string, CronStrings> = {
  en: { every: "Every {n} min", minutes: "min", nextIn: "next check in {n}s", running: "The schedule is running.", paused: "The schedule is off — nothing is checked and no reminder is raised.", settings: "Schedule settings", settingsHint: "How often the automation looks back at itself. The calendar raises its reminders on exactly this beat.", enabled: "Schedule on", period: "Check every", saving: "Saving…" },
  es: { every: "Cada {n} min", minutes: "min", nextIn: "próxima comprobación en {n}s", running: "La programación está activa.", paused: "La programación está apagada: no se comprueba nada ni se avisa de nada.", settings: "Ajustes de la programación", settingsHint: "Cada cuánto la automatización se revisa a sí misma. El calendario lanza sus avisos justo a este ritmo.", enabled: "Programación activa", period: "Comprobar cada", saving: "Guardando…" },
  fr: { every: "Toutes les {n} min", minutes: "min", nextIn: "prochaine vérification dans {n}s", running: "La planification est active.", paused: "La planification est arrêtée : rien n'est vérifié et aucun rappel n'est levé.", settings: "Réglages de la planification", settingsHint: "À quelle fréquence l'automatisation se relit. Le calendrier lève ses rappels exactement à ce rythme.", enabled: "Planification active", period: "Vérifier toutes les", saving: "Enregistrement…" },
  it: { every: "Ogni {n} min", minutes: "min", nextIn: "prossimo controllo tra {n}s", running: "La pianificazione è attiva.", paused: "La pianificazione è spenta: non si controlla nulla e non arriva alcun promemoria.", settings: "Impostazioni della pianificazione", settingsHint: "Ogni quanto l'automazione si ricontrolla. Il calendario lancia i promemoria esattamente a questo ritmo.", enabled: "Pianificazione attiva", period: "Controlla ogni", saving: "Salvataggio…" },
  ru: { every: "Раз в {n} мин", minutes: "мин", nextIn: "следующая проверка через {n} с", running: "Расписание работает.", paused: "Расписание выключено — ничего не проверяется и ни о чём не напоминает.", settings: "Настройка расписания", settingsHint: "Как часто автоматизация оглядывается на саму себя. Календарь напоминает ровно в этом такте.", enabled: "Расписание включено", period: "Проверять раз в", saving: "Сохраняю…" },
  de: { every: "Alle {n} Min", minutes: "Min", nextIn: "nächste Prüfung in {n}s", running: "Der Zeitplan läuft.", paused: "Der Zeitplan ist aus — es wird nichts geprüft und an nichts erinnert.", settings: "Zeitplan-Einstellungen", settingsHint: "Wie oft die Automatisierung sich selbst prüft. Der Kalender erinnert genau in diesem Takt.", enabled: "Zeitplan an", period: "Prüfen alle", saving: "Speichern…" },
  pt: { every: "A cada {n} min", minutes: "min", nextIn: "próxima verificação em {n}s", running: "O agendamento está a correr.", paused: "O agendamento está desligado — nada é verificado nem lembrado.", settings: "Definições do agendamento", settingsHint: "Com que frequência a automação se revê. O calendário lança os lembretes exatamente neste ritmo.", enabled: "Agendamento ligado", period: "Verificar a cada", saving: "A guardar…" },
  pl: { every: "Co {n} min", minutes: "min", nextIn: "następne sprawdzenie za {n}s", running: "Harmonogram działa.", paused: "Harmonogram jest wyłączony — nic nie jest sprawdzane ani przypominane.", settings: "Ustawienia harmonogramu", settingsHint: "Jak często automatyzacja sprawdza samą siebie. Kalendarz przypomina dokładnie w tym rytmie.", enabled: "Harmonogram włączony", period: "Sprawdzaj co", saving: "Zapisywanie…" },
  tr: { every: "Her {n} dk", minutes: "dk", nextIn: "sonraki kontrol {n} sn içinde", running: "Zamanlama çalışıyor.", paused: "Zamanlama kapalı — hiçbir şey denetlenmiyor ve hatırlatılmıyor.", settings: "Zamanlama ayarları", settingsHint: "Otomasyonun kendini ne sıklıkla gözden geçirdiği. Takvim tam bu ritimde hatırlatır.", enabled: "Zamanlama açık", period: "Şu sıklıkta denetle", saving: "Kaydediliyor…" },
  nl: { every: "Elke {n} min", minutes: "min", nextIn: "volgende controle over {n}s", running: "De planning loopt.", paused: "De planning staat uit — er wordt niets gecontroleerd en nergens aan herinnerd.", settings: "Planningsinstellingen", settingsHint: "Hoe vaak de automatisering zichzelf nakijkt. De kalender herinnert precies op dit ritme.", enabled: "Planning aan", period: "Controleer elke", saving: "Opslaan…" },
};

export const cronStrings = (lang: string): CronStrings => CRON_I18N[lang.slice(0, 2)] ?? CRON_I18N.en;
