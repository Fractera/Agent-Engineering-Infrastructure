// СЛОВАРЬ ВКЛАДКИ «КАРТА» — десять языков (правило 4г), англ. фолбэк. Строки живут в папке (закон 0).
// Здесь только строки СПИСКА МЕТОК: подписи колонок приходят из ядра (`entity.data.columns`), а строки
// самого планировщика маршрута — в `public/components/courier-i18n.ts`.
//
// `copy` · `page` · `of` перенесены ДОСЛОВНО из словаря вкладки базы (`_components/database/i18n.ts`):
// у одинакового интерфейса таблиц одинаковые подписи, переводы не сочиняются заново.
export type MapStrings = {
  markers: string; // заголовок списка меток под картой
  copy: string; // подсказка копирования идентификатора
  page: string; // подпись пагинации: «Страница»
  of: string; // подпись пагинации: «из»
  empty: string; // меток ещё нет
};

export const MAP_I18N: Record<string, MapStrings> = {
  en: { markers: "Markers", copy: "Copy", page: "Page", of: "of", empty: "No markers yet." },
  es: { markers: "Marcadores", copy: "Copiar", page: "Página", of: "de", empty: "Aún no hay marcadores." },
  fr: { markers: "Repères", copy: "Copier", page: "Page", of: "sur", empty: "Aucun repère pour l'instant." },
  it: { markers: "Segnaposti", copy: "Copia", page: "Pagina", of: "di", empty: "Ancora nessun segnaposto." },
  ru: { markers: "Метки", copy: "Копировать", page: "Страница", of: "из", empty: "Пока нет меток." },
  de: { markers: "Markierungen", copy: "Kopieren", page: "Seite", of: "von", empty: "Noch keine Markierungen." },
  pt: { markers: "Marcadores", copy: "Copiar", page: "Página", of: "de", empty: "Ainda não há marcadores." },
  pl: { markers: "Znaczniki", copy: "Kopiuj", page: "Strona", of: "z", empty: "Brak znaczników." },
  tr: { markers: "İşaretler", copy: "Kopyala", page: "Sayfa", of: "/", empty: "Henüz işaret yok." },
  nl: { markers: "Markeringen", copy: "Kopiëren", page: "Pagina", of: "van", empty: "Nog geen markeringen." },
};

export function mapStrings(lang: string): MapStrings {
  return MAP_I18N[lang] ?? MAP_I18N.en;
}
