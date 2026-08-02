// СЛОВАРЬ ВКЛАДКИ «ЛОКАЛЬНОЕ ХРАНИЛИЩЕ» — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl),
// англ. фолбэк (правило 4г). Строки публичной таблицы склада живут в папке (закон 0).
export type StorageStrings = {
  id: string; // колонка идентификатора записи
  copy: string;
  page: string; // подпись пагинации: «Страница»
  of: string; // подпись пагинации: «из» // подсказка кнопки копирования id
  addRecord: string; // кнопка «Добавить запись» в ряду поиска
  search: string; // плейсхолдер поиска
  searchBtn: string; // кнопка «Искать» (запускает поиск явно)
  found: string; // «Найдено» (рядом печатается число результатов)
  empty: string; // склад пуст
  name: string; // колонка имени
  kind: string; // колонка типа
  size: string; // колонка размера
  added: string; // колонка даты добавления
  preview: string; // колонка превью
  del: string; // удалить
  confirmDelete: string; // подтверждение удаления
};

export const STORAGE_I18N: Record<string, StorageStrings> = {
  en: { id: "ID", copy: "Copy", page: "Page", of: "of", addRecord: "Add record", search: "Search the storage…", searchBtn: "Search", found: "Found", empty: "No objects yet.", name: "Name", kind: "Type", size: "Size", added: "Added", preview: "Preview", del: "Delete", confirmDelete: "Delete this object?" },
  es: { id: "ID", copy: "Copiar", page: "Página", of: "de", addRecord: "Añadir registro", search: "Buscar en el almacenamiento…", searchBtn: "Buscar", found: "Encontrados", empty: "Aún no hay objetos.", name: "Nombre", kind: "Tipo", size: "Tamaño", added: "Añadido", preview: "Vista previa", del: "Eliminar", confirmDelete: "¿Eliminar este objeto?" },
  fr: { id: "ID", copy: "Copier", page: "Page", of: "sur", addRecord: "Ajouter un enregistrement", search: "Rechercher dans le stockage…", searchBtn: "Rechercher", found: "Trouvés", empty: "Aucun objet pour l'instant.", name: "Nom", kind: "Type", size: "Taille", added: "Ajouté", preview: "Aperçu", del: "Supprimer", confirmDelete: "Supprimer cet objet ?" },
  it: { id: "ID", copy: "Copia", page: "Pagina", of: "di", addRecord: "Aggiungi record", search: "Cerca nell'archivio…", searchBtn: "Cerca", found: "Trovati", empty: "Ancora nessun oggetto.", name: "Nome", kind: "Tipo", size: "Dimensione", added: "Aggiunto", preview: "Anteprima", del: "Elimina", confirmDelete: "Eliminare questo oggetto?" },
  ru: { id: "ID", copy: "Копировать", page: "Страница", of: "из", addRecord: "Добавить запись", search: "Поиск по хранилищу…", searchBtn: "Искать", found: "Найдено", empty: "Пока нет объектов.", name: "Имя", kind: "Тип", size: "Размер", added: "Добавлено", preview: "Превью", del: "Удалить", confirmDelete: "Удалить этот объект?" },
  de: { id: "ID", copy: "Kopieren", page: "Seite", of: "von", addRecord: "Eintrag hinzufügen", search: "Speicher durchsuchen…", searchBtn: "Suchen", found: "Gefunden", empty: "Noch keine Objekte.", name: "Name", kind: "Typ", size: "Größe", added: "Hinzugefügt", preview: "Vorschau", del: "Löschen", confirmDelete: "Dieses Objekt löschen?" },
  pt: { id: "ID", copy: "Copiar", page: "Página", of: "de", addRecord: "Adicionar registo", search: "Pesquisar no armazenamento…", searchBtn: "Pesquisar", found: "Encontrados", empty: "Ainda não há objetos.", name: "Nome", kind: "Tipo", size: "Tamanho", added: "Adicionado", preview: "Pré-visualização", del: "Eliminar", confirmDelete: "Eliminar este objeto?" },
  pl: { id: "ID", copy: "Kopiuj", page: "Strona", of: "z", addRecord: "Dodaj rekord", search: "Szukaj w magazynie…", searchBtn: "Szukaj", found: "Znaleziono", empty: "Brak obiektów.", name: "Nazwa", kind: "Typ", size: "Rozmiar", added: "Dodano", preview: "Podgląd", del: "Usuń", confirmDelete: "Usunąć ten obiekt?" },
  tr: { id: "ID", copy: "Kopyala", page: "Sayfa", of: "/", addRecord: "Kayıt ekle", search: "Depoda ara…", searchBtn: "Ara", found: "Bulundu", empty: "Henüz nesne yok.", name: "Ad", kind: "Tür", size: "Boyut", added: "Eklendi", preview: "Önizleme", del: "Sil", confirmDelete: "Bu nesne silinsin mi?" },
  nl: { id: "ID", copy: "Kopiëren", page: "Pagina", of: "van", addRecord: "Record toevoegen", search: "Zoek in de opslag…", searchBtn: "Zoeken", found: "Gevonden", empty: "Nog geen objecten.", name: "Naam", kind: "Type", size: "Grootte", added: "Toegevoegd", preview: "Voorbeeld", del: "Verwijderen", confirmDelete: "Dit object verwijderen?" },
};

export function storageStrings(lang: string): StorageStrings {
  return STORAGE_I18N[lang] ?? STORAGE_I18N.en;
}
