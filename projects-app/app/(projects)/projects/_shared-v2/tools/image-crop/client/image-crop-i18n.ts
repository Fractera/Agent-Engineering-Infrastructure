// СЛОВАРЬ ОБРЕЗКИ ИЗОБРАЖЕНИЯ — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl), англ. фолбэк
// (правило 4г). Инструмент новый, поэтому строки заведены здесь (в v1 у него аналога-словаря не было —
// исходник `bridges/app/.../image-cropper.client.tsx` держал английский хардкод). Ярлыки соотношений
// (16:9 / 1:1 / 9:16) — машинные, в словарь не входят и не переводятся.
export type CropStrings = {
  title: string; // заголовок модалки
  scale: string; // подпись ползунка масштаба
  cancel: string;
  apply: string;
};

export const CROP_I18N: Record<string, CropStrings> = {
  en: { title: "Crop image", scale: "Scale", cancel: "Cancel", apply: "Apply" },
  es: { title: "Recortar imagen", scale: "Escala", cancel: "Cancelar", apply: "Aplicar" },
  fr: { title: "Rogner l'image", scale: "Échelle", cancel: "Annuler", apply: "Appliquer" },
  it: { title: "Ritaglia immagine", scale: "Scala", cancel: "Annulla", apply: "Applica" },
  ru: { title: "Обрезать изображение", scale: "Масштаб", cancel: "Отмена", apply: "Применить" },
  de: { title: "Bild zuschneiden", scale: "Skalierung", cancel: "Abbrechen", apply: "Übernehmen" },
  pt: { title: "Recortar imagem", scale: "Escala", cancel: "Cancelar", apply: "Aplicar" },
  pl: { title: "Przytnij obraz", scale: "Skala", cancel: "Anuluj", apply: "Zastosuj" },
  tr: { title: "Görseli kırp", scale: "Ölçek", cancel: "İptal", apply: "Uygula" },
  nl: { title: "Afbeelding bijsnijden", scale: "Schaal", cancel: "Annuleren", apply: "Toepassen" },
};

/** Строки языка с англ. фолбэком. */
export function cropStrings(lang: string): CropStrings {
  return CROP_I18N[lang] ?? CROP_I18N.en;
}
