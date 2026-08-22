"use client";

// Источник чужого проекта: репозиторий или папка на машине владельца (533-2).
//
// Островок ради одного действия — назвать источник и сохранить. Слова приходят
// с сервера: словарь панели на 82 языка в браузер не уезжает.
//
// 🔒 ЧУЖИЕ КЛЮЧИ КОНФИГА СОХРАНЯЮТСЯ — пишем в тот же файл, где живут
// выключатели возможностей и режим разработки. Отправить одну свою ветку значило
// бы стереть остальные.

import { useState } from "react";
import { Loader2, Save, Check, GitBranch, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** То, что лежит в `PLATFORM-CONFIG.migration`. Форма общая с приложением. */
export type MigrationRecord = {
  source?: "repository" | "local";
  repositoryUrl?: string;
  /** Папка на машине владельца. Сервер туда не ходит — адрес нужен агенту, который работает у него. */
  localPath?: string;
  declaredAt?: string;
};

type SourceId = NonNullable<MigrationRecord["source"]>;

export type MigrationLabels = {
  save: string; saving: string; saved: string; failed: string;
  nothingToSave: string; invalidUrl: string;
  repoLabel: string; repoBody: string;
  repoField: string; repoPlaceholder: string; repoHint: string;
  localLabel: string; localBody: string; localHint: string;
  localField: string; localPlaceholder: string;
};

export function MigrationSource(
  { config, initial, labels }: {
    config: Record<string, unknown>;
    initial: MigrationRecord;
    labels: MigrationLabels;
  },
) {
  const [source, setSource] = useState<SourceId>(initial.source ?? "repository");
  const [url, setUrl] = useState(initial.repositoryUrl ?? "");
  const [localPath, setLocalPath] = useState(initial.localPath ?? "");
  const [saving, setSaving] = useState(false);
  const [savedSource, setSavedSource] = useState(initial.source);
  const [savedUrl, setSavedUrl] = useState(initial.repositoryUrl ?? "");
  const [savedPath, setSavedPath] = useState(initial.localPath ?? "");

  const trimmed = url.trim();
  const trimmedPath = localPath.trim();
  const dirty =
    source !== savedSource ||
    (source === "repository" && trimmed !== savedUrl) ||
    (source === "local" && trimmedPath !== savedPath);

  async function save() {
    if (!dirty) { toast.error(labels.nothingToSave); return; }
    // 🔒 АДРЕС ПРОВЕРЯЕТСЯ ДО ЗАПИСИ, А НЕ ПРИ ЧТЕНИИ. Кривой адрес, сохранённый
    // молча, всплыл бы у агента в начале следующей сессии — там, где владельца
    // уже нет рядом, чтобы его поправить.
    if (source === "repository") {
      let valid = false;
      try { const u = new URL(trimmed); valid = u.protocol === "http:" || u.protocol === "https:"; } catch { valid = false; }
      if (!valid) { toast.error(labels.invalidUrl); return; }
    }
    setSaving(true);
    try {
      const record: MigrationRecord = {
        source,
        // Папке на машине владельца адрес не нужен, и хранить прошлый значило бы
        // держать в конфиге данные, которых решение больше не касается.
        ...(source === "repository" ? { repositoryUrl: trimmed } : {}),
        ...(source === "local" && trimmedPath ? { localPath: trimmedPath } : {}),
        declaredAt: new Date().toISOString(),
      };
      const res = await fetch("/api/config/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config: { ...config, migration: record } }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      setSavedSource(source);
      setSavedUrl(source === "repository" ? trimmed : "");
      setSavedPath(source === "local" ? trimmedPath : "");
      toast.success(labels.saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  const items: { id: SourceId; label: string; body: string; icon: typeof GitBranch }[] = [
    { id: "repository", label: labels.repoLabel, body: labels.repoBody, icon: GitBranch },
    { id: "local", label: labels.localLabel, body: labels.localBody, icon: FolderOpen },
  ];

  return (
    <div className="space-y-2">
      {items.map(({ id, label, body, icon: Icon }) => {
        const chosen = source === id;
        return (
          <div
            key={id}
            className={`rounded-lg border p-3 transition-colors ${
              chosen ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            {/* Карточка — label с радио, а не кнопка: внутри живёт поле ввода, и
                выбор обязан переживать выключенный JavaScript. */}
            <label className="flex w-full cursor-pointer items-start gap-2.5 text-left">
              <input
                type="radio"
                name="migration-source"
                className="sr-only"
                checked={chosen}
                onChange={() => setSource(id)}
              />
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  chosen ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {chosen && <Check size={10} />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <Icon size={12} />{label}
                </span>
                <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">{body}</span>
              </span>
            </label>

            {id === "repository" && chosen && (
              <div className="mt-2.5 pl-6">
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {labels.repoField}
                </label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={labels.repoPlaceholder}
                  className="h-8 text-[12px]"
                  spellCheck={false}
                />
                <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">{labels.repoHint}</p>
              </div>
            )}

            {id === "local" && chosen && (
              <div className="mt-2.5 pl-6">
                {/* 🔒 ПУТЬ СПРАШИВАЕТСЯ ЗДЕСЬ, ХОТЯ СЕРВЕР ТУДА НЕ ХОДИТ (владелец
                    2026-08-22). Панель этой папки не видит и видеть не может — адрес
                    нужен агенту, который работает у владельца на машине, и он читает
                    его из той же записи конфига. Поле необязательное: у владельца
                    один проект открыт в редакторе, и агент найдёт его сам. */}
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {labels.localField}
                </label>
                <Input
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder={labels.localPlaceholder}
                  className="h-8 text-[12px]"
                  spellCheck={false}
                />
                <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                  {labels.localHint}
                </p>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  );
}
