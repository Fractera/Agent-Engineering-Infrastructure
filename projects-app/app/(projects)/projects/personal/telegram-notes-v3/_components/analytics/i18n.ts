// СЛОВАРЬ АНАЛИТИКИ — десять языков (закон 4г), англ. фолбэк. Живёт в папке вкладки (закон 0).
// Названия дней недели НЕ здесь — их даёт `Intl.DateTimeFormat(lang, {weekday})` из языка страницы,
// поэтому переводить нечего: это данные календаря, а не строка интерфейса.
export type AnalyticsStrings = {
  requestsTitle: string; // «Сообщений в день»
  valueTitle: string; // «Объём текста в день»
  empty: string; // записей ещё нет
  requestsUnit: string; // подпись значения графика сообщений (напр. «сообщ.»)
};

const I18N: Record<string, AnalyticsStrings> = {
  en: { requestsTitle: "Messages per day", valueTitle: "Text volume per day", empty: "No data yet — the charts fill as the automation is used.", requestsUnit: "msg." },
  ru: { requestsTitle: "Сообщений в день", valueTitle: "Объём текста в день", empty: "Данных пока нет — графики наполняются по мере работы автоматизации.", requestsUnit: "сообщ." },
  es: { requestsTitle: "Mensajes por día", valueTitle: "Volumen de texto por día", empty: "Aún no hay datos — los gráficos se llenan a medida que se usa la automatización.", requestsUnit: "msj." },
  fr: { requestsTitle: "Messages par jour", valueTitle: "Volume de texte par jour", empty: "Pas encore de données — les graphiques se remplissent à l'usage de l'automatisation.", requestsUnit: "msg." },
  it: { requestsTitle: "Messaggi al giorno", valueTitle: "Volume di testo al giorno", empty: "Ancora nessun dato — i grafici si riempiono man mano che l'automazione viene usata.", requestsUnit: "msg." },
  de: { requestsTitle: "Nachrichten pro Tag", valueTitle: "Textvolumen pro Tag", empty: "Noch keine Daten — die Diagramme füllen sich mit der Nutzung der Automatisierung.", requestsUnit: "Nachr." },
  pt: { requestsTitle: "Mensagens por dia", valueTitle: "Volume de texto por dia", empty: "Ainda sem dados — os gráficos preenchem-se à medida que a automação é usada.", requestsUnit: "msg." },
  pl: { requestsTitle: "Wiadomości dziennie", valueTitle: "Objętość tekstu dziennie", empty: "Brak danych — wykresy wypełniają się w miarę używania automatyzacji.", requestsUnit: "wiad." },
  tr: { requestsTitle: "Günlük mesaj sayısı", valueTitle: "Günlük metin hacmi", empty: "Henüz veri yok — otomasyon kullanıldıkça grafikler dolar.", requestsUnit: "mesaj" },
  nl: { requestsTitle: "Berichten per dag", valueTitle: "Tekstvolume per dag", empty: "Nog geen gegevens — de grafieken vullen zich naarmate de automatisering wordt gebruikt.", requestsUnit: "ber." },
};

export const analyticsStrings = (lang: string): AnalyticsStrings =>
  I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
