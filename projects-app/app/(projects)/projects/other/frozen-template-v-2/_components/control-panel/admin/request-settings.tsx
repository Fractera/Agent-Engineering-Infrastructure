import { DevControlPanelSettings } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА пульта — ТОНКИЙ МОНТАЖ (шаг 298, рефакторинг «микросервисы»).
//
// Вся суть настройки запроса (аккордеон, таблица объявленных полей, словарь) переехала в микросервис
// `_shared-v2/components/control-panel/{client,server,types}` и читает объявление формы из ядра САМА через
// дверь `api/core`. Здесь остаётся только подключение административного слоя через fail-silent дев-слот:
// нет `_shared-v2` — настройки нет, публичный пульт работает как ни в чём не бывало.
//
// Вызывающий (`../index.tsx`) уже оборачивает админ-блок в `<DevSlot>`, поэтому здесь только сам компонент.
export default function RequestSettings({ lang }: { lang: string }) {
  return <DevControlPanelSettings lang={lang} />;
}
