"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GeoJSON as GeoJSONLayer, Map as LeafletMap } from "leaflet"
import "leaflet/dist/leaflet.css"
import { Loader2, X, MapPin, Download, Send, MessagesSquare } from "lucide-react"
import { HelpNote } from "./help-note.client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mapPanelStrings } from "./map-panel-i18n"

// ПАНЕЛЬ «Map settings» — Region Quiz (закон владельца 2026-07-25): БЕСЕДА с уточнениями доводит регион до
// точности (там, где одиночный вызов ИИ мажет: «Волгоград» → Южный ФО, не Приволжский). Диалог ведёт
// `/api/map-regions/quiz` по инструкции: на каждом ходу либо следующий вопрос, либо готовый набор регионов,
// СВЕРЕННЫЙ с реальным каталогом Geofabrik → чекбоксы только существующего (размер·время). Отмеченные
// склеиваются osmium'ом. Карта снизу — предпросмотр границ. Никакого бензина (не предмет проекта).
type Turn = { role: "user" | "assistant"; content: string }
type Suggestion = { id: string; name: string; pbfUrl: string | null; sizeBytes: number | null; geometry?: unknown }
type Health = { osrm: boolean; geocoder: boolean }
type Provision = { region?: string; state: string; step?: string }
type Base = { config: { region: string } | null; health: Health; provision: Provision }

const LANG = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2)
const STYLE_ON = { color: "#2563eb", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.35 }
const STYLE_OFF = { color: "#94a3b8", weight: 1, fillColor: "#94a3b8", fillOpacity: 0.1 }

function sizeTime(bytes: number | null, lang: string): string {
  if (!bytes) return ""
  const mb = bytes / 1e6
  const min = Math.max(5, Math.round((mb / 300) * 40)) // Иль-де-Франс ~300 МБ ≈ 40 мин
  const size = mb >= 1000 ? `${(mb / 1000).toFixed(1)} ГБ` : `${Math.round(mb)} МБ`
  const time = min >= 90 ? `~${(min / 60).toFixed(1)} ${lang === "ru" ? "ч" : "h"}` : `~${min} ${lang === "ru" ? "мин" : "min"}`
  return `≈ ${size} · ${time}`
}

