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
// Диаграмма (микросервис `components/diagram`) — ПЛАТФОРМЕННЫЙ ВИД над ядром: холст + адаптер живут одной
// копией здесь, автоматизация владеет только данными графа (AGENTS.md §0a).
export { Diagram } from "./components/diagram/client/diagram.client";
// Обрезка изображения (Кокпит-инструмент `tools/image-crop`) — ОДИН переиспользуемый примитив всей группы
// v2: когда владелец вручную кладёт в склад запись-изображение, поле зовёт этот инструмент, а не свою
// вторую реализацию кадрирования. Чисто клиентский (canvas → JPEG-blob), сервер не нужен.
export { ImageCropper } from "./tools/image-crop/client/image-crop.client";
export type { CropMode, ImageCropperProps } from "./tools/image-crop/types/image-crop";
// Кокпит-инструмент «добавить объект» (микросервис `components/storage`) — ручная запись изображения в
// склад: crop → объектное хранилище (`api/files`) → строка базы (`api/rows`). Дев-инструмент, монтируется
// в папку автоматизации через dev-slot; сам тянет crop из соседнего `tools/image-crop`.
export { StorageAddObject } from "./components/storage/client/add-object.client";
export type { StorageAddObjectProps } from "./components/storage/types/storage";
// Кокпит-инструмент «добавить строку» локальной базы (микросервис `components/database`): имя + опционально
// изображение (crop → объектное хранилище → ссылка в `storageIds`). Каждая строка по умолчанию несёт
// массивы связей `storageIds`/`vectorIds` (закон складов — связи всех-ко-всем).
export { DatabaseAddRow } from "./components/database/client/add-row.client";
export type { DatabaseAddRowProps } from "./components/database/types/database";
// Кокпит-инструмент «добавить запись» векторной памяти (микросервис `components/vector-memory`) — третий
// склад v2 тем же образцом: имя + текст-факт + опционально изображение (crop → объектное хранилище → ссылка
// в `storageIds`). Дев-инструмент, монтируется в папку автоматизации через dev-slot.
export { VectorMemoryAddRecord } from "./components/vector-memory/client/add-record.client";
export type { VectorMemoryAddRecordProps } from "./components/vector-memory/types/vector-memory";
