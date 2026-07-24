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

// Панель пользовательских кейсов — тот же fail-silent путь. Пропсов нет: язык и двери она берёт сама
// (`useUiLang` + `location.pathname`). Нет `_shared-v2` — панель просто не появляется, продакшн не задет.
const UseCasesPanelLazy = dynamic(
  () =>
    import("../../../../_shared-v2")
      .then((m) => ({ default: m.UseCasesPanel }))
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

/** Панель кейсов за fail-silent границей — монтируется секцией кокпита. */
export function DevUseCasesPanel() {
  return (
    <NullBoundary>
      <UseCasesPanelLazy />
    </NullBoundary>
  );
}

// Полоса-уведомление — провайдер (единый источник) + сама полоса, тот же fail-silent путь. Провайдер сам
// тянет поводы из двери `api/projects/notices`; язык приходит пропсом. Нет `_shared-v2` — полосы нет вовсе.
const NotificationsLazy = dynamic(
  () =>
    import("../../../../_shared-v2")
      .then((m) => {
        const { NotificationProvider, NotificationBanner } = m;
        const Mounted = ({ lang }: { lang: string }) => (
          <NotificationProvider>
            <NotificationBanner lang={lang} />
          </NotificationProvider>
        );
        return { default: Mounted };
      })
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

/** Провайдер + полоса-уведомление за fail-silent границей — монтируется в шапке кокпита под статус-баром. */
export function DevNotifications({ lang }: { lang: string }) {
  return (
    <NullBoundary>
      <NotificationsLazy lang={lang} />
    </NullBoundary>
  );
}

// Центр проблем — провайдер (единый источник открытых предупреждений) + панель-модалка, тот же fail-silent
// путь. Нет `_shared-v2` — центра нет вовсе, продакшн не задет.
const WarningsLazy = dynamic(
  () =>
    import("../../../../_shared-v2")
      .then((m) => {
        const { WarningProvider, ProblemsCenter } = m;
        const Mounted = ({ lang }: { lang: string }) => (
          <WarningProvider>
            <ProblemsCenter lang={lang} />
          </WarningProvider>
        );
        return { default: Mounted };
      })
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

/** Провайдер + Центр проблем за fail-silent границей — монтируется в шапке кокпита. */
export function DevWarnings({ lang }: { lang: string }) {
  return (
    <NullBoundary>
      <WarningsLazy lang={lang} />
    </NullBoundary>
  );
}

// Настройка запроса (админ-половина пульта) — тот же fail-silent путь. Объявление формы она читает сама
// через дверь `api/core`, поэтому пропсов, кроме языка, ей не нужно.
const ControlPanelSettingsLazy = dynamic(
  () =>
    import("../../../../_shared-v2")
      .then((m) => ({ default: m.ControlPanelSettings }))
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

/** Настройка запроса за fail-silent границей — монтируется под пультами в кокпите. */
export function DevControlPanelSettings({ lang }: { lang: string }) {
  return (
    <NullBoundary>
      <ControlPanelSettingsLazy lang={lang} />
    </NullBoundary>
  );
}

// Диаграмма — ПЛАТФОРМЕННЫЙ ВИД (AGENTS.md §0a): холст живёт одной копией в `_shared-v2`, автоматизация
// владеет только данными графа. Данные холст читает сам через дверь `api/core`.
const DiagramLazy = dynamic(
  () =>
    import("../../../../_shared-v2")
      .then((m) => ({ default: m.Diagram }))
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

/** Холст диаграммы за fail-silent границей — монтируется в разделе «diagram». */
export function DevDiagram({ lang, readOnly }: { lang: string; readOnly?: boolean }) {
  return (
    <NullBoundary>
      <DiagramLazy lang={lang} readOnly={readOnly} />
    </NullBoundary>
  );
}

// ⚠ ДАШБОРДА ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО (закон владельца 2026-07-24). Таблица — продуктовая поверхность с
// режимом «строить вместе с ИИ»: её логика живёт в `_components/dashboard/public/`, где агент читает и
// правит её по заявке. В дев-слое у дашборда только форма заявки (`DevBuildWithAi`), она уже есть выше.
