"use client";

// Подбор региона: беседа → чекбоксы → загрузка (шаг 501, Ф2, партия 7).
//
// Единственный островок раздела, и он неизбежен целиком: беседа с уточнениями,
// карта Leaflet с кликом по границе и выбор чекбоксами — это взаимодействие.
// Полоса показаний над ним читается сервером, поэтому состояние карты видно и без
// JS; выбирать регион без JS действительно нельзя, и это честная граница.
//
// ПОЧЕМУ БЕСЕДА, А НЕ ОДИН ВОПРОС (закон владельца 2026-07-25): одиночный вызов
// ИИ мажет — «Волгоград» уезжает в Южный ФО вместо Приволжского. Уточняющий
// диалог доводит регион до точности, а результат СВЕРЯЕТСЯ с живым каталогом
// Geofabrik, поэтому в чекбоксах только то, что действительно существует, с
// честным размером и временем.
//
// Копия логики панели старой оболочки; изменения: подписи пропсами из словаря,
// `router.refresh()` после запуска загрузки (полосу показаний рисует сервер), и
// опрос состояния идёт обновлением страницы, а не вторым источником правды.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GeoJSON as GeoJSONLayer, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Download, Send, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PickerLabels = {
  assistant: string; greeting: string; askPh: string; thinking: string;
  checkLabel: string; noneFound: string; download: string; provisioningNote: string;
  loadError: string; noKey: string;
  sizeGb: string; sizeMb: string; hours: string; minutes: string;
};

type Turn = { role: "user" | "assistant"; content: string };
type Suggestion = { id: string; name: string; pbfUrl: string | null; sizeBytes: number | null; geometry?: unknown };

const STYLE_ON = { color: "#2563eb", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.35 };
const STYLE_OFF = { color: "#94a3b8", weight: 1, fillColor: "#94a3b8", fillOpacity: 0.1 };

export function RegionPicker(
  { lang, busy, labels }: { lang: string; busy: boolean; labels: PickerLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", content: labels.greeting }]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const chatEnd = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const layerRef = useRef<GeoJSONLayer | null>(null);

  // Leaflet грузится лениво: он весит заметно, и платить за него на страницах,
  // где карты нет, незачем.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { worldCopyJump: true }).setView([25, 10], 2);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, thinking]);

  // Пока идёт загрузка карты, состояние обновляет СЕРВЕР — страница
  // перерисовывается целиком, поэтому второго источника правды не появляется.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => startTransition(() => router.refresh()), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const sizeTime = useCallback((bytes: number | null): string => {
    if (!bytes) return "";
    const mb = bytes / 1e6;
    // Иль-де-Франс ≈ 300 МБ ≈ 40 мин — отсюда и пропорция.
    const min = Math.max(5, Math.round((mb / 300) * 40));
    const size = mb >= 1000 ? `${(mb / 1000).toFixed(1)} ${labels.sizeGb}` : `${Math.round(mb)} ${labels.sizeMb}`;
    const time = min >= 90 ? `~${(min / 60).toFixed(1)} ${labels.hours}` : `~${min} ${labels.minutes}`;
    return `≈ ${size} · ${time}`;
  }, [labels]);

  const redraw = useCallback((items: Suggestion[], on: Set<string>) => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feats: any[] = items.filter((s) => s.geometry)
      .map((s) => ({ type: "Feature", properties: { id: s.id }, geometry: s.geometry }));
    if (feats.length === 0) return;
    const layer = L.geoJSON(feats, {
      style: (f: { properties: { id: string } }) => (on.has(f.properties.id) ? STYLE_ON : STYLE_OFF),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEachFeature: (f: any, lyr: any) => lyr.on("click", () => toggle(f.properties.id)),
    }).addTo(map);
    layerRef.current = layer;
    try { const b = layer.getBounds(); if (b.isValid()) map.fitBounds(b.pad(0.15)); } catch { /* пусто */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (suggestions) redraw(suggestions, next);
      return next;
    });
  };

  async function send() {
    const msg = draft.trim();
    if (!msg || thinking) return;
    const nextTurns: Turn[] = [...turns, { role: "user", content: msg }];
    setTurns(nextTurns); setDraft(""); setThinking(true); setError(null);
    try {
      const d = await fetch("/api/map-regions/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: nextTurns, lang }),
      }).then((r) => r.json());

      if (d.error === "no_ai_key") { setError(labels.noKey); return; }
      if (d.question) { setTurns((p) => [...p, { role: "assistant", content: d.question }]); return; }

      const items: Suggestion[] = (d.regions ?? []).filter((r: Suggestion) => r.pbfUrl);
      if (items.length === 0) {
        setTurns((p) => [...p, { role: "assistant", content: labels.noneFound }]);
        return;
      }
      setSuggestions(items);
      const on = new Set(items.map((s) => s.id));
      setChecked(on);
      redraw(items, on);
    } catch {
      setError(labels.loadError);
    } finally {
      setThinking(false);
    }
  }

  async function download() {
    const urls = (suggestions ?? []).filter((s) => checked.has(s.id) && s.pbfUrl).map((s) => s.pbfUrl!);
    if (urls.length === 0) return;
    setError(null);
    const r = await fetch("/api/map-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "provision", pbfUrls: urls }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setError(String(e.error || labels.loadError));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      {error && <p className="mb-2 text-[12px] text-rose-600">{error}</p>}

      <div className="flex flex-col rounded-lg border border-border">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          <MessagesSquare size={12} /> {labels.assistant}
        </div>
        <div className="flex max-h-52 flex-col gap-2 overflow-y-auto p-3">
          {turns.map((m, i) => (
            <div key={i} className={m.role === "user" ? "max-w-[85%] self-end" : "max-w-[85%] self-start"}>
              <div className={`rounded-lg px-3 py-1.5 text-[12px] leading-relaxed ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-1.5 self-start text-[12px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />{labels.thinking}
            </div>
          )}
          <div ref={chatEnd} />
        </div>
        <div className="flex items-center gap-2 border-t border-border p-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            placeholder={labels.askPh}
            disabled={thinking}
            className="h-8 text-[12px]"
          />
          <Button size="sm" onClick={send} disabled={thinking || !draft.trim()} aria-label={labels.assistant}>
            <Send size={13} />
          </Button>
        </div>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-foreground">{labels.checkLabel}</span>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggle(s.id)} className="size-4" />
                <span className="flex-1">{s.name}</span>
                <span className="tabular-nums text-muted-foreground">{sizeTime(s.sizeBytes)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={download} disabled={busy || checked.size === 0}>
              <Download size={12} className="mr-1" />{labels.download}
            </Button>
            <span className="text-[11px] text-muted-foreground">{labels.provisioningNote}</span>
          </div>
        </div>
      )}

      <div ref={mapEl} className="mt-3 w-full overflow-hidden rounded-lg border border-border" style={{ height: 300 }} />
    </>
  );
}
