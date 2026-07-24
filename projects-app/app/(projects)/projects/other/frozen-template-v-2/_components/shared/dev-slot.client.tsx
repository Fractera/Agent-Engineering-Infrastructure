"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { BuildTarget } from "../../../../_shared-v2";

// FAIL-SILENT ДЕВ-СЛОТ — клиентская половина (закон устойчивости, шаг 298).
//
// Это ЕДИНСТВЕННОЕ место во всей папке автоматизации, которому разрешён внешний импорт, и ровно один путь —
// `_shared-v2` (мягкий дев-слой). Публичные (рантайм) компоненты его не импортируют вовсе (гейт
// `scripts/check-entity-imports.mjs`).
//
// Дев-кнопка «Строить вместе с ИИ» тянется ДИНАМИЧЕСКИМ импортом (`next/dynamic`, `ssr:false`,
// `loading:()=>null`) за React error-boundary с null-фолбёком. Модуль не загрузился/бросил → рисуется
// ничего; серверный продакшн-контент уже отрисован независимо. Серверная половина (`dev-slot.tsx`) вдобавок
// НЕ монтирует этот клиент, пока `_shared-v2` физически отсутствует.

/** Ловит любой сбой мягкого слоя и превращает его в пустоту — продакшн это не задевает. */
class NullBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Барель `_shared-v2` экспортирует `BuildWithAi` по имени — переносим его в `default`, которого ждёт
// `dynamic`; не загрузилось — отдаём компонент-пустышку, и это НЕ ошибка, а штатная деградация.
const BuildWithAiLazy = dynamic(
  () =>
    import("../../../../_shared-v2")
      .then((m) => ({ default: m.BuildWithAi }))
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

/** Дроп-ин замена прежнего `BuildWithAi` из папки: та же форма пропсов, но за fail-silent границей. */
export function DevBuildWithAi(props: { target: BuildTarget; name: string; pending?: string; lang: string }) {
  return (
    <NullBoundary>
      <BuildWithAiLazy {...props} />
    </NullBoundary>
  );
}
