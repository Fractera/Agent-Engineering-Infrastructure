// СЛОВАРЬ инструмента «добавить запись» векторной памяти — десять языков (en, es, fr, it, ru, de, pt, pl,
// tr, nl), англ. фолбэк (правило 4г). Кокпит-инструмент дев-слоя `_shared-v2`. Показывается модалкой,
// которую открывает кнопка «Добавить запись» из ряда поиска таблицы (через DOM-событие).
export type AddRecordStrings = {
  title: string; // заголовок модалки
  name: string; // плейсхолдер имени записи (метка факта)
  content: string; // плейсхолдер текста-факта (то, что запоминается)
  addImage: string; // прикрепить изображение
  attached: string; // «Хранилище» (рядом печатается число ссылок storageIds)
  create: string; // создать запись
  creating: string; // идёт создание
  cancel: string; // отмена
  failed: string; // не удалось
};

export const ADD_RECORD_I18N: Record<string, AddRecordStrings> = {
  en: { title: "Add memory", name: "Label", content: "Fact to remember…", addImage: "Add image", attached: "Storage links", create: "Create", creating: "Creating…", cancel: "Cancel", failed: "Could not create the memory." },
  es: { title: "Añadir memoria", name: "Etiqueta", content: "Hecho para recordar…", addImage: "Añadir imagen", attached: "Enlaces de almacenamiento", create: "Crear", creating: "Creando…", cancel: "Cancelar", failed: "No se pudo crear la memoria." },
  fr: { title: "Ajouter une mémoire", name: "Libellé", content: "Fait à mémoriser…", addImage: "Ajouter une image", attached: "Liens de stockage", create: "Créer", creating: "Création…", cancel: "Annuler", failed: "Impossible de créer la mémoire." },
  it: { title: "Aggiungi memoria", name: "Etichetta", content: "Fatto da ricordare…", addImage: "Aggiungi immagine", attached: "Collegamenti archivio", create: "Crea", creating: "Creazione…", cancel: "Annulla", failed: "Impossibile creare la memoria." },
  ru: { title: "Добавить запись", name: "Имя записи", content: "Факт для запоминания…", addImage: "Добавить изображение", attached: "Ссылки хранилища", create: "Создать", creating: "Создание…", cancel: "Отмена", failed: "Не удалось создать запись." },
  de: { title: "Erinnerung hinzufügen", name: "Bezeichnung", content: "Zu merkender Fakt…", addImage: "Bild hinzufügen", attached: "Speicher-Links", create: "Erstellen", creating: "Wird erstellt…", cancel: "Abbrechen", failed: "Die Erinnerung konnte nicht erstellt werden." },
  pt: { title: "Adicionar memória", name: "Rótulo", content: "Facto a recordar…", addImage: "Adicionar imagem", attached: "Ligações de armazenamento", create: "Criar", creating: "A criar…", cancel: "Cancelar", failed: "Não foi possível criar a memória." },
  pl: { title: "Dodaj pamięć", name: "Etykieta", content: "Fakt do zapamiętania…", addImage: "Dodaj obraz", attached: "Odnośniki magazynu", create: "Utwórz", creating: "Tworzenie…", cancel: "Anuluj", failed: "Nie udało się utworzyć pamięci." },
  tr: { title: "Bellek ekle", name: "Etiket", content: "Hatırlanacak bilgi…", addImage: "Görsel ekle", attached: "Depo bağlantıları", create: "Oluştur", creating: "Oluşturuluyor…", cancel: "İptal", failed: "Bellek oluşturulamadı." },
  nl: { title: "Geheugen toevoegen", name: "Label", content: "Te onthouden feit…", addImage: "Afbeelding toevoegen", attached: "Opslagkoppelingen", create: "Maken", creating: "Maken…", cancel: "Annuleren", failed: "Kon het geheugen niet maken." },
};

export function addRecordStrings(lang: string): AddRecordStrings {
  return ADD_RECORD_I18N[lang] ?? ADD_RECORD_I18N.en;
}
