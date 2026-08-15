// Карта группы «Дизайн» — рубрикатор с текущим состоянием (2026-08-15).
//
// 🔒 НЕ ОБЩИЙ `GroupMap`, И ЭТО ОСОЗНАННО. Тот перечисляет разделы — для восьми
// других групп этого хватает: там вопрос «куда идти». У дизайна вопрос другой —
// «как сейчас выглядит мой сайт», и ответ разбросан по четырём страницам. Список
// ссылок заставил бы обойти все четыре ради того, что помещается в один экран.
//
// Динамическая: состояние читается из живого файла настроек.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { DesignMap } from "./_components";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <DesignMap lang={lang} s={getAdminStrings(lang)} />;
}
