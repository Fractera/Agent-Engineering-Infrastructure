// СЛОВАРЬ инструмента «добавить объект» — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl),
// англ. фолбэк (правило 4г). Кокпит-инструмент, живёт в дев-слое `_shared-v2`. Показывается модалкой,
// которую открывает кнопка «Добавить запись» из ряда поиска таблицы (через DOM-событие).
export type AddObjectStrings = {
  title: string; // заголовок модалки
  name: string; // плейсхолдер имени записи
  chooseImage: string; // выбрать изображение
  create: string; // создать запись
  uploading: string; // идёт загрузка
  cancel: string; // отмена
  failed: string; // не удалось добавить
};

export const ADD_OBJECT_I18N: Record<string, AddObjectStrings> = {
  en: { title: "Add object", name: "Name", chooseImage: "Choose image", create: "Create", uploading: "Uploading…", cancel: "Cancel", failed: "Could not add the object." },
  es: { title: "Añadir objeto", name: "Nombre", chooseImage: "Elegir imagen", create: "Crear", uploading: "Subiendo…", cancel: "Cancelar", failed: "No se pudo añadir el objeto." },
  fr: { title: "Ajouter un objet", name: "Nom", chooseImage: "Choisir une image", create: "Créer", uploading: "Envoi…", cancel: "Annuler", failed: "Impossible d'ajouter l'objet." },
  it: { title: "Aggiungi oggetto", name: "Nome", chooseImage: "Scegli immagine", create: "Crea", uploading: "Caricamento…", cancel: "Annulla", failed: "Impossibile aggiungere l'oggetto." },
  ru: { title: "Добавить объект", name: "Имя", chooseImage: "Выбрать изображение", create: "Создать", uploading: "Загрузка…", cancel: "Отмена", failed: "Не удалось добавить объект." },
  de: { title: "Objekt hinzufügen", name: "Name", chooseImage: "Bild auswählen", create: "Erstellen", uploading: "Wird hochgeladen…", cancel: "Abbrechen", failed: "Das Objekt konnte nicht hinzugefügt werden." },
  pt: { title: "Adicionar objeto", name: "Nome", chooseImage: "Escolher imagem", create: "Criar", uploading: "A enviar…", cancel: "Cancelar", failed: "Não foi possível adicionar o objeto." },
  pl: { title: "Dodaj obiekt", name: "Nazwa", chooseImage: "Wybierz obraz", create: "Utwórz", uploading: "Przesyłanie…", cancel: "Anuluj", failed: "Nie udało się dodać obiektu." },
  tr: { title: "Nesne ekle", name: "Ad", chooseImage: "Görsel seç", create: "Oluştur", uploading: "Yükleniyor…", cancel: "İptal", failed: "Nesne eklenemedi." },
  nl: { title: "Object toevoegen", name: "Naam", chooseImage: "Afbeelding kiezen", create: "Maken", uploading: "Uploaden…", cancel: "Annuleren", failed: "Kon het object niet toevoegen." },
};

export function addObjectStrings(lang: string): AddObjectStrings {
  return ADD_OBJECT_I18N[lang] ?? ADD_OBJECT_I18N.en;
}
