// Образцы кода — ЧИСТЫЕ ДАННЫЕ, без единой зависимости.
//
// Отдельно от `code-samples.ts` по причине, которая дважды стоила упавшей сборки
// (антипаттерн `client-island-imports-server-module`): островок берёт отсюда
// список расширений и правило имени, а сосед читает диск через `fs`.

/**
 * Что можно загрузить. Список — форматы, в которых живёт настоящий фронтенд;
 * исполняемого среди них нет и быть не должно: это склад ОБРАЗЦОВ, файлы отсюда
 * никто не запускает, их читает человек и агент.
 */
export const ALLOWED_EXT = [
  "html", "css", "scss", "js", "jsx", "ts", "tsx", "json", "md", "txt", "svg",
] as const;

export type SampleExt = (typeof ALLOWED_EXT)[number];

/**
 * Имя без пути и без сюрпризов. Косая черта, точки-переходы и пробелы
 * отсеиваются здесь, а не «где-нибудь дальше»: сервер потом ещё раз сверится со
 * своим списком файлов, но пускать заведомо кривое имя до диска незачем.
 */
export const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function isValidName(name: string): boolean {
  return NAME_RE.test(name) && !name.includes("..");
}

export function isAllowedExt(ext: string): ext is SampleExt {
  return (ALLOWED_EXT as readonly string[]).includes(ext);
}

/** Полное имя файла образца: `<имя>.<расширение>`. */
export function fileNameOf(name: string, ext: string): string {
  return `${name}.${ext}`;
}
