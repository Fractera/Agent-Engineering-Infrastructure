"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onRunCompleted } from "./run-events";

// АВТООБНОВЛЕНИЕ ДАННЫХ СТРАНИЦЫ — монтируется ОДИН раз на всю автоматизацию (`_components/index.tsx`).
// Услышал «прогон завершён» — просит Next перечитать серверные данные (`router.refresh()`), и КАЖДАЯ
// секция страницы перерисовывается свежей: таблица дашборда, будущие календарь и аналитика. Ни одной
// секции не нужно ничего знать про обновление — это закон страницы, а не забота таблицы.
//
// Почему `router.refresh()`, а не клиентский fetch в каждой таблице: таблицы — СЕРВЕРНЫЕ компоненты и
// работают без JavaScript (канон статики). Обновление — надстройка поверх них: JS выключен — таблица
// по-прежнему верна на момент загрузки; JS включён — она обновляется сама, без перезагрузки страницы.
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => onRunCompleted(() => router.refresh()), [router]);
  return null;
}
