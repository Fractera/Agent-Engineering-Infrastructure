import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return result;
}

export function serializeEnv(vars: Record<string, string>): string {
  if (!Object.keys(vars).length) return "";
  return Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

export function readEnvFile(file: string): Record<string, string> {
  try {
    return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf-8")) : {};
  } catch {
    return {};
  }
}

export function writeEnvFile(file: string, vars: Record<string, string>): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, serializeEnv(vars), "utf-8");
  hardenSecretFile(file);
}

// 🔒 Права 600 ставятся ОТДЕЛЬНЫМ вызовом, а не параметром записи (шаг 501,
// дефект найден замером 2026-08-09).
//
// Почему это не тонкость: маршруты по всему проекту писали секреты с
// `{ mode: 0o600 }` и выглядели правильными, но параметр `mode` у
// `writeFileSync` действует ТОЛЬКО при СОЗДАНИИ файла. Все эти файлы создал
// установщик с обычной маской, поэтому каждая последующая запись оставляла 644 —
// замысел был, а действия не произошло ни разу. Замер на живом сервере: ключ
// OpenAI, ключ Resend, секрет Google, DATA_SECRET и DEPLOY_SECRET лежали в файлах,
// читаемых любым пользователем системы.
//
// `chmodSync` действует всегда, независимо от того, существовал файл или нет.
// Ошибку глотаем: файл уже записан, и потеря прав не должна отменять сохранение —
// но и молчать нельзя, поэтому пишем в журнал процесса.
export function hardenSecretFile(file: string): void {
  try {
    fs.chmodSync(file, 0o600);
  } catch (e) {
    console.warn(`[env-file] не удалось ограничить права ${file}: ${String(e)}`);
  }
}

// Detached pm2 restart so the admin route can return BEFORE pm2 kills
// whichever process is serving this very request (same trick used in
// app/api/config/security/route.ts).
export function pm2RestartDetached(processName: string, delayMs = 500): void {
  setTimeout(() => {
    const child = spawn("sh", ["-c", `pm2 reload ${processName}`], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }, delayMs);
}
