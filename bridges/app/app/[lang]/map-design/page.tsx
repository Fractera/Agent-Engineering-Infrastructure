// Карта группы «design» — страница-маршрутизатор (2026-08-15).
//
// Вся разметка в общем `GroupMap`: список разделов берётся из навигации, так что
// второго списка, который можно забыть обновить, не существует. Здесь остаётся
// только пояснение — почему эти разделы стоят вместе.
//
// Динамическая: заголовки разделов приходят из словаря по языку адреса.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { GroupMap } from "../_components/group-map";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  return <GroupMap group="design" lang={lang} s={s} intro={s.groupMaps["design"]} />;
}
