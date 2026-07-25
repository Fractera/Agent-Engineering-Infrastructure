// СЛОВАРЬ инструмента «добавить строку» локальной базы — десять языков (правило 4г), англ. фолбэк.
export type AddRowStrings = {
  title: string; // заголовок модалки
  name: string; // плейсхолдер имени строки
  addImage: string; // прикрепить изображение
  attached: string; // «Хранилище» (рядом печатается число ссылок storageIds)
  vectorIds: string; // плейсхолдер поля ссылок в векторную базу (vectorIds)
  vectorHint: string; // подсказка: через запятую
  create: string; // создать строку
  creating: string; // идёт создание
  cancel: string; // отмена
  failed: string; // не удалось
};

export const ADD_ROW_I18N: Record<string, AddRowStrings> = {
  en: { title: "Add record", name: "Row name", addImage: "Add image", attached: "Storage links", vectorIds: "Vector links", vectorHint: "comma-separated ids", create: "Create row", creating: "Creating…", cancel: "Cancel", failed: "Could not create the row." },
  es: { title: "Añadir registro", name: "Nombre de la fila", addImage: "Añadir imagen", attached: "Enlaces de almacenamiento", vectorIds: "Enlaces vectoriales", vectorHint: "ids separados por comas", create: "Crear fila", creating: "Creando…", cancel: "Cancelar", failed: "No se pudo crear la fila." },
  fr: { title: "Ajouter un enregistrement", name: "Nom de la ligne", addImage: "Ajouter une image", attached: "Liens de stockage", vectorIds: "Liens vectoriels", vectorHint: "ids séparés par des virgules", create: "Créer la ligne", creating: "Création…", cancel: "Annuler", failed: "Impossible de créer la ligne." },
  it: { title: "Aggiungi record", name: "Nome della riga", addImage: "Aggiungi immagine", attached: "Collegamenti archivio", vectorIds: "Collegamenti vettoriali", vectorHint: "id separati da virgola", create: "Crea riga", creating: "Creazione…", cancel: "Annulla", failed: "Impossibile creare la riga." },
  ru: { title: "Добавить запись", name: "Имя записи", addImage: "Добавить изображение", attached: "Ссылки хранилища", vectorIds: "Ссылки векторной базы", vectorHint: "идентификаторы через запятую", create: "Создать запись", creating: "Создание…", cancel: "Отмена", failed: "Не удалось создать запись." },
  de: { title: "Eintrag hinzufügen", name: "Zeilenname", addImage: "Bild hinzufügen", attached: "Speicher-Links", vectorIds: "Vektor-Links", vectorHint: "kommagetrennte IDs", create: "Zeile erstellen", creating: "Wird erstellt…", cancel: "Abbrechen", failed: "Die Zeile konnte nicht erstellt werden." },
  pt: { title: "Adicionar registo", name: "Nome da linha", addImage: "Adicionar imagem", attached: "Ligações de armazenamento", vectorIds: "Ligações vetoriais", vectorHint: "ids separados por vírgulas", create: "Criar linha", creating: "A criar…", cancel: "Cancelar", failed: "Não foi possível criar a linha." },
  pl: { title: "Dodaj rekord", name: "Nazwa wiersza", addImage: "Dodaj obraz", attached: "Odnośniki magazynu", vectorIds: "Odnośniki wektorowe", vectorHint: "identyfikatory po przecinku", create: "Utwórz wiersz", creating: "Tworzenie…", cancel: "Anuluj", failed: "Nie udało się utworzyć wiersza." },
  tr: { title: "Kayıt ekle", name: "Satır adı", addImage: "Görsel ekle", attached: "Depo bağlantıları", vectorIds: "Vektör bağlantıları", vectorHint: "virgülle ayrılmış kimlikler", create: "Satır oluştur", creating: "Oluşturuluyor…", cancel: "İptal", failed: "Satır oluşturulamadı." },
  nl: { title: "Record toevoegen", name: "Rijnaam", addImage: "Afbeelding toevoegen", attached: "Opslagkoppelingen", vectorIds: "Vectorkoppelingen", vectorHint: "door komma's gescheiden id's", create: "Rij maken", creating: "Maken…", cancel: "Annuleren", failed: "Kon de rij niet maken." },
};

export function addRowStrings(lang: string): AddRowStrings {
  return ADD_ROW_I18N[lang] ?? ADD_ROW_I18N.en;
}
