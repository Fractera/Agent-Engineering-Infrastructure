"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { drawerStrings } from "./entity-drawer-i18n";
import { MediaPreview } from "../tools/media-viewer/client/media-viewer.client";

// 🔒 ЯЩИК СУЩНОСТИ — ОДИН на всю автоматизацию (шаг 328, требование владельца).
//
// ЗАЧЕМ. Клик по метке карты или по строке любой таблицы обязан открывать ВСЮ сущность: её запись в
// основной базе и все грани — объекты, память, метки, события. До этого связи писались и были обоюдными
// (311.9а), но прочитать их владелец не мог ниоткуда: он видел метку и упирался в неё.
//
// ПОЧЕМУ ЗДЕСЬ, А НЕ ВО ВКЛАДКЕ. Ящик — атрибут ВСЕЙ сущности, а не карты: «должен существовать для всех
// аккордеонов». Поэтому он живёт ОДНОЙ копией рядом с общей таблицей и включается по построению — вкладка
// не подключает его руками и не может забыть. Тот же закон, что у общего интерфейса таблиц.
//
// ПРОСМОТР ОБЪЕКТОВ — ТОЛЬКО `media-viewer` (шаг 323): изображение · видео · аудио · PDF · текст и честная
// ссылка для неизвестного типа. Второго просмотрщика в проекте быть не должно.
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

export type DrawerTarget = { table: string; id: string } | null;
type Row = { id: string; table?: unknown; createdAt?: unknown } & Record<string, unknown>;
type Neighbourhood = { row: Row; record: Row | null; linked: Record<string, Row[]> };

/** Человеческая подпись строки: имя → заголовок → сводка → идентификатор. */
const labelOf = (r: Row): string =>
  String(r.name ?? r.title ?? r.summary ?? r.id ?? "").slice(0, 120) || String(r.id ?? "");

/** Порядок складов в ящике: сначала то, что видно глазами, потом ссылочное. */
const ORDER = ["storage", "vector-memory", "map", "calendar", "database"];

export function EntityDrawer({ target, onClose, lang }: { target: DrawerTarget; onClose: () => void; lang: string }) {
  const t = drawerStrings(lang);
  const [data, setData] = useState<Neighbourhood | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) { setData(null); return; }
    let alive = true;
    setLoading(true);
    fetch(`${apiBase()}/rows?table=${encodeURIComponent(target.table)}&id=${encodeURIComponent(target.id)}&linked=1`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Neighbourhood | null) => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) { setData(null); setLoading(false); } });
    return () => { alive = false; };
  }, [target]);

  const record = data?.record ?? null;
  const linked = data?.linked ?? {};
  const titles: Record<string, string> = {
    storage: t.storage, "vector-memory": t.vectorMemory, map: t.map, calendar: t.calendar, database: t.database,
  };
  const tables = [...ORDER.filter((k) => linked[k]?.length), ...Object.keys(linked).filter((k) => !ORDER.includes(k) && linked[k]?.length)];

  return (
    // Оверлей, кнопка закрытия и выезд справа — из примитива: клик по затемнению и Esc закрывают его сами.
    <Sheet open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[95vw] gap-0 overflow-y-auto sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="pr-8 text-base">
            {record ? labelOf(record) : data ? labelOf(data.row) : t.entity}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 p-4 pt-0 text-sm">
          {loading ? <p className="text-muted-foreground">{t.loading}</p> : null}

          {/* ЗАПИСЬ — центр сущности. Её нет у журнальной строки, и об этом говорится словами. */}
          {!loading && data && !record ? <p className="text-muted-foreground">{t.noRecord}</p> : null}

          {record ? (
            <section className="space-y-1">
              {record.summary ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{String(record.summary)}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t.added}: {record.createdAt ? new Date(String(record.createdAt)).toLocaleString(lang) : "—"}
                <span className="ml-2 font-mono">{String(record.id)}</span>
              </p>
            </section>
          ) : null}

          {/* ОБЪЕКТЫ. Один — крупным превью; НЕСКОЛЬКО — карусель (требование владельца). Клик открывает
              объект в центре тем же `media-viewer`: изображение · видео · аудио · PDF · текст и честная
              ссылка для неизвестного типа. Второго просмотрщика в проекте нет. */}
          {linked.storage?.length ? (
            <section className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.storage}</h4>
              {linked.storage.length === 1 ? (
                <MediaPreview fileKey={linked.storage[0].fileKey} name={String(linked.storage[0].name ?? "")} size="lg" />
              ) : (
                <Carousel className="px-4">
                  <CarouselContent>
                    {linked.storage.map((o) => (
                      <CarouselItem key={o.id}>
                        <MediaPreview fileKey={o.fileKey} name={String(o.name ?? "")} size="lg" />
                        <p className="mt-1 truncate text-xs text-muted-foreground">{labelOf(o)}</p>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}
            </section>
          ) : null}

          {/* ОСТАЛЬНЫЕ ГРАНИ — строкой на соседа: подпись плюс его идентификатор. */}
          {tables.filter((k) => k !== "storage").map((k) => (
            <section key={k} className="space-y-1">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titles[k] ?? k}</h4>
              <ul className="space-y-1">
                {linked[k].map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 rounded border px-2 py-1">
                    <span className="line-clamp-3 break-words">{labelOf(r)}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{String(r.id).slice(0, 5)}…</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!loading && data && !tables.length && !record ? <p className="text-muted-foreground">{t.nothing}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
