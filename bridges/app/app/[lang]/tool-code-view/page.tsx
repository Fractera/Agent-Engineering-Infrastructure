// Инструмент «code-view» — своя страница (шаг 501, 2026-08-09).
//
// Всё общее (описание, требования, установка, адрес назначения, справка) держит
// каркас `ToolPage`: четыре копии этой разметки разошлись бы при первой правке.
// Здесь остаётся только то, что отличает ЭТОТ инструмент, и место под будущий
// разворот — владелец доведёт страницу до посадочной.
//
// Динамическая: состояние установки живое.

import { Code2 } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { ToolPage } from "../_components/tool-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  return <ToolPage id="code-view" lang={lang} s={s} icon={Code2} />;
}
