// СЛОВАРЬ ВКЛАДКИ «ВЕКТОРНАЯ ПАМЯТЬ» — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl), англ.
// фолбэк (правило 4г). Строки публичной таблицы памяти живут в папке (закон 0). Третий склад v2 тем же
// образцом, что склад и локальная база.
export type VectorMemoryStrings = {
  id: string; // колонка идентификатора записи
  copy: string; // подсказка копирования
  addRecord: string; // кнопка «Добавить запись» в ряду поиска
  search: string; // плейсхолдер поиска
  searchBtn: string; // кнопка «Искать» (запускает поиск явно)
  found: string; // «Найдено» (рядом печатается число результатов)
  empty: string; // память пуста
  name: string; // колонка имени (метка факта)
  content: string; // колонка текста-факта
  storageLinks: string; // колонка ссылок в объектное хранилище (storageIds)
  added: string; // колонка даты
  del: string; // удалить
  confirmDelete: string; // подтверждение удаления
};

export const VECTOR_MEMORY_I18N: Record<string, VectorMemoryStrings> = {
  en: { id: "ID", copy: "Copy", addRecord: "Add record", search: "Search the memory…", searchBtn: "Search", found: "Found", empty: "No memories yet.", name: "Label", content: "Fact", storageLinks: "Storage", added: "Added", del: "Delete", confirmDelete: "Delete this memory?" },
  es: { id: "ID", copy: "Copiar", addRecord: "Añadir registro", search: "Buscar en la memoria…", searchBtn: "Buscar", found: "Encontrados", empty: "Aún no hay memorias.", name: "Etiqueta", content: "Hecho", storageLinks: "Almacenamiento", added: "Añadido", del: "Eliminar", confirmDelete: "¿Eliminar esta memoria?" },
  fr: { id: "ID", copy: "Copier", addRecord: "Ajouter un enregistrement", search: "Rechercher dans la mémoire…", searchBtn: "Rechercher", found: "Trouvés", empty: "Aucune mémoire.", name: "Libellé", content: "Fait", storageLinks: "Stockage", added: "Ajouté", del: "Supprimer", confirmDelete: "Supprimer cette mémoire ?" },
  it: { id: "ID", copy: "Copia", addRecord: "Aggiungi record", search: "Cerca nella memoria…", searchBtn: "Cerca", found: "Trovati", empty: "Ancora nessuna memoria.", name: "Etichetta", content: "Fatto", storageLinks: "Archivio", added: "Aggiunto", del: "Elimina", confirmDelete: "Eliminare questa memoria?" },
  ru: { id: "ID", copy: "Копировать", addRecord: "Добавить запись", search: "Поиск по памяти…", searchBtn: "Искать", found: "Найдено", empty: "Пока нет записей.", name: "Имя", content: "Факт", storageLinks: "Хранилище", added: "Добавлено", del: "Удалить", confirmDelete: "Удалить эту запись?" },
  de: { id: "ID", copy: "Kopieren", addRecord: "Eintrag hinzufügen", search: "Speicher durchsuchen…", searchBtn: "Suchen", found: "Gefunden", empty: "Noch keine Erinnerungen.", name: "Bezeichnung", content: "Fakt", storageLinks: "Speicher", added: "Hinzugefügt", del: "Löschen", confirmDelete: "Diese Erinnerung löschen?" },
  pt: { id: "ID", copy: "Copiar", addRecord: "Adicionar registo", search: "Pesquisar na memória…", searchBtn: "Pesquisar", found: "Encontrados", empty: "Ainda não há memórias.", name: "Rótulo", content: "Facto", storageLinks: "Armazenamento", added: "Adicionado", del: "Eliminar", confirmDelete: "Eliminar esta memória?" },
  pl: { id: "ID", copy: "Kopiuj", addRecord: "Dodaj rekord", search: "Szukaj w pamięci…", searchBtn: "Szukaj", found: "Znaleziono", empty: "Brak wpisów pamięci.", name: "Etykieta", content: "Fakt", storageLinks: "Magazyn", added: "Dodano", del: "Usuń", confirmDelete: "Usunąć ten wpis pamięci?" },
  tr: { id: "ID", copy: "Kopyala", addRecord: "Kayıt ekle", search: "Bellekte ara…", searchBtn: "Ara", found: "Bulundu", empty: "Henüz bellek yok.", name: "Etiket", content: "Bilgi", storageLinks: "Depo", added: "Eklendi", del: "Sil", confirmDelete: "Bu bellek silinsin mi?" },
  nl: { id: "ID", copy: "Kopiëren", addRecord: "Record toevoegen", search: "Zoek in het geheugen…", searchBtn: "Zoeken", found: "Gevonden", empty: "Nog geen herinneringen.", name: "Label", content: "Feit", storageLinks: "Opslag", added: "Toegevoegd", del: "Verwijderen", confirmDelete: "Dit geheugen verwijderen?" },
};

export function vectorMemoryStrings(lang: string): VectorMemoryStrings {
  return VECTOR_MEMORY_I18N[lang] ?? VECTOR_MEMORY_I18N.en;
}
