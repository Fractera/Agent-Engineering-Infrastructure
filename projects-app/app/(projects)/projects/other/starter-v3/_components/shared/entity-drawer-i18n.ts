// СЛОВАРЬ ЯЩИКА СУЩНОСТИ — десять языков (правило 4г), англ. фолбэк. Живёт в папке (закон 0).
//
// Подписи складов взяты ДОСЛОВНО из колонок ядра (`entity.data.columns` базы, карты и хранилища):
// одна и та же сущность не может называться в таблице одним словом, а в ящике другим.
export type DrawerStrings = {
  entity: string; // заголовок, когда у строки нет имени
  noRecord: string; // журнальная строка: связанной записи нет
  nothing: string; // связей нет вовсе
  summary: string;
  added: string;
  storage: string;
  vectorMemory: string;
  map: string;
  calendar: string;
  database: string;
  loading: string;
};

export const DRAWER_I18N: Record<string, DrawerStrings> = {
  en: { entity: "Entity", noRecord: "No linked record: this is a run-journal row.", nothing: "Nothing linked yet.", summary: "Summary", added: "Added", storage: "Storage", vectorMemory: "Vectors", map: "Map", calendar: "Calendar", database: "Record", loading: "Loading…" },
  es: { entity: "Entidad", noRecord: "Sin registro vinculado: es una fila del diario de ejecución.", nothing: "Aún no hay vínculos.", summary: "Resumen", added: "Añadido", storage: "Almacenamiento", vectorMemory: "Vectores", map: "Mapa", calendar: "Calendario", database: "Registro", loading: "Cargando…" },
  fr: { entity: "Entité", noRecord: "Aucun enregistrement lié : c'est une ligne du journal d'exécution.", nothing: "Aucun lien pour l'instant.", summary: "Résumé", added: "Ajouté", storage: "Stockage", vectorMemory: "Vecteurs", map: "Carte", calendar: "Agenda", database: "Enregistrement", loading: "Chargement…" },
  it: { entity: "Entità", noRecord: "Nessun record collegato: è una riga del diario di esecuzione.", nothing: "Ancora nessun collegamento.", summary: "Sintesi", added: "Aggiunto", storage: "Archivio", vectorMemory: "Vettori", map: "Mappa", calendar: "Calendario", database: "Record", loading: "Caricamento…" },
  ru: { entity: "Сущность", noRecord: "Связанной записи нет: это строка журнала прогона.", nothing: "Связей пока нет.", summary: "Сводка", added: "Добавлено", storage: "Хранилище", vectorMemory: "Векторы", map: "Карта", calendar: "Календарь", database: "Запись", loading: "Загружаю…" },
  de: { entity: "Entität", noRecord: "Kein verknüpfter Datensatz: das ist eine Zeile des Laufprotokolls.", nothing: "Noch keine Verknüpfungen.", summary: "Kurzfassung", added: "Hinzugefügt", storage: "Speicher", vectorMemory: "Vektoren", map: "Karte", calendar: "Kalender", database: "Datensatz", loading: "Lädt…" },
  pt: { entity: "Entidade", noRecord: "Sem registo ligado: é uma linha do diário de execução.", nothing: "Ainda não há ligações.", summary: "Resumo", added: "Adicionado", storage: "Armazenamento", vectorMemory: "Vetores", map: "Mapa", calendar: "Calendário", database: "Registo", loading: "A carregar…" },
  pl: { entity: "Encja", noRecord: "Brak powiązanego rekordu: to wiersz dziennika przebiegu.", nothing: "Brak powiązań.", summary: "Podsumowanie", added: "Dodano", storage: "Magazyn", vectorMemory: "Wektory", map: "Mapa", calendar: "Kalendarz", database: "Rekord", loading: "Ładowanie…" },
  tr: { entity: "Varlık", noRecord: "Bağlı kayıt yok: bu bir çalışma günlüğü satırı.", nothing: "Henüz bağlantı yok.", summary: "Özet", added: "Eklendi", storage: "Depo", vectorMemory: "Vektörler", map: "Harita", calendar: "Takvim", database: "Kayıt", loading: "Yükleniyor…" },
  nl: { entity: "Entiteit", noRecord: "Geen gekoppeld record: dit is een rij uit het uitvoeringslogboek.", nothing: "Nog geen koppelingen.", summary: "Samenvatting", added: "Toegevoegd", storage: "Opslag", vectorMemory: "Vectoren", map: "Kaart", calendar: "Agenda", database: "Record", loading: "Laden…" },
};

export function drawerStrings(lang: string): DrawerStrings {
  return DRAWER_I18N[lang] ?? DRAWER_I18N.en;
}