export function MapPanel({ onClose }: { onClose: () => void }) {
  const t = mapPanelStrings(LANG)
  const [base, setBase] = useState<Base | null>(null)
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", content: t.quizGreeting }])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const chatEnd = useRef<HTMLDivElement>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null)
  const layerRef = useRef<GeoJSONLayer | null>(null)

  const loadBase = useCallback(() => {
    fetch("/api/map-settings", { cache: "no-store" }).then((r) => r.json()).then(setBase).catch(() => setError(t.loadError))
  }, [t.loadError])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !mapEl.current || mapRef.current) return
      LRef.current = L
      const map = L.map(mapEl.current, { worldCopyJump: true }).setView([25, 10], 2)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map)
      mapRef.current = map
      loadBase()
    })()
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }) }, [turns, thinking])

  const busy = base?.provision?.state === "downloading" || base?.provision?.state === "processing"
  useEffect(() => {
    if (!busy) return
    const id = setInterval(loadBase, 5000)
    return () => clearInterval(id)
  }, [busy, loadBase])

  // Границы подобранных регионов; отмеченные ярче. Клик по границе — тумблер.
  const redraw = useCallback((items: Suggestion[], on: Set<string>) => {
    const L = LRef.current, map = mapRef.current
    if (!L || !map) return
    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feats: any[] = items.filter((s) => s.geometry).map((s) => ({ type: "Feature", properties: { id: s.id }, geometry: s.geometry }))
    if (feats.length === 0) return
    const layer = L.geoJSON(feats, {
      style: (f: { properties: { id: string } }) => (on.has(f.properties.id) ? STYLE_ON : STYLE_OFF),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEachFeature: (f: any, lyr: any) => lyr.on("click", () => toggle(f.properties.id)),
    }).addTo(map)
    layerRef.current = layer
    try { const b = layer.getBounds(); if (b.isValid()) map.fitBounds(b.pad(0.15)) } catch { /* пусто */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id)
      if (suggestions) redraw(suggestions, next)
      return next
    })
  }

  // Один ход беседы: добавляем реплику пользователя, спрашиваем сервер, получаем ЛИБО вопрос, ЛИБО регионы.
  const send = async () => {
    const msg = draft.trim()
    if (!msg || thinking) return
    const nextTurns: Turn[] = [...turns, { role: "user", content: msg }]
    setTurns(nextTurns); setDraft(""); setThinking(true); setError(null)
    try {
      const d = await fetch("/api/map-regions/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turns: nextTurns, lang: LANG }) }).then((r) => r.json())
      if (d.error === "no_ai_key") { setError(t.noKey); return }
      if (d.question) { setTurns((p) => [...p, { role: "assistant", content: d.question }]); return }
      // готово → чекбоксы
      const items: Suggestion[] = (d.regions ?? []).filter((r: Suggestion) => r.pbfUrl)
      if (items.length === 0) { setTurns((p) => [...p, { role: "assistant", content: t.noneFound }]); return }
      setSuggestions(items)
      const on = new Set(items.map((s) => s.id)); setChecked(on); redraw(items, on)
    } catch { setError(t.loadError) } finally { setThinking(false) }
  }

  const download = async () => {
    const urls = (suggestions ?? []).filter((s) => checked.has(s.id) && s.pbfUrl).map((s) => s.pbfUrl!)
    if (urls.length === 0) return
    setError(null)
    const r = await fetch("/api/map-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "provision", pbfUrls: urls }) })
    if (!r.ok) { const e = await r.json().catch(() => ({})); setError(e.error || t.loadError); return }
    loadBase()
  }

  const Dot = ({ up }: { up: boolean }) => <span className={`inline-block size-2 rounded-full ${up ? "bg-emerald-500" : "bg-rose-500"}`} />

  return (
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <MapPin size={13} className="text-muted-foreground mr-2" />
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          {t.title}
          <HelpNote title="Maps — your own routing engine, and what it is for">
            <p>
              <strong>What it is.</strong> A map engine running on your server, built from OpenStreetMap
              data: routing and geocoding, behind one address your automations call. No third-party map
              key, no per-request billing, no quota that stops your business on a busy day.
            </p>
            <p>
              <strong>What it can answer.</strong> An address into coordinates. A route from A to B with
              its distance and driving time. A matrix of distances and times between many points at once.
              And the best order to visit a set of stops — the classic travelling-salesman solve.
            </p>
            <p>
              <strong>What that is worth in practice.</strong> A courier with twelve deliveries: the matrix
              gives every pair of times, the tour solve gives the order that spends the least time driving.
              Fuel follows from the same numbers — total distance times your consumption — so &ldquo;which
              route is cheapest today&rdquo; stops being a guess. The same answers give an honest delivery
              window to a customer, tell you whether an address falls inside your service area, and let a
              dispatcher compare two plans before anyone leaves the depot.
            </p>
            <p>
              <strong>Why it is here and not bought.</strong> Commercial map APIs charge per request, and
              routing is the kind of thing an automation does thousands of times. Self-hosting turns a
              growing bill into fixed disk and CPU that you already pay for.
            </p>
            <p>
              <strong>What it costs.</strong> One region at a time. The engine holds an extract — a country
              or an area — and importing a new one takes minutes and disk. Choose the region you actually
              work in, not the largest one available.
            </p>
            <p>
              <strong>Where it is weak.</strong> It knows roads, not traffic: times come from speed limits
              and road classes, not from what is happening right now. Treat them as reliable planning
              numbers rather than live estimates.
            </p>
          </HelpNote>
        </span>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X size={13} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 w-full">
        <p className="text-[12px] text-muted-foreground leading-relaxed">{t.intro}</p>
        {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
          <span className="flex items-center gap-1.5"><Dot up={!!base?.health?.osrm} /> {t.osrm}</span>
          <span className="flex items-center gap-1.5"><Dot up={!!base?.health?.geocoder} /> {t.geocoder}</span>
          {base?.config ? <span className="text-muted-foreground">{t.currentRegion}: <span className="font-mono text-foreground">{base.config.region}</span></span> : null}
          <button type="button" onClick={loadBase} className="ml-auto text-muted-foreground hover:text-foreground underline">{t.reload}</button>
        </div>

        {busy ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
            <Loader2 size={13} className="animate-spin" /> {t.downloading} {base?.provision?.region} — {base?.provision?.step}
          </div>
        ) : null}

        {/* Region Quiz — беседа */}
        <div className="rounded-lg border border-border flex flex-col">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border text-[11px] font-semibold text-muted-foreground">
            <MessagesSquare size={12} /> Region assistant
          </div>
          <div className="flex flex-col gap-2 p-3 max-h-52 overflow-y-auto">
            {turns.map((m, i) => (
              <div key={i} className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[85%]"}>
                <div className={`rounded-lg px-3 py-1.5 text-[12px] leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{m.content}</div>
              </div>
            ))}
            {thinking ? <div className="self-start flex items-center gap-1.5 text-[12px] text-muted-foreground"><Loader2 size={12} className="animate-spin" />{t.thinking}</div> : null}
            <div ref={chatEnd} />
          </div>
          <div className="flex items-center gap-2 p-2 border-t border-border">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send() }} placeholder={t.askPh} disabled={thinking} className="h-8 text-[12px]" />
            <Button size="sm" onClick={send} disabled={thinking || !draft.trim()}><Send size={13} /></Button>
          </div>
        </div>

        {/* Чекбоксы доступных регионов (уже сверены с каталогом) */}
        {suggestions && suggestions.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-foreground">{t.checkLabel}</span>
            <ul className="flex flex-col rounded-md border border-border divide-y divide-border">
              {suggestions.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                  <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggle(s.id)} className="size-4" />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-muted-foreground tabular-nums">{sizeTime(s.sizeBytes, LANG)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={download} disabled={busy || checked.size === 0}><Download size={12} className="mr-1" />{t.download}</Button>
              <span className="text-[11px] text-muted-foreground">{t.provisioningNote}</span>
            </div>
          </div>
        ) : null}

        {/* Предпросмотр границ на карте */}
        <div ref={mapEl} className="w-full rounded-lg border border-border overflow-hidden" style={{ height: 300 }} />
      </div>
    </div>
  )
}
