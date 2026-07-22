// СЛОВАРЬ ДАШБОРДА — десять языков (закон 4г), англ. фолбэк. Живёт в папке вкладки (закон 0).
// Подписи интерфейса перенесены из v1 (`automation-menu-i18n` + `dashboard`-сущность): «переноси один-в-один».
export type DashboardStrings = {
  empty: string;
  search: string;
  columns: string;
  twoView: string;
  singleView: string;
  details: string;
  close: string;
  more: string;
  rowsShown: string; // "{n}" из "{total}"
  settings: string;
  settingsHint: string;
  columnKey: string;
  table: string;
  noColumns: string;
};

export const DASHBOARD_I18N: Record<string, DashboardStrings> = {
  en: { empty: "No records yet — run a request from the control panel.", search: "Search…", columns: "Columns", twoView: "Two tables", singleView: "One table", details: "Record", close: "Close", more: "Show more", rowsShown: "{n} of {total}", settings: "Table settings", settingsHint: "The columns this table shows. They come from the core — change the core, the table changes.", columnKey: "Column", table: "Storage table", noColumns: "This table declares no columns yet." },
  es: { empty: "Aún no hay registros: lanza una consulta desde el panel.", search: "Buscar…", columns: "Columnas", twoView: "Dos tablas", singleView: "Una tabla", details: "Registro", close: "Cerrar", more: "Mostrar más", rowsShown: "{n} de {total}", settings: "Ajustes de la tabla", settingsHint: "Las columnas que muestra esta tabla vienen del núcleo: cambia el núcleo y cambia la tabla.", columnKey: "Columna", table: "Tabla de almacenamiento", noColumns: "Esta tabla aún no declara columnas." },
  fr: { empty: "Aucun enregistrement — lancez une demande depuis le panneau.", search: "Rechercher…", columns: "Colonnes", twoView: "Deux tableaux", singleView: "Un tableau", details: "Enregistrement", close: "Fermer", more: "Afficher plus", rowsShown: "{n} sur {total}", settings: "Réglages du tableau", settingsHint: "Les colonnes de ce tableau viennent du noyau : changez le noyau, le tableau change.", columnKey: "Colonne", table: "Table de stockage", noColumns: "Ce tableau ne déclare encore aucune colonne." },
  it: { empty: "Nessun record — avvia una richiesta dal pannello.", search: "Cerca…", columns: "Colonne", twoView: "Due tabelle", singleView: "Una tabella", details: "Record", close: "Chiudi", more: "Mostra altro", rowsShown: "{n} di {total}", settings: "Impostazioni della tabella", settingsHint: "Le colonne di questa tabella vengono dal nucleo: cambia il nucleo e cambia la tabella.", columnKey: "Colonna", table: "Tabella di archiviazione", noColumns: "Questa tabella non dichiara ancora colonne." },
  ru: { empty: "Записей пока нет — запустите запрос из пульта.", search: "Поиск…", columns: "Колонки", twoView: "Две таблицы", singleView: "Одна таблица", details: "Запись", close: "Закрыть", more: "Показать ещё", rowsShown: "{n} из {total}", settings: "Настройка таблицы", settingsHint: "Колонки этой таблицы берутся из ядра — меняется ядро, меняется таблица.", columnKey: "Колонка", table: "Таблица хранилища", noColumns: "Таблица пока не объявила ни одной колонки." },
  de: { empty: "Noch keine Einträge — starte eine Abfrage im Pult.", search: "Suchen…", columns: "Spalten", twoView: "Zwei Tabellen", singleView: "Eine Tabelle", details: "Eintrag", close: "Schließen", more: "Mehr anzeigen", rowsShown: "{n} von {total}", settings: "Tabellen-Einstellungen", settingsHint: "Die Spalten dieser Tabelle kommen aus dem Kern — ändere den Kern, ändert sich die Tabelle.", columnKey: "Spalte", table: "Speichertabelle", noColumns: "Diese Tabelle deklariert noch keine Spalten." },
  pt: { empty: "Ainda sem registos — lance uma consulta no painel.", search: "Procurar…", columns: "Colunas", twoView: "Duas tabelas", singleView: "Uma tabela", details: "Registo", close: "Fechar", more: "Mostrar mais", rowsShown: "{n} de {total}", settings: "Definições da tabela", settingsHint: "As colunas desta tabela vêm do núcleo — muda o núcleo, muda a tabela.", columnKey: "Coluna", table: "Tabela de armazenamento", noColumns: "Esta tabela ainda não declara colunas." },
  pl: { empty: "Brak rekordów — uruchom zapytanie z pulpitu.", search: "Szukaj…", columns: "Kolumny", twoView: "Dwie tabele", singleView: "Jedna tabela", details: "Rekord", close: "Zamknij", more: "Pokaż więcej", rowsShown: "{n} z {total}", settings: "Ustawienia tabeli", settingsHint: "Kolumny tej tabeli pochodzą z rdzenia — zmień rdzeń, zmieni się tabela.", columnKey: "Kolumna", table: "Tabela magazynu", noColumns: "Ta tabela nie deklaruje jeszcze kolumn." },
  tr: { empty: "Henüz kayıt yok — panelden bir sorgu çalıştırın.", search: "Ara…", columns: "Sütunlar", twoView: "İki tablo", singleView: "Tek tablo", details: "Kayıt", close: "Kapat", more: "Daha fazla göster", rowsShown: "{total} kaydın {n} tanesi", settings: "Tablo ayarları", settingsHint: "Bu tablonun sütunları çekirdekten gelir — çekirdeği değiştir, tablo değişir.", columnKey: "Sütun", table: "Depolama tablosu", noColumns: "Bu tablo henüz sütun tanımlamıyor." },
  nl: { empty: "Nog geen records — start een aanvraag vanuit het paneel.", search: "Zoeken…", columns: "Kolommen", twoView: "Twee tabellen", singleView: "Eén tabel", details: "Record", close: "Sluiten", more: "Meer tonen", rowsShown: "{n} van {total}", settings: "Tabelinstellingen", settingsHint: "De kolommen van deze tabel komen uit de kern — verander de kern en de tabel verandert mee.", columnKey: "Kolom", table: "Opslagtabel", noColumns: "Deze tabel declareert nog geen kolommen." },
};

export const dashboardStrings = (lang: string): DashboardStrings => DASHBOARD_I18N[lang.slice(0, 2)] ?? DASHBOARD_I18N.en;
