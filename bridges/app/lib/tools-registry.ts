// Реестр микро-инструментов (шаг 501, решение владельца 2026-08-09).
//
// ЧТО ЭТО. Маленькие переиспользуемые куски, которые панель применяет для себя и
// отдаёт продуктовому слою: обрезка изображения, подрезка видео, голосовой ввод.
// Живут в `bridges/app/_tools/<id>/{client,server,types}` — одной папкой на
// инструмент, чтобы «взять инструмент» значило «скопировать папку», а не
// «выследить семь файлов по дереву».
//
// 🔒 МОДЕЛЬ РАСПРОСТРАНЕНИЯ — УСТАНОВКА КОПИЕЙ, А НЕ ВЫЗОВ ПО СЕТИ.
// Продуктовый слой не читает инструмент из панели в рантайме. Он ставит копию в
// свой `tools/<id>/` и дальше правит её как собственный код. Причина в природе
// инструмента: его почти всегда допиливают под задачу. Чтение по сети означало
// бы либо запрет на правки, либо расхождение между тем, что установлено, и тем,
// что работает. Копия снимает вопрос: после установки это обычный код проекта,
// он едет с `git push` и живёт своей жизнью.
//
// Побочная выгода той же конструкции: приложение не зависит от панели в
// рантайме. Панель можно выключить — установленный инструмент продолжит
// работать.

export type ToolId = "image-crop" | "video-trim" | "voice-input" | "code-view" | "translations-dialog";

export type ToolNeed = "browser" | "openai-key" | "https" | "ffmpeg";

export type Tool = {
  id: ToolId;
  /** Папка в панели — она же то, что копируется в проект. */
  dir: string;
  /** Файлы инструмента относительно его папки. Список явный: копируем ровно это. */
  files: string[];
  /** Что должно быть на месте, чтобы инструмент заработал. */
  needs: ToolNeed[];
  /** Где он уже применяется в самой панели — доказательство, что он живой. */
  usedBy: string[];
  /**
   * Пакеты npm, которых у стартера НЕТ и которые придётся поставить.
   *
   * Список честный и проверенный, а не «на всякий случай»: три инструмента из
   * четырёх обходятся тем, что в стартере уже стоит (React, Next, lucide-react,
   * sonner, shadcn Button), и требовать для них установку значило бы посылать
   * владельца делать лишнюю работу. Пустой список = ничего ставить не нужно.
   */
  npmDeps: string[];
};

export const TOOLS: Tool[] = [
  {
    id: "image-crop",
    dir: "_tools/image-crop",
    files: ["client/image-cropper.client.tsx"],
    // Ничего, кроме браузера: холст, перетаскивание, масштаб. Сервер узнаёт
    // только результат — готовый JPEG.
    needs: ["browser"],
    usedBy: ["media", "app-settings"],
    npmDeps: [],
  },
  {
    id: "video-trim",
    dir: "_tools/video-trim",
    files: ["client/video-trimmer.client.tsx"],
    // Клиент выбирает границы, режет сервер: ffmpeg живёт в слое данных, и
    // переносить его в браузер незачем.
    needs: ["browser", "ffmpeg"],
    usedBy: ["media"],
    npmDeps: [],
  },
  {
    id: "voice-input",
    dir: "_tools/voice-input",
    files: [
      "client/voice-input.client.tsx",
      "client/voice-input-i18n.ts",
      "server/transcribe.ts",
      "types/voice-input.ts",
    ],
    // Микрофон браузер отдаёт только по HTTPS, расшифровку делает OpenAI.
    needs: ["browser", "https", "openai-key"],
    usedBy: [],
    npmDeps: [],
  },
  {
    id: "code-view",
    dir: "_tools/code-view",
    files: ["client/code-view.client.tsx", "types/code-view.ts"],
    needs: ["browser"],
    usedBy: ["media"],
    // ЕДИНСТВЕННЫЙ инструмент, которому нужен пакет: Shiki несёт грамматики
    // языков, и подсветку без них не сделать. В панели он уже стоит; в проекте
    // владельца его придётся поставить, и страница говорит об этом до установки.
    npmDeps: ["shiki"],
  },
  {
    id: "translations-dialog",
    dir: "_tools/translations-dialog",
    files: [
      "client/translations-dialog.client.tsx",
      "client/translation-cell.client.tsx",
      "client/use-translations.ts",
      "types/translations.ts",
    ],
    needs: ["browser", "openai-key"],
    usedBy: ["top-menu", "footer-pages"],
    npmDeps: [],
  },
];

export function isToolId(v: string): v is ToolId {
  return TOOLS.some((t) => t.id === v);
}

export function toolById(id: ToolId): Tool {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) throw new Error(`unknown tool: ${id}`);
  return t;
}
