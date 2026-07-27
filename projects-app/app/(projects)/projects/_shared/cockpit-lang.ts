import { cookies } from "next/headers";
import { defaultLanguage } from "@/lib/quiz";

// ЯЗЫК КОКПИТА ДЛЯ СЕРВЕРНЫХ КОМПОНЕНТОВ (2026-07-27). Серверная пара клиентского `useUiLang()`: тот же
// выбор владельца, чтобы серверно-отрисованный текст (хабы категорий, индекс проектов, заголовки секций)
// следовал за селектором в футере, а не застревал на языке платформы по умолчанию.
//
// Приоритет: ручной выбор (cookie `fractera-ui-lang`, его ставит `setUiLang` в футере), иначе
// `defaultLanguage()` (первый из NEXT_PUBLIC_SUPPORTED_LANGUAGES, англ. если не задан). Мусор в cookie
// игнорируется (валидация «две буквы»). Селектор дёргает `router.refresh()` → серверный компонент
// перечитывает cookie и перерисовывается в выбранном языке БЕЗ перезагрузки страницы.
export async function cockpitLang(): Promise<string> {
  const picked = (await cookies()).get("fractera-ui-lang")?.value;
  return picked && /^[a-z]{2}$/.test(picked) ? picked : defaultLanguage();
}
