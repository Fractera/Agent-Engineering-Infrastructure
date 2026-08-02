// СЛОВАРЬ инструмента «добавить объект» — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl),
// англ. фолбэк (правило 4г). Кокпит-инструмент, живёт в дев-слое `_shared-v2`. Показывается модалкой,
// которую открывает кнопка «Добавить запись» из ряда поиска таблицы (через DOM-событие).
export type AddObjectStrings = {
  title: string; // заголовок модалки
  name: string; // плейсхолдер имени записи
  chooseImage: string; // выбрать изображение
  chooseVideo: string; // выбрать видео
  chooseAudio: string; // выбрать аудио
  choosePdf: string; // выбрать PDF
  chooseHtml: string; // выбрать HTML
  chooseXml: string; // выбрать XML
  chooseMarkdown: string; // выбрать Markdown
  chooseText: string; // выбрать текстовый файл
  create: string; // создать запись
  uploading: string; // идёт загрузка
  cancel: string; // отмена
  failed: string; // не удалось добавить
};

export const ADD_OBJECT_I18N: Record<string, AddObjectStrings> = {
  en: { title: "Add object", name: "Name", chooseImage: "Choose image", chooseVideo: "Video", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Text", create: "Create", uploading: "Uploading…", cancel: "Cancel", failed: "Could not add the object." },
  es: { title: "Añadir objeto", name: "Nombre", chooseImage: "Elegir imagen", chooseVideo: "Vídeo", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Texto", create: "Crear", uploading: "Subiendo…", cancel: "Cancelar", failed: "No se pudo añadir el objeto." },
  fr: { title: "Ajouter un objet", name: "Nom", chooseImage: "Choisir une image", chooseVideo: "Vidéo", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Texte", create: "Créer", uploading: "Envoi…", cancel: "Annuler", failed: "Impossible d'ajouter l'objet." },
  it: { title: "Aggiungi oggetto", name: "Nome", chooseImage: "Scegli immagine", chooseVideo: "Video", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Testo", create: "Crea", uploading: "Caricamento…", cancel: "Annulla", failed: "Impossibile aggiungere l'oggetto." },
  ru: { title: "Добавить объект", name: "Имя", chooseImage: "Выбрать изображение", chooseVideo: "Видео", chooseAudio: "Аудио", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Текст", create: "Создать", uploading: "Загрузка…", cancel: "Отмена", failed: "Не удалось добавить объект." },
  de: { title: "Objekt hinzufügen", name: "Name", chooseImage: "Bild auswählen", chooseVideo: "Video", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Text", create: "Erstellen", uploading: "Wird hochgeladen…", cancel: "Abbrechen", failed: "Das Objekt konnte nicht hinzugefügt werden." },
  pt: { title: "Adicionar objeto", name: "Nome", chooseImage: "Escolher imagem", chooseVideo: "Vídeo", chooseAudio: "Áudio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Texto", create: "Criar", uploading: "A enviar…", cancel: "Cancelar", failed: "Não foi possível adicionar o objeto." },
  pl: { title: "Dodaj obiekt", name: "Nazwa", chooseImage: "Wybierz obraz", chooseVideo: "Wideo", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Tekst", create: "Utwórz", uploading: "Przesyłanie…", cancel: "Anuluj", failed: "Nie udało się dodać obiektu." },
  tr: { title: "Nesne ekle", name: "Ad", chooseImage: "Görsel seç", chooseVideo: "Video", chooseAudio: "Ses", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Metin", create: "Oluştur", uploading: "Yükleniyor…", cancel: "İptal", failed: "Nesne eklenemedi." },
  nl: { title: "Object toevoegen", name: "Naam", chooseImage: "Afbeelding kiezen", chooseVideo: "Video", chooseAudio: "Audio", choosePdf: "PDF", chooseHtml: "HTML", chooseXml: "XML", chooseMarkdown: "Markdown", chooseText: "Tekst", create: "Maken", uploading: "Uploaden…", cancel: "Annuleren", failed: "Kon het object niet toevoegen." },
};

export function addObjectStrings(lang: string): AddObjectStrings {
  return ADD_OBJECT_I18N[lang] ?? ADD_OBJECT_I18N.en;
}
