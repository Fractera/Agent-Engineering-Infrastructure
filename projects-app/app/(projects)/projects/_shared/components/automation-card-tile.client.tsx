"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { createAutomationStrings } from "../create-automation-i18n";
import { isPendingDeletion, clearPendingDeletion, announcePendingDeletion } from "./pending-deletions.client";

const POLL_MS = 8000;

// СТРОКИ УДАЛЕНИЯ С КАРТОЧКИ (владелец, 2026-07-27) — десять языков (закон 4г). Отдельный крохотный словарь,
// чтобы не разбирать структуру create-automation-i18n. Удаление с карточки нужно ИМЕННО для сломанных
// автоматизаций: если рождение прошло неудачно, страница отдаёт 404 и внутреннюю Danger zone не открыть —
// карточка остаётся навсегда. Здесь удаляется ВСЯ автоматизация (та же дверь `api/projects/delete`), поэтому
// подтверждение обязательно (как в Danger zone). Слаг подставляется в дверь программно (карточка знает себя).
type CardDelStrings = { aria: string; title: string; body: string; confirm: string; cancel: string; fail: string };
const CARD_DEL_I18N: Record<string, CardDelStrings> = {
  en: { aria: "Delete automation", title: "Delete this automation", body: "This is permanent. The whole automation — its nodes, components, data and run history — is removed and cannot be recovered.", confirm: "Delete permanently", cancel: "Cancel", fail: "Could not delete the automation." },
  ru: { aria: "Удалить автоматизацию", title: "Удалить эту автоматизацию", body: "Это необратимо. Вся автоматизация — её узлы, компоненты, данные и история запусков — удаляется без возможности восстановления.", confirm: "Удалить навсегда", cancel: "Отмена", fail: "Не удалось удалить автоматизацию." },
  es: { aria: "Eliminar automatización", title: "Eliminar esta automatización", body: "Esto es permanente. Toda la automatización — sus nodos, componentes, datos e historial de ejecución — se elimina y no se puede recuperar.", confirm: "Eliminar permanentemente", cancel: "Cancelar", fail: "No se pudo eliminar la automatización." },
  fr: { aria: "Supprimer l'automatisation", title: "Supprimer cette automatisation", body: "C'est définitif. Toute l'automatisation — ses nœuds, composants, données et historique d'exécution — est supprimée et ne peut pas être récupérée.", confirm: "Supprimer définitivement", cancel: "Annuler", fail: "Impossible de supprimer l'automatisation." },
  it: { aria: "Elimina automazione", title: "Elimina questa automazione", body: "Questa azione è permanente. L'intera automazione — i suoi nodi, componenti, dati e cronologia delle esecuzioni — viene rimossa e non può essere recuperata.", confirm: "Elimina definitivamente", cancel: "Annulla", fail: "Impossibile eliminare l'automazione." },
  de: { aria: "Automatisierung löschen", title: "Diese Automatisierung löschen", body: "Dies ist dauerhaft. Die gesamte Automatisierung — ihre Knoten, Komponenten, Daten und Ausführungshistorie — wird entfernt und kann nicht wiederhergestellt werden.", confirm: "Endgültig löschen", cancel: "Abbrechen", fail: "Automatisierung konnte nicht gelöscht werden." },
  pt: { aria: "Eliminar automação", title: "Eliminar esta automação", body: "Isto é permanente. Toda a automação — os seus nós, componentes, dados e histórico de execução — é removida e não pode ser recuperada.", confirm: "Eliminar permanentemente", cancel: "Cancelar", fail: "Não foi possível eliminar a automação." },
  pl: { aria: "Usuń automatyzację", title: "Usuń tę automatyzację", body: "To działanie jest nieodwracalne. Cała automatyzacja — jej węzły, komponenty, dane i historia uruchomień — zostaje usunięta i nie można jej odzyskać.", confirm: "Usuń na stałe", cancel: "Anuluj", fail: "Nie udało się usunąć automatyzacji." },
  tr: { aria: "Otomasyonu sil", title: "Bu otomasyonu sil", body: "Bu kalıcıdır. Otomasyonun tamamı — düğümleri, bileşenleri, verileri ve çalıştırma geçmişi — kaldırılır ve geri alınamaz.", confirm: "Kalıcı olarak sil", cancel: "İptal", fail: "Otomasyon silinemedi." },
  nl: { aria: "Automatisering verwijderen", title: "Deze automatisering verwijderen", body: "Dit is permanent. De hele automatisering — de nodes, componenten, gegevens en uitvoeringsgeschiedenis — wordt verwijderd en kan niet worden hersteld.", confirm: "Permanent verwijderen", cancel: "Annuleren", fail: "Kon de automatisering niet verwijderen." },
};
const cardDelStrings = (lang: string): CardDelStrings => CARD_DEL_I18N[lang.toLowerCase().slice(0, 2)] ?? CARD_DEL_I18N.en;

