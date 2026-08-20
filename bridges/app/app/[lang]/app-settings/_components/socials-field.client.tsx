"use client";

// КОНСТРУКТОР СОЦСЕТЕЙ — ПОЛНЫЙ ЦИКЛ ОТ ФРАЗЫ ДО РАБОЧЕЙ ССЫЛКИ (шаг 523).
//
// 🔒 ЧТО ЭТО ЗАМЕНИЛО. Здесь стояли ЧЕТЫРЕ поля ввода — Twitter, GitHub, LinkedIn,
// Facebook, — и пятая сеть не добавлялась вовсе. Свободное поле не знает правила
// сборки адреса: у Telegram это `t.me/<псевдоним>`, у WhatsApp `wa.me/<номер>`, у
// LinkedIn личный профиль это `/in/`, а не `/company/`. Владелец вводил псевдоним
// и получал нерабочий адрес, о чём панель молчала.
//
// 🔒 ЦИКЛ, А НЕ ОЦИФРОВКА НАЗВАНИЯ. Владелец говорит одну фразу — голосом или
// текстом: «добавь мой Instagram, профиль латиницей, транслитерацией, слова через
// дефис». Дальше три разных дела, и ни одно не делается полем ввода:
//   1. распознать сеть и её правило ссылки — дверь `api/config/social-resolve`;
//   2. ПРОВЕРИТЬ кандидатов живьём — та же дверь, три исхода;
//   3. положить значок в проект — дверь `api/config/social-icon`.
// Выбирает из кандидатов ЧЕЛОВЕК: у проверки три исхода, и «закрыта» значит
// «сеть не пускает посторонних», а не «профиля нет».
//
// 🔒 МИКРОФОН ЗДЕСЬ НЕ СВОЙ. Голос принимает существующий инструмент
// `_tools/voice-input` — тот же, что в опросе продуктов и редакторе документов.
// Второго микрофона в панели быть не должно: их поведение разъедется, и чинить
// придётся дважды.

import { useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";
import { previewUrl } from "./upload";
import {
  type SocialLink,
  type LegacySocial,
  socialHref,
  currentLinks,
  freeId,
} from "../_lib/socials";

export type SocialsLabels = {
  phraseLabel: string; phrasePlaceholder: string; phraseHint: string;
  recognize: string; recognizing: string;
  noKey: string; unknownNetwork: string; modelFailed: string;
  candidates: string; ownValue: string; add: string;
  outcomeExists: string; outcomeAbsent: string; outcomeClosed: string; outcomeHint: string;
  empty: string; remove: string; valueLabel: string;
  manualTitle: string; manualName: string; manualTemplate: string; manualValue: string;
  iconFailed: string; legacyNotice: string;
};

type Outcome = "exists" | "absent" | "closed";
type Candidate = { value: string; url: string; outcome: Outcome; code: number | null };
type Proposal = {
  name: string; iconSlug: string; urlTemplate: string; valueHint: string; candidates: Candidate[];
};

/** Цвет исхода — ровно три, потому что исходов три. */
const OUTCOME_STYLE: Record<Outcome, string> = {
  exists: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent: "bg-muted text-muted-foreground",
  closed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export function SocialsField({
  links,
  legacy,
  lang,
  labels,
  onChange,
}: {
  links: SocialLink[] | undefined;
  legacy: LegacySocial | undefined;
  lang: string;
  labels: SocialsLabels;
  onChange: (next: SocialLink[]) => void;
}) {
  // Показываем наследство, пока владелец конструктора не трогал: иначе он видит
  // пустой список при четырёх живых ссылках в подвале и решает, что они пропали.
  const shown = useMemo(() => currentLinks(links, legacy), [links, legacy]);
  const seeded = !Array.isArray(links) && shown.length > 0;

  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ownValue, setOwnValue] = useState("");
  const [manual, setManual] = useState<{ name: string; urlTemplate: string; value: string } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const outcomeLabel = (o: Outcome) =>
    o === "exists" ? labels.outcomeExists : o === "absent" ? labels.outcomeAbsent : labels.outcomeClosed;

  async function recognize() {
    if (!phrase.trim() || busy) return;
    setBusy(true);
    setNote(null);
    setProposal(null);
    setManual(null);
    try {
      const r = await fetch("/api/config/social-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, lang }),
      });
      const d = await r.json();
      if (d?.ok) {
        setProposal(d as Proposal);
        setOwnValue("");
        return;
      }
      // Отказ называется своим именем, и у КАЖДОГО есть выход руками: без ключа
      // конструктор перестал бы работать вовсе, а сети заводить надо и без него.
      setNote(
        d?.reason === "no-key"
          ? labels.noKey
          : d?.reason === "unknown-network"
            ? labels.unknownNetwork
            : labels.modelFailed,
      );
      setManual({ name: "", urlTemplate: "", value: "" });
    } catch {
      setNote(labels.modelFailed);
      setManual({ name: "", urlTemplate: "", value: "" });
    } finally {
      setBusy(false);
    }
  }

  /** Значок скачивается ОДИН раз — при добавлении записи, а не на каждый показ. */
  async function fetchIcon(slug: string): Promise<string | undefined> {
    if (!slug) return undefined;
    try {
      const r = await fetch("/api/config/social-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const d = await r.json();
      return d?.ok ? (d.url as string) : undefined;
    } catch {
      return undefined;
    }
  }

  async function addFrom(p: Proposal, value: string) {
    const v = value.trim().replace(/^@/, "");
    if (!v) return;
    setBusy(true);
    const icon = await fetchIcon(p.iconSlug);
    // Значка нет — запись всё равно заводится: подвал нарисует общий знак.
    if (!icon) setNote(labels.iconFailed);
    onChange([
      ...shown,
      {
        id: freeId(p.iconSlug || p.name, shown.map((l) => l.id)),
        name: p.name,
        urlTemplate: p.urlTemplate,
        value: v,
        icon,
      },
    ]);
    setProposal(null);
    setPhrase("");
    setOwnValue("");
    setBusy(false);
  }

  function addManual() {
    if (!manual?.name.trim() || !manual.urlTemplate.trim()) return;
    onChange([
      ...shown,
      {
        id: freeId(manual.name, shown.map((l) => l.id)),
        name: manual.name.trim(),
        urlTemplate: manual.urlTemplate.trim(),
        value: manual.value.trim().replace(/^@/, ""),
      },
    ]);
    setManual(null);
    setPhrase("");
    setNote(null);
  }

  function editValue(i: number, value: string) {
    onChange(shown.map((l, k) => (k === i ? { ...l, value } : l)));
  }

  function remove(i: number) {
    // Пустой список — законное решение владельца «сетей нет», и слот его уважает:
    // массив ЕСТЬ, значит наследство больше не воскресает.
    onChange(shown.filter((_, k) => k !== i));
  }

  return (
    <div className="flex flex-col gap-2.5">
      {seeded && <p className="text-[9px] text-muted-foreground">{labels.legacyNotice}</p>}

      {/* ── Что уже заведено ─────────────────────────────────────────────── */}
      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-[10px] text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((link, i) => {
            const href = socialHref(link);
            const src = previewUrl(link.icon);
            return (
              <li key={link.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" aria-hidden className="size-4 dark:invert" />
                  ) : (
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                <span className="w-24 shrink-0 truncate text-[11px] text-foreground">{link.name}</span>
                <Input
                  value={link.value}
                  onChange={(e) => editValue(i, e.target.value)}
                  aria-label={`${link.name} — ${labels.valueLabel}`}
                  className="h-7 flex-1 text-[11px] font-mono"
                />
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={href}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title={labels.remove}
                  aria-label={`${labels.remove}: ${link.name}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Фраза ────────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-dashed border-border p-2">
        <label className="text-[11px] text-foreground" htmlFor="social-phrase">
          {labels.phraseLabel}
        </label>
        <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{labels.phraseHint}</p>
        <textarea
          id="social-phrase"
          ref={field}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={labels.phrasePlaceholder}
          rows={2}
          className="mt-1.5 w-full resize-y rounded-md border border-border bg-muted px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <Button size="xs" onClick={recognize} disabled={busy || !phrase.trim()} className="text-[11px]">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {busy ? labels.recognizing : labels.recognize}
          </Button>
          {/* Тот же микрофон, что и везде в панели. Второго здесь нет намеренно. */}
          <VoiceInput targetRef={field} value={phrase} onChange={setPhrase} lang={lang} apiUrl="/api/transcribe" />
        </div>
        {note && <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">{note}</p>}
      </div>

      {/* ── Кандидаты ────────────────────────────────────────────────────── */}
      {proposal && (
        <div className="rounded-md border border-border p-2">
          <p className="text-[11px] font-medium text-foreground">{proposal.name}</p>
          {proposal.valueHint && <p className="mt-0.5 text-[9px] text-muted-foreground">{proposal.valueHint}</p>}

          <p className="mt-2 text-[10px] text-muted-foreground">{labels.candidates}</p>
          <p className="text-[9px] leading-relaxed text-muted-foreground">{labels.outcomeHint}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {proposal.candidates.map((c) => (
              <li key={c.value} className="flex items-center gap-2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${OUTCOME_STYLE[c.outcome]}`}>
                  {outcomeLabel(c.outcome)}
                </span>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex-1 truncate font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {c.url}
                </a>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={busy}
                  onClick={() => addFrom(proposal, c.value)}
                  className="text-[10px]"
                >
                  <Plus size={10} />
                  {labels.add}
                </Button>
              </li>
            ))}
          </ul>

          {/* Ни один кандидат не подошёл — значение вводится руками, а правило
              сборки адреса всё равно берётся распознанное. */}
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={ownValue}
              onChange={(e) => setOwnValue(e.target.value)}
              placeholder={labels.ownValue}
              className="h-7 flex-1 text-[11px] font-mono"
            />
            <Button
              size="xs"
              variant="outline"
              disabled={busy || !ownValue.trim()}
              onClick={() => addFrom(proposal, ownValue)}
              className="text-[10px]"
            >
              <Plus size={10} />
              {labels.add}
            </Button>
          </div>
        </div>
      )}

      {/* ── Руками ───────────────────────────────────────────────────────── */}
      {manual && (
        <div className="rounded-md border border-border p-2">
          <p className="text-[11px] font-medium text-foreground">{labels.manualTitle}</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            <Input
              value={manual.name}
              onChange={(e) => setManual({ ...manual, name: e.target.value })}
              placeholder={labels.manualName}
              className="h-7 text-[11px]"
            />
            <Input
              value={manual.urlTemplate}
              onChange={(e) => setManual({ ...manual, urlTemplate: e.target.value })}
              placeholder={labels.manualTemplate}
              className="h-7 text-[11px] font-mono"
            />
            <Input
              value={manual.value}
              onChange={(e) => setManual({ ...manual, value: e.target.value })}
              placeholder={labels.manualValue}
              className="h-7 text-[11px] font-mono"
            />
            <Button
              size="xs"
              variant="outline"
              disabled={!manual.name.trim() || !manual.urlTemplate.trim()}
              onClick={addManual}
              className="w-fit text-[10px]"
            >
              <Plus size={10} />
              {labels.add}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
