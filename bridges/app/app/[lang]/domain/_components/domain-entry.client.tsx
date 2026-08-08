"use client";

// Ввод домена (шаг 501, Ф2, партия 9). Показывается, пока домен не сохранён.
//
// Островок из-за живой проверки написанного: имя нормализуется на каждом нажатии
// (`https://`, `www.`, косая черта и регистр отрезаются), и человек сразу видит,
// что именно будет сохранено. Отдать это формой без JS значило бы узнавать об
// опечатке после перезагрузки — на странице, где опечатка ведёт к неверным
// записям DNS у регистратора.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EntryLabels = {
  intro: string; label: string; placeholder: string; invalid: string;
  cloudflareWarning: string; save: string; saving: string; saved: string; failed: string;
};

// Нормализация и проверка — те же, что в старой панели, дословно.
const normalize = (raw: string) =>
  raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}$/;

export function DomainEntry({ labels }: { labels: EntryLabels }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const normalized = normalize(input);
  const valid = DOMAIN_RE.test(normalized);

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      // Только ЗАПИСЬ домена: certbot здесь не запускается — это отдельный шаг,
      // который человек нажимает сам, увидев записи DNS.
      const r = await fetch("/api/config/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: normalized }),
      });
      const d = await r.json();
      if (d.error) { toast.error(String(d.error)); return; }
      toast.success(labels.saved);
      router.refresh();
    } catch {
      toast.error(labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-muted-foreground">{labels.intro}</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-foreground">{labels.label}</label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && valid) void save(); }}
          placeholder={labels.placeholder}
          className="h-8 text-[11px]"
        />
        {input.trim() && !valid && <p className="text-[10px] text-destructive">{labels.invalid}</p>}
        {/* Видно, что именно сохранится: адрес, набранный со схемой или www,
            обрезается до апекса, и человек это замечает ДО сохранения. */}
        {input.trim() && valid && normalized !== input.trim().toLowerCase() && (
          <p className="font-mono text-[10px] text-muted-foreground">→ {normalized}</p>
        )}
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
        {labels.cloudflareWarning}
      </div>

      <Button size="sm" onClick={save} disabled={!valid || saving} className="text-[11px]">
        {saving && <Loader2 size={11} className="animate-spin" />}
        {saving ? labels.saving : labels.save}
      </Button>
    </div>
  );
}