/** The compact one-line status row (owner's fix): the SAME four signals the automation's own page shows in
 *  its top bar (AutomationStatePill's type badge + active state, AutomationModeIndicators' Hook/Cron pills)
 *  — condensed to fit atop a card. Computed server-side (category-hub.server.tsx already reads the
 *  filesystem for the card itself) and passed down as plain data, no extra client fetch. */
export type CardStatus = {
  typeLabel: string;
  /** The type badge's own established colour classes (automation-type.ts) — kept as-is, NOT part of the
   *  active/inactive blue-or-grey scheme below (type is fixed identity, not a toggle). */
  typeBadgeClass: string;
  active: boolean;
  activeLabel: string;
  hook: boolean;
  hookLabel: string;
  cron: boolean;
  cronLabel: string;
};

function StatusRow({ status }: { status: CardStatus }) {
  const dot = (on: boolean, label: string) => (
    <span className={on ? "font-bold text-blue-600 dark:text-blue-400" : "font-normal text-muted-foreground"}>
      •&nbsp;{label}
    </span>
  );
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className={`rounded border px-1.5 py-0.5 font-medium ${status.typeBadgeClass}`}>{status.typeLabel}</span>
      {dot(status.active, status.activeLabel)}
      {dot(status.hook, status.hookLabel)}
      {dot(status.cron, status.cronLabel)}
    </div>
  );
}

// ONE hub card, now a client component so it can check (owner's fix, mirrors the pending-CREATION card)
// whether it was JUST deleted by this same browser and, if so, show a muted spinner instead of a normal
// link — polling its own URL until the background rebuild actually removes the route (404/4xx/5xx), then
// dropping out of view entirely. A card that was NOT just deleted here renders exactly as before (same
// markup/classes as the previous inline `<Link>` in category-hub.server.tsx) — zero visible change for the
// overwhelming common case, PLUS the new status row on top.
export function AutomationCardTile({
  category, slug, href, title, description, badges, more, status,
}: {
  category: string;
  slug: string;
  href: string;
  title: string;
  description: string;
  badges: string[];
  more: number;
  status: CardStatus;
}) {
  const lang = useUiLang();
  const L = createAutomationStrings(lang);
  const D = cardDelStrings(lang);
  const [deleting, setDeleting] = useState(false);
  const [gone, setGone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDeleting(isPendingDeletion(category, slug));
  }, [category, slug]);

  // Удаление ВСЕЙ автоматизации той же дверью, что Danger zone. Слаг = `confirm` (дверь его требует) шлём
  // программно — карточка знает себя; подтверждение здесь = защита от случайного клика. Успех → помечаем
  // pending-deletion (карточка уходит в «deleting» и опрашивает URL до 404 после фоновой пересборки).
  async function del() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/delete`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ automation: `${category}/${slug}`, confirm: slug }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok) { toast.error(d.error ?? D.fail); return; }
      announcePendingDeletion(category, slug);
      setConfirmOpen(false);
      setDeleting(true);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!deleting) return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch(href, { method: "GET", cache: "no-store", redirect: "manual" });
        if (!alive) return;
        if (r.status === 404 || r.status >= 400) {
          clearPendingDeletion(category, slug);
          setGone(true);
          clearInterval(t);
        }
      } catch { /* network hiccup during the pm2 reload window — keep polling */ }
    }, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [deleting, href, category, slug]);

  if (gone) return null;

  if (deleting) {
    return (
      <div data-automation-card={slug} className="flex flex-col rounded-xl border border-dashed bg-muted/30 p-5 opacity-70" aria-busy="true">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-muted-foreground">{title}</h3>
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{L.pendingDeleting}</p>
      </div>
    );
  }

  return (
    <div
      data-automation-card={slug}
      className="group relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      {/* Растянутая ссылка — вся карточка кликабельна для перехода; кнопка удаления выше по z-слою её перекрывает,
          поэтому клик по корзине НЕ уводит в автоматизацию. Валидный HTML: кнопка не вложена в <a>. */}
      <Link href={href} aria-label={title} className="absolute inset-0 rounded-xl" />
      <StatusRow status={status} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{title}</h3>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={D.aria}
            title={D.aria}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmOpen(true); }}
            className="relative z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </span>
      </div>
      {description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
      {(badges.length > 0 || more > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <span key={b} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
              {b}
            </span>
          ))}
          {more > 0 && (
            <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">+{more}</span>
          )}
        </div>
      )}

      {/* ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ (как в Danger zone). Удаляет ВСЮ автоматизацию + карточку; работает и на
          сломанной 404-й, потому что действует по `категория/slug`, не открывая саму автоматизацию. */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!busy) setConfirmOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="size-4" /> {D.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{D.body}</p>
          <p className="text-sm">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{slug}</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>{D.cancel}</Button>
            <Button variant="destructive" onClick={del} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {D.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
