// ЖУРНАЛ ПРОГОНОВ — append-only JSONL внутри папки (_data/runtime/runs.jsonl), закон 0. Одна строка =
// один прогон: когда начат/завершён, успех/провал, отчёт по узлам. Хранилище локальное (не платформенный
// lib/runs-store), потому что папка обязана переноситься как ZIP.
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const RUNTIME_DIR = join(process.cwd(), "app", "(projects)", "projects", "other", "frozen-template-v-2", "_data", "runtime");
const RUNS_FILE = join(RUNTIME_DIR, "runs.jsonl");

export type RunRecord = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  nodes: Array<{ cuid: string; name: string; fn: string; status: string; error?: string }>;
};

export async function appendRun(run: RunRecord): Promise<void> {
  await mkdir(RUNTIME_DIR, { recursive: true });
  await appendFile(RUNS_FILE, `${JSON.stringify(run)}\n`, "utf8");
}

export async function listRuns(limit = 50): Promise<RunRecord[]> {
  try {
    const raw = await readFile(RUNS_FILE, "utf8");
    const runs = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as RunRecord);
    return runs.slice(-limit).reverse();
  } catch {
    return []; // no runs yet
  }
}
