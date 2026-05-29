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
