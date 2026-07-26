// СЛОВАРЬ админ-половины дашборда — десять языков (закон 4г), англ. фолбэк. Дев-слой.
// Строки СКОПИРОВАНЫ ДОСЛОВНО из словаря вкладки (`_components/dashboard/i18n.ts`).
export type DashboardAdminStrings = {
  settings: string;
  settingsHint: string;
  columnKey: string;
  table: string;
  noColumns: string;
  // Строки самой таблицы и контейнера — дословно из словаря вкладки v2 (`_components/dashboard/i18n.ts`).
  empty: string;
  search: string;
  columns: string;
  showColumns: string;
  twoView: string;
  singleView: string;
  details: string;
  close: string;
  more: string;
  demo: string;
  noRecords: string;
  rowDetail: string;
  addRow: string;
  editRow: string;
  save: string;
  clickToEdit: string;
  rowAdded: string;
  rowSaved: string;
  rowDeleted: string;
  addFailed: string;
  saveFailed: string;
  deleteFailed: string;
  demoReadOnly: string;
  readOnlyView: string;
  deleteRow: string;
  clickToExpand: string;
  open: string;
  live: string;
};

const I18N: Record<string, DashboardAdminStrings> = {
  en: { settings: "Table settings", settingsHint: "The columns this table shows. They come from the core — change the core, the table changes.", columnKey: "Column", table: "Storage table", noColumns: "This table declares no columns yet.", empty: "No records yet — run a request from the control panel.", search: "Search…", columns: "Columns", showColumns: "Show columns", twoView: "Two tables", singleView: "One table", details: "Details", close: "Close", more: "Load more", demo: "demo", noRecords: "No records yet.", rowDetail: "Row detail", addRow: "Add row", editRow: "Edit row", save: "Save changes", clickToEdit: "Click to edit this row", rowAdded: "Row added.", rowSaved: "Row saved.", rowDeleted: "Row deleted.", addFailed: "Could not add the row.", saveFailed: "Could not save the row.", deleteFailed: "Could not delete the row.", demoReadOnly: "Demo rows are read-only — add a real row first.", readOnlyView: "Read-only view.", deleteRow: "Delete row", clickToExpand: "Click to expand", open: "Open", live: "Live" },
  ru: { settings: "Настройка таблицы", settingsHint: "Колонки этой таблицы берутся из ядра — меняется ядро, меняется таблица.", columnKey: "Колонка", table: "Таблица хранилища", noColumns: "Таблица пока не объявила ни одной колонки.", empty: "Записей пока нет — запустите запрос из пульта.", search: "Поиск…", columns: "Колонки", showColumns: "Показать колонки", twoView: "Две таблицы", singleView: "Одна таблица", details: "Подробнее", close: "Закрыть", more: "Показать ещё", demo: "демо", noRecords: "Записей пока нет.", rowDetail: "Запись", addRow: "Добавить строку", editRow: "Правка строки", save: "Сохранить", clickToEdit: "Нажмите, чтобы править эту строку", rowAdded: "Строка добавлена.", rowSaved: "Строка сохранена.", rowDeleted: "Строка удалена.", addFailed: "Не удалось добавить строку.", saveFailed: "Не удалось сохранить строку.", deleteFailed: "Не удалось удалить строку.", demoReadOnly: "Демо-строки только для чтения — сначала добавьте настоящую.", readOnlyView: "Только просмотр.", deleteRow: "Удалить строку", clickToExpand: "Нажмите, чтобы развернуть", open: "Открыть", live: "Живое" },
  es: { settings: "Ajustes de la tabla", settingsHint: "Las columnas que muestra esta tabla vienen del núcleo: cambia el núcleo y cambia la tabla.", columnKey: "Columna", table: "Tabla de almacenamiento", noColumns: "Esta tabla aún no declara columnas.", empty: "Aún no hay registros: lanza una consulta desde el panel.", search: "Buscar…", columns: "Columnas", showColumns: "Mostrar columnas", twoView: "Dos tablas", singleView: "Una tabla", details: "Detalles", close: "Cerrar", more: "Mostrar más", demo: "demo", noRecords: "Aún no hay registros.", rowDetail: "Registro", addRow: "Añadir fila", editRow: "Editar fila", save: "Guardar cambios", clickToEdit: "Haz clic para editar esta fila", rowAdded: "Fila añadida.", rowSaved: "Fila guardada.", rowDeleted: "Fila eliminada.", addFailed: "No se pudo añadir la fila.", saveFailed: "No se pudo guardar la fila.", deleteFailed: "No se pudo eliminar la fila.", demoReadOnly: "Las filas demo son de solo lectura: añade una real primero.", readOnlyView: "Solo lectura.", deleteRow: "Eliminar fila", clickToExpand: "Haz clic para expandir", open: "Abrir", live: "En vivo" },
  fr: { settings: "Réglages du tableau", settingsHint: "Les colonnes de ce tableau viennent du noyau : changez le noyau, le tableau change.", columnKey: "Colonne", table: "Table de stockage", noColumns: "Ce tableau ne déclare encore aucune colonne.", empty: "Aucun enregistrement — lancez une demande depuis le panneau.", search: "Rechercher…", columns: "Colonnes", showColumns: "Afficher les colonnes", twoView: "Deux tableaux", singleView: "Un tableau", details: "Détails", close: "Fermer", more: "Afficher plus", demo: "démo", noRecords: "Aucun enregistrement.", rowDetail: "Enregistrement", addRow: "Ajouter une ligne", editRow: "Modifier la ligne", save: "Enregistrer", clickToEdit: "Cliquez pour modifier cette ligne", rowAdded: "Ligne ajoutée.", rowSaved: "Ligne enregistrée.", rowDeleted: "Ligne supprimée.", addFailed: "Impossible d'ajouter la ligne.", saveFailed: "Impossible d'enregistrer la ligne.", deleteFailed: "Impossible de supprimer la ligne.", demoReadOnly: "Les lignes de démo sont en lecture seule — ajoutez d'abord une vraie ligne.", readOnlyView: "Lecture seule.", deleteRow: "Supprimer la ligne", clickToExpand: "Cliquez pour développer", open: "Ouvrir", live: "Direct" },
  it: { settings: "Impostazioni della tabella", settingsHint: "Le colonne di questa tabella vengono dal nucleo: cambia il nucleo e cambia la tabella.", columnKey: "Colonna", table: "Tabella di archiviazione", noColumns: "Questa tabella non dichiara ancora colonne.", empty: "Nessun record — avvia una richiesta dal pannello.", search: "Cerca…", columns: "Colonne", showColumns: "Mostra colonne", twoView: "Due tabelle", singleView: "Una tabella", details: "Dettagli", close: "Chiudi", more: "Mostra altro", demo: "demo", noRecords: "Nessun record.", rowDetail: "Record", addRow: "Aggiungi riga", editRow: "Modifica riga", save: "Salva", clickToEdit: "Clicca per modificare questa riga", rowAdded: "Riga aggiunta.", rowSaved: "Riga salvata.", rowDeleted: "Riga eliminata.", addFailed: "Impossibile aggiungere la riga.", saveFailed: "Impossibile salvare la riga.", deleteFailed: "Impossibile eliminare la riga.", demoReadOnly: "Le righe demo sono in sola lettura — aggiungi prima una riga reale.", readOnlyView: "Sola lettura.", deleteRow: "Elimina riga", clickToExpand: "Clicca per espandere", open: "Apri", live: "Live" },
  de: { settings: "Tabellen-Einstellungen", settingsHint: "Die Spalten dieser Tabelle kommen aus dem Kern — ändere den Kern, ändert sich die Tabelle.", columnKey: "Spalte", table: "Speichertabelle", noColumns: "Diese Tabelle deklariert noch keine Spalten.", empty: "Noch keine Einträge — starte eine Abfrage im Pult.", search: "Suchen…", columns: "Spalten", showColumns: "Spalten anzeigen", twoView: "Zwei Tabellen", singleView: "Eine Tabelle", details: "Details", close: "Schließen", more: "Mehr laden", demo: "Demo", noRecords: "Noch keine Einträge.", rowDetail: "Eintrag", addRow: "Zeile hinzufügen", editRow: "Zeile bearbeiten", save: "Änderungen speichern", clickToEdit: "Klicken, um diese Zeile zu bearbeiten", rowAdded: "Zeile hinzugefügt.", rowSaved: "Zeile gespeichert.", rowDeleted: "Zeile gelöscht.", addFailed: "Zeile konnte nicht hinzugefügt werden.", saveFailed: "Zeile konnte nicht gespeichert werden.", deleteFailed: "Zeile konnte nicht gelöscht werden.", demoReadOnly: "Demo-Zeilen sind nur lesbar — füge zuerst eine echte Zeile hinzu.", readOnlyView: "Nur Ansicht.", deleteRow: "Zeile löschen", clickToExpand: "Zum Aufklappen klicken", open: "Öffnen", live: "Live" },
  pt: { settings: "Definições da tabela", settingsHint: "As colunas desta tabela vêm do núcleo — muda o núcleo, muda a tabela.", columnKey: "Coluna", table: "Tabela de armazenamento", noColumns: "Esta tabela ainda não declara colunas.", empty: "Ainda sem registos — lance uma consulta no painel.", search: "Procurar…", columns: "Colunas", showColumns: "Mostrar colunas", twoView: "Duas tabelas", singleView: "Uma tabela", details: "Detalhes", close: "Fechar", more: "Mostrar mais", demo: "demo", noRecords: "Ainda sem registos.", rowDetail: "Registo", addRow: "Adicionar linha", editRow: "Editar linha", save: "Guardar alterações", clickToEdit: "Clique para editar esta linha", rowAdded: "Linha adicionada.", rowSaved: "Linha guardada.", rowDeleted: "Linha eliminada.", addFailed: "Não foi possível adicionar a linha.", saveFailed: "Não foi possível guardar a linha.", deleteFailed: "Não foi possível eliminar a linha.", demoReadOnly: "As linhas de demo são só de leitura — adicione primeiro uma real.", readOnlyView: "Apenas leitura.", deleteRow: "Eliminar linha", clickToExpand: "Clique para expandir", open: "Abrir", live: "Ao vivo" },
  pl: { settings: "Ustawienia tabeli", settingsHint: "Kolumny tej tabeli pochodzą z rdzenia — zmień rdzeń, zmieni się tabela.", columnKey: "Kolumna", table: "Tabela magazynu", noColumns: "Ta tabela nie deklaruje jeszcze kolumn.", empty: "Brak rekordów — uruchom zapytanie z pulpitu.", search: "Szukaj…", columns: "Kolumny", showColumns: "Pokaż kolumny", twoView: "Dwie tabele", singleView: "Jedna tabela", details: "Szczegóły", close: "Zamknij", more: "Pokaż więcej", demo: "demo", noRecords: "Brak rekordów.", rowDetail: "Rekord", addRow: "Dodaj wiersz", editRow: "Edytuj wiersz", save: "Zapisz zmiany", clickToEdit: "Kliknij, aby edytować ten wiersz", rowAdded: "Wiersz dodany.", rowSaved: "Wiersz zapisany.", rowDeleted: "Wiersz usunięty.", addFailed: "Nie udało się dodać wiersza.", saveFailed: "Nie udało się zapisać wiersza.", deleteFailed: "Nie udało się usunąć wiersza.", demoReadOnly: "Wiersze demo są tylko do czytania — dodaj najpierw prawdziwy.", readOnlyView: "Tylko podgląd.", deleteRow: "Usuń wiersz", clickToExpand: "Kliknij, aby rozwinąć", open: "Otwórz", live: "Na żywo" },
  tr: { settings: "Tablo ayarları", settingsHint: "Bu tablonun sütunları çekirdekten gelir — çekirdeği değiştir, tablo değişir.", columnKey: "Sütun", table: "Depolama tablosu", noColumns: "Bu tablo henüz sütun tanımlamıyor.", empty: "Henüz kayıt yok — panelden bir sorgu çalıştırın.", search: "Ara…", columns: "Sütunlar", showColumns: "Sütunları göster", twoView: "İki tablo", singleView: "Tek tablo", details: "Ayrıntılar", close: "Kapat", more: "Daha fazla yükle", demo: "demo", noRecords: "Henüz kayıt yok.", rowDetail: "Kayıt", addRow: "Satır ekle", editRow: "Satırı düzenle", save: "Değişiklikleri kaydet", clickToEdit: "Bu satırı düzenlemek için tıklayın", rowAdded: "Satır eklendi.", rowSaved: "Satır kaydedildi.", rowDeleted: "Satır silindi.", addFailed: "Satır eklenemedi.", saveFailed: "Satır kaydedilemedi.", deleteFailed: "Satır silinemedi.", demoReadOnly: "Demo satırlar salt okunur — önce gerçek bir satır ekleyin.", readOnlyView: "Salt görüntüleme.", deleteRow: "Satırı sil", clickToExpand: "Genişletmek için tıklayın", open: "Aç", live: "Canlı" },
  nl: { settings: "Tabelinstellingen", settingsHint: "De kolommen van deze tabel komen uit de kern — verander de kern en de tabel verandert mee.", columnKey: "Kolom", table: "Opslagtabel", noColumns: "Deze tabel declareert nog geen kolommen.", empty: "Nog geen records — start een aanvraag vanuit het paneel.", search: "Zoeken…", columns: "Kolommen", showColumns: "Kolommen tonen", twoView: "Twee tabellen", singleView: "Eén tabel", details: "Details", close: "Sluiten", more: "Meer laden", demo: "demo", noRecords: "Nog geen records.", rowDetail: "Record", addRow: "Rij toevoegen", editRow: "Rij bewerken", save: "Wijzigingen opslaan", clickToEdit: "Klik om deze rij te bewerken", rowAdded: "Rij toegevoegd.", rowSaved: "Rij opgeslagen.", rowDeleted: "Rij verwijderd.", addFailed: "Kon de rij niet toevoegen.", saveFailed: "Kon de rij niet opslaan.", deleteFailed: "Kon de rij niet verwijderen.", demoReadOnly: "Demo-rijen zijn alleen-lezen — voeg eerst een echte rij toe.", readOnlyView: "Alleen-lezen.", deleteRow: "Rij verwijderen", clickToExpand: "Klik om uit te vouwen", open: "Openen", live: "Live" },
};

export const dashboardAdminStrings = (lang: string): DashboardAdminStrings =>
  I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;

/** Текст ядра — строка либо карта языков; берём язык страницы (перенос `shared/localized.pick`). */
export function pick(value: unknown, lang: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const v = map[lang.slice(0, 2)] ?? map.en;
    if (typeof v === "string") return v;
  }
  return "";
}
