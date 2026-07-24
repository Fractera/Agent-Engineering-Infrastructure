// СЛОВАРЬ АНАЛИТИКИ — десять языков (закон 4г), англ. фолбэк. Живёт в папке вкладки (закон 0).
// Названия дней недели НЕ здесь — их даёт `Intl.DateTimeFormat(lang, {weekday})` из языка страницы,
// поэтому переводить нечего: это данные календаря, а не строка интерфейса.
export type AnalyticsStrings = {
  requestsTitle: string; // «Запросов в день»
  valueTitle: string; // «Стоимость акций за день»
  empty: string; // записей ещё нет
  requestsUnit: string; // подпись значения графика запросов (напр. «запр.»)
};

const I18N: Record<string, AnalyticsStrings> = {
  en: { requestsTitle: "Requests per day", valueTitle: "Stock value per day", empty: "No data yet — the charts fill as the automation is used.", requestsUnit: "req." },
  ru: { requestsTitle: "Запросов в день", valueTitle: "Стоимость акций за день", empty: "Данных пока нет — графики наполняются по мере работы автоматизации.", requestsUnit: "запр." },
  es: { requestsTitle: "Solicitudes por día", valueTitle: "Valor de acciones por día", empty: "Aún no hay datos — los gráficos se llenan a medida que se usa la automatización.", requestsUnit: "sol." },
  fr: { requestsTitle: "Requêtes par jour", valueTitle: "Valeur des actions par jour", empty: "Pas encore de données — les graphiques se remplissent à l'usage de l'automatisation.", requestsUnit: "req." },
  it: { requestsTitle: "Richieste al giorno", valueTitle: "Valore delle azioni al giorno", empty: "Ancora nessun dato — i grafici si riempiono man mano che l'automazione viene usata.", requestsUnit: "ric." },
  de: { requestsTitle: "Anfragen pro Tag", valueTitle: "Aktienwert pro Tag", empty: "Noch keine Daten — die Diagramme füllen sich mit der Nutzung der Automatisierung.", requestsUnit: "Anfr." },
  pt: { requestsTitle: "Pedidos por dia", valueTitle: "Valor das ações por dia", empty: "Ainda sem dados — os gráficos preenchem-se à medida que a automação é usada.", requestsUnit: "ped." },
  pl: { requestsTitle: "Zapytania na dzień", valueTitle: "Wartość akcji na dzień", empty: "Brak danych — wykresy wypełniają się w miarę używania automatyzacji.", requestsUnit: "zap." },
  tr: { requestsTitle: "Günlük istek sayısı", valueTitle: "Günlük hisse değeri", empty: "Henüz veri yok — otomasyon kullanıldıkça grafikler dolar.", requestsUnit: "istek" },
  nl: { requestsTitle: "Verzoeken per dag", valueTitle: "Aandelenwaarde per dag", empty: "Nog geen gegevens — de grafieken vullen zich naarmate de automatisering wordt gebruikt.", requestsUnit: "verz." },
};

export const analyticsStrings = (lang: string): AnalyticsStrings =>
  I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
