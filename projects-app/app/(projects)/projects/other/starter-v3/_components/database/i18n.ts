// СЛОВАРЬ ВКЛАДКИ «ЛОКАЛЬНАЯ БАЗА ДАННЫХ» — десять языков (правило 4г), англ. фолбэк. Строки публичной
// таблицы базы живут в папке (закон 0).
export type DatabaseStrings = {
  id: string; // колонка идентификатора записи
  copy: string;
  page: string; // подпись пагинации: «Страница»
  of: string; // подпись пагинации: «из» // подсказка копирования
  addRecord: string; // кнопка «Добавить запись» в ряду поиска
  search: string; // плейсхолдер поиска
  searchBtn: string; // кнопка «Искать» (запускает поиск явно)
  found: string; // «Найдено» (рядом печатается число результатов)
  empty: string; // база пуста
  name: string; // колонка имени
  added: string; // колонка даты
  del: string; // удалить
  confirmDelete: string; // подтверждение удаления
};

export const DATABASE_I18N: Record<string, DatabaseStrings> = {
  en: { id: "ID", copy: "Copy", page: "Page", of: "of", addRecord: "Add record", search: "Search the database…", searchBtn: "Search", found: "Found", empty: "No records yet.", name: "Name", added: "Added", del: "Delete", confirmDelete: "Delete this record?" },
  es: { id: "ID", copy: "Copiar", page: "Página", of: "de", addRecord: "Añadir registro", search: "Buscar en la base de datos…", searchBtn: "Buscar", found: "Encontrados", empty: "Aún no hay registros.", name: "Nombre", added: "Añadido", del: "Eliminar", confirmDelete: "¿Eliminar este registro?" },
  fr: { id: "ID", copy: "Copier", page: "Page", of: "sur", addRecord: "Ajouter un enregistrement", search: "Rechercher dans la base…", searchBtn: "Rechercher", found: "Trouvés", empty: "Aucun enregistrement.", name: "Nom", added: "Ajouté", del: "Supprimer", confirmDelete: "Supprimer cet enregistrement ?" },
  it: { id: "ID", copy: "Copia", page: "Pagina", of: "di", addRecord: "Aggiungi record", search: "Cerca nel database…", searchBtn: "Cerca", found: "Trovati", empty: "Ancora nessun record.", name: "Nome", added: "Aggiunto", del: "Elimina", confirmDelete: "Eliminare questo record?" },
  ru: { id: "ID", copy: "Копировать", page: "Страница", of: "из", addRecord: "Добавить запись", search: "Поиск по базе…", searchBtn: "Искать", found: "Найдено", empty: "Пока нет записей.", name: "Имя", added: "Добавлено", del: "Удалить", confirmDelete: "Удалить эту запись?" },
  de: { id: "ID", copy: "Kopieren", page: "Seite", of: "von", addRecord: "Eintrag hinzufügen", search: "Datenbank durchsuchen…", searchBtn: "Suchen", found: "Gefunden", empty: "Noch keine Einträge.", name: "Name", added: "Hinzugefügt", del: "Löschen", confirmDelete: "Diesen Eintrag löschen?" },
  pt: { id: "ID", copy: "Copiar", page: "Página", of: "de", addRecord: "Adicionar registo", search: "Pesquisar na base de dados…", searchBtn: "Pesquisar", found: "Encontrados", empty: "Ainda não há registos.", name: "Nome", added: "Adicionado", del: "Eliminar", confirmDelete: "Eliminar este registo?" },
  pl: { id: "ID", copy: "Kopiuj", page: "Strona", of: "z", addRecord: "Dodaj rekord", search: "Szukaj w bazie danych…", searchBtn: "Szukaj", found: "Znaleziono", empty: "Brak rekordów.", name: "Nazwa", added: "Dodano", del: "Usuń", confirmDelete: "Usunąć ten rekord?" },
  tr: { id: "ID", copy: "Kopyala", page: "Sayfa", of: "/", addRecord: "Kayıt ekle", search: "Veritabanında ara…", searchBtn: "Ara", found: "Bulundu", empty: "Henüz kayıt yok.", name: "Ad", added: "Eklendi", del: "Sil", confirmDelete: "Bu kayıt silinsin mi?" },
  nl: { id: "ID", copy: "Kopiëren", page: "Pagina", of: "van", addRecord: "Record toevoegen", search: "Zoek in de database…", searchBtn: "Zoeken", found: "Gevonden", empty: "Nog geen records.", name: "Naam", added: "Toegevoegd", del: "Verwijderen", confirmDelete: "Dit record verwijderen?" },
};

export function databaseStrings(lang: string): DatabaseStrings {
  return DATABASE_I18N[lang] ?? DATABASE_I18N.en;
}
