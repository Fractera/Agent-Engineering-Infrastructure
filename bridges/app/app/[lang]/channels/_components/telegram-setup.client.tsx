"use client";

// Настройка Telegram (шаг 501, Ф2, партия 11). Островок, и все три его дела
// требуют браузера по-разному:
//   • токен бота — это СЕКРЕТ, форма без JS отправила бы его перезагрузкой и
//     оставила в истории навигации;
//   • переключатель канала должен отвечать сразу, иначе непонятно, сработал ли;
//   • привязка учётной записи ЖДЁТ действия человека в другом приложении —
//     страница опрашивает сервер, пока в Telegram не нажмут «Старт».
//
// Опрос устроен как в старой панели, дословно: одноразовый код в ссылке, проверка
// каждые 2 секунды, предел 10 минут. Код одноразовый не ради красоты — ссылка
// открывается в мессенджере, где её видно, и переиспользуемый код позволил бы
// привязать чужую учётную запись.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type TelegramLabels = {
  tokenLabel: string; tokenPlaceholder: string; tokenReplace: string;
  save: string; saving: string; saved: string; failed: string;
  connect: string; relink: string; waiting: string; openTelegram: string;
  linked: string; linkTimeout: string; linkExpired: string; linkFailed: string;
  channelOn: string;
  scheduleLabel: string; scheduleHint: string; scheduleOff: string;
  scheduleEvery: string; scheduleSaved: string;
};

export function TelegramSetup(
  { configured, enabled, tickSeconds, labels }:
    { configured: boolean; enabled: boolean; tickSeconds: number; labels: TelegramLabels },
) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(tickSeconds);

  // 🔒 ШАГ ВЫБИРАЕТСЯ ИЗ СПИСКА, А НЕ ВВОДИТСЯ ЧИСЛОМ. Свободное поле здесь
  // означает «поставлю единицу и посмотрю»: служба стучит в приложение, и
  // цена ошибки — постоянная нагрузка, которую никто не заметит месяцами.
  // Служба всё равно зажимает значение в 30…3600, но объяснять это отказом
  // формы дороже, чем не дать ошибиться.
  const STEPS = [0, 60, 300, 900, 3600];

  async function saveTick(next: number) {
    const before = tick;
    setTick(next);
    try {
      const r = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickSeconds: next }),
      });
      if (!r.ok) { setTick(before); setError(labels.failed); return; }
      toast.success(labels.scheduleSaved);
      router.refresh();
    } catch {
      // Служба не ответила — возвращаем прежнее значение: показать выбранное
      // как сохранённое значит соврать о состоянии сервера.
      setTick(before);
      setError(labels.failed);
    }
  }

  async function saveToken() {
    setSaving(true); setError(null);
    try {
      const r = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(String(d.error ?? `${r.status}`)); return; }
      setToken("");
      toast.success(labels.saved);
      router.refresh();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(on: boolean) {
    try {
      await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: on }),
      });
    } finally {
      // Правду показывает сервер: если служба отказала, состояние вернётся прежним.
      router.refresh();
    }
  }

  async function startLink() {
    setLinking(true); setError(null); setDeepLink(null);
    try {
      const r = await fetch("/api/channels/telegram/link", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.deepLink) {
        setError(String(d.error ?? labels.linkFailed));
        setLinking(false);
        return;
      }
      setDeepLink(d.deepLink);
      window.open(d.deepLink, "_blank", "noopener");

      const deadline = Date.now() + 10 * 60_000;
      const tick = async () => {
        if (Date.now() > deadline) { setLinking(false); setError(labels.linkTimeout); return; }
        const p = await fetch(`/api/channels/telegram/link?code=${encodeURIComponent(d.code)}`, { cache: "no-store" });
        const s = await p.json().catch(() => ({}));
        if (s.status === "linked") {
          setLinking(false); setDeepLink(null);
          toast.success(`${labels.linked} ${s.who ?? s.chatId}`);
          router.refresh();
          return;
        }
        if (s.status === "expired") { setLinking(false); setError(labels.linkExpired); return; }
        setTimeout(tick, 2000);
      };
      setTimeout(tick, 2000);
    } catch (e) {
      setLinking(false);
      setError(String((e as Error).message ?? e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[10px] text-muted-foreground">{labels.channelOn}</span>
        <Switch checked={enabled} disabled={!configured} onCheckedChange={toggle} aria-label={labels.channelOn} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-muted-foreground">{labels.tokenLabel}</span>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={configured ? labels.tokenReplace : labels.tokenPlaceholder}
            autoComplete="off"
            className="h-8 flex-1 font-mono text-[11px]"
          />
          <Button variant="outline" size="sm" onClick={saveToken} disabled={saving || !token.trim()} className="text-[11px]">
            {saving && <Loader2 size={11} className="animate-spin" />}
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-3">
        <span className="text-[10px] text-muted-foreground">{labels.scheduleLabel}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((n) => (
            <Button
              key={n}
              variant={tick === n ? "default" : "outline"}
              size="sm"
              disabled={!configured}
              onClick={() => saveTick(n)}
              className="h-7 text-[11px]"
            >
              {n === 0 ? labels.scheduleOff : labels.scheduleEvery.replace("{n}", String(n))}
            </Button>
          ))}
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.scheduleHint}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={startLink} disabled={!configured || linking} className="text-[11px]">
          {linking ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
          {linking ? labels.waiting : labels.connect}
        </Button>
        {deepLink && (
          <a href={deepLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline underline-offset-2">
            {labels.openTelegram}
          </a>
        )}
      </div>

      {error && <p className="text-[11px] leading-relaxed break-words text-destructive">{error}</p>}
    </div>
  );
}
