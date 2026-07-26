// ТЕКСТ ИЗ ЯДРА НА ЯЗЫКЕ СТРАНИЦЫ — одна функция на всю автоматизацию. Ядро хранит подписи картой языков
// ({ru: "…", en: "…"}), иногда простой строкой; читатель у этой карты должен быть ОДИН, иначе вкладки
// начнут расходиться в мелочах (одна берёт фолбэк, другая — нет).
export function pick(text: unknown, lang: string): string {
  if (typeof text === "string") return text;
  if (text && typeof text === "object") {
    const m = text as Record<string, unknown>;
    const v = m[lang.slice(0, 2)] ?? m.en;
    if (typeof v === "string") return v;
  }
  return "";
}
