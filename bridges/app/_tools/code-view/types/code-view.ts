// ТИПЫ и определение языка для просмотрщика кода.
//
// Файл без зависимостей: его читают и клиент, и сервер, и он уезжает в чужие
// проекты вместе с инструментом.

export type CodeViewLabels = { loading: string };

/**
 * Расширение файла → язык грамматики Shiki.
 *
 * Соответствие явное, а не «взять расширение как есть»: `.mjs` это javascript,
 * `.yml` это yaml, а неизвестное расширение обязано стать `text`, иначе Shiki
 * бросит исключение на попытке загрузить несуществующую грамматику.
 */
const BY_EXT: Record<string, string> = {
  html: "html", htm: "html",
  css: "css", scss: "scss", sass: "sass", less: "less",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx",
  json: "json", jsonc: "jsonc",
  md: "markdown", mdx: "mdx",
  yml: "yaml", yaml: "yaml",
  sh: "bash", bash: "bash", zsh: "bash",
  sql: "sql", py: "python", rb: "ruby", go: "go", rs: "rust",
  php: "php", java: "java", kt: "kotlin", swift: "swift",
  toml: "toml", ini: "ini", xml: "xml", svg: "xml",
  env: "dotenv", dockerfile: "docker",
  txt: "text",
};

export function langOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) {
    // Файлы без расширения, у которых язык определяет имя.
    return filename.toLowerCase() === "dockerfile" ? "docker" : "text";
  }
  return BY_EXT[filename.slice(dot + 1).toLowerCase()] ?? "text";
}
