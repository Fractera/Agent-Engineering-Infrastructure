// _shared-v2 — СТАНДАРТНЫЙ ИНТЕРФЕЙС ПОДКЛЮЧЕНИЯ мягкого дев/админ-слоя автоматизаций v2 (шаг 298).
//
// ЗАКОН УСТОЙЧИВОСТИ «продакшн твёрдый, разработка мягкая». Всё, что нужно КОНЕЧНОМУ пользователю после
// того, как разработка окончена (ядро, функции узлов, публичные компоненты и их рантайм-функции), живёт
// ВНУТРИ папки автоматизации и зависит только от `zod` + node-builtins — папка запускается сама по себе и
// уезжает ZIP-архивом. Всё, что нужно ТОЛЬКО чтобы автоматизацию разрабатывать/настраивать («Строить
// вместе с ИИ», админ-настройки компонентов, генератор кода, служебное), — одна копия на все автоматизации
// живёт ЗДЕСЬ, снаружи.
//
// Папка автоматизации тянет этот слой ЕДИНСТВЕННЫМ разрешённым внешним путём — `_shared-v2` — и ТОЛЬКО из
// своего fail-silent дев-слота (`_components/shared/dev-slot.tsx` + `dev-slot.client.tsx`): динамический
// импорт за error-boundary с null-фолбэком. Сломан/отсутствует `_shared-v2` — дев-кнопки не появляются,
// продакшн не задет. Публичные (рантайм) компоненты `_shared-v2` не импортируют вовсе (гейт
// `scripts/check-entity-imports.mjs`).
//
// Этот барель — стабильная точка входа: подключающийся импортирует отсюда, а не из внутренних файлов, и
// перестановка файлов внутри слоя его не касается.
export { default as BuildWithAi, type BuildTarget } from "./build-with-ai.client";
// Панель пользовательских кейсов (микросервис `components/use-cases`) — дев-инструмент первой стадии
// автоматизации (согласование кейсов с ИИ + ревью-гейт). Подключается тем же fail-silent дев-слотом.
export { UseCasesPanel } from "./components/use-cases/client/panel.client";
// Полоса-уведомление (микросервис `components/notifications`) — провайдер (единый источник поводов из ядра
// через дверь `api/projects/notices`) + сама полоса. Дев-инструмент кокпита, подключается дев-слотом.
export { NotificationProvider } from "./components/notifications/client/provider.client";
export { NotificationBanner } from "./components/notifications/client/banner.client";
// Центр проблем (микросервис `components/warnings`) — провайдер (единый источник открытых предупреждений
// из ядра через дверь `api/projects/warnings`) + панель-модалка. Дев-инструмент кокпита.
export { WarningProvider } from "./components/warnings/client/provider.client";
export { ProblemsCenter } from "./components/warnings/client/panel.client";
// Настройка запроса (микросервис `components/control-panel`) — админ-половина пульта: читает объявление
// формы из ядра автоматизации через её дверь `api/core` и показывает поля каждого пульта.
export { ControlPanelSettings } from "./components/control-panel/client/settings.client";
// Диаграмма (микросервис `components/diagram`) — ПЛАТФОРМЕННЫЙ ВИД над ядром: холст + адаптер живут одной
// копией здесь, автоматизация владеет только данными графа (AGENTS.md §0a).
export { Diagram } from "./components/diagram/client/diagram.client";
// Дашборд (микросервис `components/dashboard`) — ПЕРЕНОС ТАБЛИЦЫ v1 «max copy»: универсальная таблица по
// объявлению (8 типов колонок, действия строки, live-lookup, дебаунс-поиск, пагинация, выбор колонок с
// памятью), разделённый вид (одна/две таблицы) и админ-хром (добавить/править/удалить) через мост.
export { Dashboard } from "./components/dashboard/client/dashboard.client";
export { DashboardSettings } from "./components/dashboard/client/settings.client";
