"use client";

import { useState } from "react";
import { GripVertical, Trash2, CornerDownRight, ArrowUpLeft, Loader2, Languages, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { valueForLang, hasTranslation, setTranslation, type I18nMap } from "@/lib/per-lang";
import type { NavItem, NavState, NavSlot, RouteNode } from "@/lib/nav-editor/types";
import { LangStrip } from "./lang-strip.client";
import { RouteTree } from "./route-tree.client";
import { readDraggedRoute, hasDraggedRoute } from "./dnd";

// Островок настройки МЕНЮ — общий для верхней полосы и подвала (2026-08-12).
//
// 🔒 ОДИН РЕДАКТОР НА ДВА РАЗДЕЛА. Копия разошлась бы с оригиналом на первой
// правке, и разошлась бы незаметно: два экрана, которые ДОЛЖНЫ вести себя
// одинаково, — самое дорогое место для дублирования. Слова приезжают пропсами — словарь
// серверный (закон шага 501: 82 языка в браузер не уезжают).
//
// 🔒 ПЕРЕТАСКИВАНИЕ — НА РОДНЫХ СОБЫТИЯХ БРАУЗЕРА, без библиотеки. Список здесь
// короткий (пункты меню, а не тысяча строк), а лишняя зависимость в панели
// живёт годами и обновляется вручную.
//
// 🔒 ВЛОЖЕННОСТЬ РОВНО ОДНА. «Вкладка может стать группой вкладок» — это FES, и
// там второго уровня нет. Разрешить третий значит показать посетителю меню,
// которое не помещается на телефоне.

export type Labels = {
  candidates: string; add: string; empty: string; dragHint: string;
  labelPlaceholder: string; makeChild: string; makeTop: string; remove: string;
  save: string; saving: string; savedNow: string; savedLater: string; failed: string;
  already: string; folderOnly: string;
  labelLimit: string; translateOne: string; trDone: string; trFailed: string; trNoKey: string;
  authSide: string; authLeft: string; authRight: string;
  baseLang: string; translated: string; notTranslated: string; langHint: string;
  // Скрыть из меню и удалить страницу — РАЗНЫЕ судьбы, поэтому и слова разные.
  hideTitle: string; hideDialogTitle: string; hideDialogBody: string; hideConfirm: string;
  deleteTitle: string; deleteDialogTitle: string; deleteDialogBody: string;
  deleteConfirm: string; deleteRebuild: string; deleteDone: string; deleteFailed: string;
  cancel: string;
};

const rid = () => Math.random().toString(36).slice(2, 8);
const key = (slot: NavSlot, id: string) => `nav.${slot}.${id}.label`;

// 🔒 ПРЕДЕЛ ПОДПИСИ — 12 ЗНАКОВ (владелец, 2026-08-12). Полоса меню одна, и один
// длинный пункт разносит её на телефоне. Здесь предел ПОДСКАЗЫВАЕТ, а гарантирует
// его приложение при рендере (lib/menu/nav-config.ts): подпись может приехать и
// мимо этого поля — из перевода или из конфига, набранного руками.
const LABEL_MAX = 12;

export function NavEditor(
  { slot, initial, tree, labels, langs, base, initialI18n, showAuthSide = false, canDeletePages = false }:
  {
    slot: NavSlot;
    initial: NavState; tree: RouteNode[]; labels: Labels;
    langs: string[]; base: string; initialI18n: I18nMap;
    /** Сторона ящика — общая настройка, показывается только у верхнего меню. */
    showAuthSide?: boolean;
    /**
     * Можно ли удалять САМИ страницы, а не только ссылки на них.
     *
     * 🔒 Только у подвала: там за пунктом стоит папка страницы, и панель умеет
     * убрать её вместе с тремя регистрациями. За пунктом верхнего меню может
     * стоять что угодно — каталог, пост, чужой маршрут, — и стирать это отсюда
     * значит дать кнопке власть, которой у неё нет.
     */
    canDeletePages?: boolean;
  },
) {
  const [items, setItems] = useState<NavItem[]>(initial.items);
  const [authSide, setAuthSide] = useState<"left" | "right">(initial.authSide);
  const [drag, setDrag] = useState<number | null>(null);
  /** Тащат страницу НАД правой колонкой — подсвечиваем цель. */
  const [over, setOver] = useState(false);
  /** Пункт, который собираются скрыть из меню (ссылка уйдёт, файлы останутся). */
  const [hiding, setHiding] = useState<{ index: number; id: string; child: boolean; label: string; href: string } | null>(null);
  /** Пункт, страницу которого собираются УДАЛИТЬ из проекта. */
  const [deleting, setDeleting] = useState<{ index: number; id: string; label: string; href: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [editLang, setEditLang] = useState(base);
  const [i18n, setI18n] = useState<I18nMap>(initialI18n);
  /** Какой пункт сейчас переводится — вращается только его значок. */
  const [busyId, setBusyId] = useState<string | null>(null);

  // Языки, у которых записан хоть один перевод подписи, — для отметки в полосе.
  const done = new Set(
    langs.filter((l) => items.some((it) => hasTranslation(i18n, key(slot, it.id), l))),
  );

  // Адреса, уже стоящие в меню (включая вложенные): дерево помечает их галочкой
  // вместо «плюса», чтобы одна страница не попала в меню дважды.
  const used = new Set<string>();
  for (const it of items) {
    if (it.href) used.add(it.href);
    for (const c of it.children ?? []) used.add(c.href);
  }

  /** Что показать в поле подписи: на языке-основе — само значение, иначе перевод. */
  function shown(item: NavItem): string {
    return editLang === base ? item.label : valueForLang("", i18n, key(slot, item.id), editLang);
  }

  /**
   * Левая колонка — то, что ЕЩЁ НЕ стоит в меню.
   *
   * 🔒 ПОСТАВЛЕННАЯ СТРАНИЦА ИЗ ЛЕВОЙ КОЛОНКИ УХОДИТ (владелец, шаг 526). Раньше
   * она оставалась там с галочкой, и две колонки показывали одно и то же:
   * человек искал глазами, что ещё можно добавить, среди уже добавленного.
   * Колонки отвечают на разные вопросы — «что доступно» и «что стоит», — и
   * пересекаться их содержимое не должно.
   *
   * Папка остаётся, пока внутри есть хоть одна недобавленная страница: убрать
   * её вместе с последним ребёнком значит спрятать ветку карты сайта.
   */
  function prune(nodes: RouteNode[]): RouteNode[] {
    const out: RouteNode[] = [];
    for (const n of nodes) {
      const children = prune(n.children);
      const taken = n.href !== null && used.has(n.href);
      if (taken && children.length === 0) continue;
      out.push(taken ? { ...n, href: null, children } : { ...n, children });
    }
    return out;
  }
  const available = prune(tree);

  const flat = items.flatMap((it, i) => [
    { item: it, index: i, child: false },
    ...(it.children ?? []).map((c) => ({ item: c as NavItem, index: i, child: true })),
  ]);

  function commit(next: NavItem[], opts?: { persist?: boolean }) {
    const ordered = next.map((it, i) => ({ ...it, order: (i + 1) * 10 }));
    setItems(ordered);
    // Записываем УЖЕ пересчитанный список: у состояния он появится позже.
    if (opts?.persist) void persist(ordered);
  }

  function add(href: string, title: string) {
    commit([...items, { id: rid(), href, order: 0, label: title }]);
  }

  /** Вставить страницу из левой колонки на конкретное место. */
  function addAt(to: number, href: string, title: string) {
    // Повтор молча игнорируется: галочка в левой колонке уже сказала, что
    // страница добавлена, и второй такой же пункт был бы просто дублем.
    if (used.has(href)) return;
    const next = [...items];
    next.splice(Math.max(0, Math.min(to, items.length)), 0, { id: rid(), href, order: 0, label: title });
    commit(next);
  }

  /**
   * Отпустили на пункте с номером `to`.
   *
   * 🔒 ДВА РАЗНЫХ ПЕРЕТАСКИВАНИЯ, И РАЗЛИЧАЕТ ИХ НАГРУЗКА, А НЕ СОСТОЯНИЕ
   * (шаг 525). Слева едет НОВАЯ страница — она приходит в `dataTransfer` под
   * своим типом. Внутри колонки едет уже стоящий пункт — у него нагрузки нет,
   * есть только запомненный номер. Спрашиваем нагрузку первой: перетаскивание
   * извне может случиться и тогда, когда `drag` остался от прошлого раза.
   */
  function drop(to: number, dt?: DataTransfer) {
    const incoming = dt ? readDraggedRoute(dt) : null;
    if (incoming) {
      setDrag(null);
      addAt(to, incoming.href, incoming.title);
      return;
    }
    if (drag === null || drag === to) return;
    const next = [...items];
    const [moved] = next.splice(drag, 1);
    next.splice(to, 0, moved);
    setDrag(null);
    // 🔒 ПЕРЕСТАНОВКА СОХРАНЯЕТСЯ САМА (владелец, шаг 526). Порядок — это то,
    // что человек проверяет глазами на сайте, и заставлять его после каждого
    // перетаскивания искать кнопку значит превращать проверку в обряд. Кнопка
    // остаётся для добавления: перенос страницы слева направо — решение, а не
    // подгонка, и подтвердить его правильно.
    commit(next, { persist: true });
  }

  /** Отпустили мимо пунктов — страница встаёт в конец списка. */
  function dropAtEnd(dt: DataTransfer) {
    const incoming = readDraggedRoute(dt);
    setOver(false);
    if (!incoming) return;
    setDrag(null);
    addAt(items.length, incoming.href, incoming.title);
  }

  // Пункт становится ребёнком предыдущего — так вкладка превращается в группу.
  function nest(i: number) {
    if (i === 0) return;
    const next = [...items];
    const [moved] = next.splice(i, 1);
    const parent = next[i - 1];
    if (!moved.href) return;
    parent.children = [
      ...(parent.children ?? []),
      { id: moved.id, href: moved.href, order: ((parent.children?.length ?? 0) + 1) * 10, label: moved.label },
    ];
    commit(next);
  }

  function unnest(parentIndex: number, id: string) {
    const next = [...items];
    const parent = next[parentIndex];
    const child = (parent.children ?? []).find((c) => c.id === id);
    if (!child) return;
    parent.children = (parent.children ?? []).filter((c) => c.id !== id);
    next.splice(parentIndex + 1, 0, { id: child.id, href: child.href, order: 0, label: child.label });
    commit(next);
  }

  /**
   * Удалить САМУ страницу из проекта, а не только ссылку на неё.
   *
   * 🔒 СНАЧАЛА ФАЙЛЫ, ПОТОМ ССЫЛКА. Уберём ссылку первой и упадём на файлах —
   * страница останется в проекте, но исчезнет из подвала, и владелец решит, что
   * удаление прошло. Порядок выбран так, чтобы неудача оставляла ВИДИМЫЙ след:
   * ссылка на месте, значит дело не сделано.
   */
  async function deletePage(target: { index: number; id: string; href: string }) {
    setBusy(true); setNote(null);
    try {
      const r = await fetch("/api/config/footer-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ href: target.href }),
      });
      const j = (await r.json()) as { ok?: boolean; reason?: string };
      if (!j?.ok) { setNote(labels.deleteFailed); return; }
      const next = items.filter((_, i) => i !== target.index);
      commit(next, { persist: true });
      setNote(labels.deleteDone);
    } catch {
      setNote(labels.deleteFailed);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  function remove(parentIndex: number, id: string, child: boolean) {
    if (!child) return commit(items.filter((_, i) => i !== parentIndex));
    const next = [...items];
    next[parentIndex].children = (next[parentIndex].children ?? []).filter((c) => c.id !== id);
    commit(next);
  }

  // Правка подписи. На языке-основе меняется само значение, на прочих — перевод
  // рядом с ним. Тот же уговор, что у пяти полей настроек приложения: основное
  // значение остаётся значением, переводы живут в ветке `i18n`.
  function rename(parentIndex: number, id: string, child: boolean, label: string) {
    if (editLang !== base) {
      setI18n(setTranslation(i18n, key(slot, id), editLang, label));
      return;
    }
    const next = [...items];
    if (!child) next[parentIndex] = { ...next[parentIndex], label };
    else next[parentIndex].children = (next[parentIndex].children ?? []).map((c) => (c.id === id ? { ...c, label } : c));
    setItems(next);
  }

  /**
   * Перевести подпись ОДНОГО пункта на все языки приложения.
   *
   * 🔒 ПЕРЕВОД — ПОМОЩНИК, А НЕ ЗАМЕНА РУКАМ. Результат ложится в те же ячейки,
   * которые владелец правит сам: не понравилось — переписал, и его слово
   * побеждает. Поэтому кнопка не блокирует поле и ничего не «запирает».
   */
  async function translate(id: string, sourceLabel: string) {
    const targets = langs.filter((l) => l !== base);
    if (!targets.length || !sourceLabel.trim()) return;
    setBusyId(id); setNote(null);
    try {
      const r = await fetch("/api/config/nav/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: { [id]: sourceLabel }, from: base, to: targets }),
      });
      const j = (await r.json()) as { translations?: Record<string, Record<string, string>>; error?: string };
      if (!r.ok || !j.translations) {
        // Причина названа, а не спрятана за «не удалось»: без ключа человеку
        // нужно идти в настройки, а при перегрузке — просто повторить.
        setNote(j.error === "no-key" || j.error === "bad-key" ? labels.trNoKey : labels.trFailed);
        return;
      }
      let next = i18n;
      for (const [lang, fields] of Object.entries(j.translations)) {
        const v = fields[id];
        if (typeof v === "string" && v.trim()) next = setTranslation(next, key(slot, id), lang, v.trim());
      }
      setI18n(next);
      setNote(labels.trDone);
    } catch {
      setNote(labels.trFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function save() {
    await persist(items);
  }

  /**
   * Записать КОНКРЕТНЫЙ список, а не то, что лежит в состоянии.
   *
   * 🔒 СПИСОК ПРИХОДИТ АРГУМЕНТОМ (шаг 526). `setItems` применяется не сразу, и
   * автосохранение сразу после перестановки записало бы ПРЕДЫДУЩИЙ порядок —
   * то есть отменило бы ровно то движение, которое человек только что сделал.
   * Ошибка выглядела бы как «перетащил, отпустил, вернулось обратно».
   */
  async function persist(list: NavItem[]) {
    setBusy(true); setNote(null);
    try {
      const r = await fetch("/api/config/nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, nav: { items: list, authSide }, i18n }),
      });
      const j = (await r.json()) as { ok?: boolean; revalidated?: boolean };
      // Честное различие: записано и уже видно / записано и появится в течение
      // окна ISR. Бодрое «готово» на втором случае — обман.
      setNote(j.ok ? (j.revalidated ? labels.savedNow : labels.savedLater) : labels.failed);
    } catch {
      setNote(labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Две колонки: слева карта сайта, справа собранное из неё меню. Порядок
          чтения совпадает с порядком действия — выбрал слева, увидел справа.
          На узком экране колонки становятся одна под другой: дерево первым,
          потому что с него работа и начинается. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* 🔒 ЛЕВАЯ КОЛОНКА НЕ ТЯНЕТСЯ ЗА СЕТКОЙ (владелец, шаг 527). Без
            `self-start` она растягивалась до высоты правой и оставляла под
            списком пустое поле в пол-экрана — правая колонка уезжала вниз, и до
            кнопок было не добраться. Потолок 400 пикселей с прокруткой: список
            страниц растёт, а разметка раздела от этого меняться не должна. */}
        <section className="max-h-[400px] self-start overflow-hidden rounded-lg border border-border p-2">
          <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{labels.candidates}</p>
          <div className="max-h-[360px] overflow-y-auto">
            <RouteTree
              nodes={available}
              used={used}
              onAdd={add}
              labels={{ add: labels.add, already: labels.already, folderOnly: labels.folderOnly }}
            />
          </div>
        </section>

        <section className="space-y-2">

      <div className="space-y-1">
        <LangStrip
          langs={langs} base={base} active={editLang} done={done}
          onPick={setEditLang}
          labels={{ baseLang: labels.baseLang, translated: labels.translated, notTranslated: labels.notTranslated }}
        />
        {editLang !== base && <p className="text-[10px] text-amber-600 dark:text-amber-400">{labels.langHint}</p>}
      </div>

      {/* 🔒 ПРИНИМАЕТ ВСЯ КОЛОНКА, А НЕ ТОЛЬКО СТРОКИ (шаг 525). Человек тащит
          страницу «в подвал», а не «между второй и третьей кнопкой»: требовать
          попадания в узкую строку — значит сделать перетаскивание игрой на
          точность. Отпустил мимо пунктов — страница встаёт в конец.

          `onDragOver` с `preventDefault` обязателен: без него браузер считает
          цель непринимающей и события `drop` не будет вовсе — перетаскивание
          выглядит сломанным, хотя обработчик написан. */}
      <div
        onDragOver={(e) => {
          if (!hasDraggedRoute(e.dataTransfer)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setOver(true);
        }}
        onDragLeave={(e) => {
          // Уход к ребёнку — не уход из колонки: без этой проверки подсветка
          // мигает на каждой строке, через которую проносят страницу.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={(e) => { e.preventDefault(); dropAtEnd(e.dataTransfer); }}
        // 🔒 ЦЕЛЬ ПОДСВЕЧИВАЕТСЯ КОНТРАСТНО, А НЕ НАМЁКОМ (владелец, шаг 526).
        // Здесь была заливка `primary/5` и пунктир `primary/40` — на белом фоне
        // это чуть более серый прямоугольник. Человек, тащащий страницу, не
        // понимал, захватил ли он её и куда она упадёт, и отпускал наугад.
        // Подсказка о попадании обязана читаться в движении, боковым зрением:
        // сплошная рамка в полный цвет, заметная заливка и приподнятая тень.
        className={`rounded-lg p-1 transition-all ${
          over
            ? "bg-primary/15 ring-2 ring-primary shadow-lg shadow-primary/20"
            : "ring-2 ring-transparent"
        }`}
      >
        <p className="text-[10px] text-muted-foreground mb-1">{labels.dragHint}</p>
        {flat.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {labels.empty}
          </div>
        )}
        <ul className="space-y-1">
          {flat.map(({ item, index, child }) => (
            <li
              key={item.id}
              draggable={!child}
              onDragStart={() => !child && setDrag(index)}
              onDragOver={(e) => e.preventDefault()}
              // Строка ловит отпускание раньше колонки, поэтому здесь и решается
              // МЕСТО вставки. `stopPropagation` — чтобы колонка не добавила ту
              // же страницу второй раз, уже в конец.
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOver(false);
                if (!child) drop(index, e.dataTransfer);
              }}
              className={`flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 ${child ? "ml-8" : ""}`}
            >
              {child ? <CornerDownRight className="size-3.5 text-muted-foreground shrink-0" />
                     : <GripVertical className="size-3.5 text-muted-foreground shrink-0 cursor-grab" />}
              {/* Предел длины виден и в поле: `maxLength` не даёт набрать
                  лишнего, а счётчик у предела объясняет, почему перестало
                  печататься. Молча упирающееся поле читается как поломка. */}
              <input
                value={shown(item)}
                onChange={(e) => rename(index, item.id, child, e.target.value)}
                placeholder={labels.labelPlaceholder}
                maxLength={LABEL_MAX}
                title={labels.labelLimit}
                className="flex-1 min-w-0 bg-transparent text-xs outline-none"
              />
              {shown(item).length >= LABEL_MAX && (
                <span className="shrink-0 font-mono text-[9px] text-amber-600 dark:text-amber-400">
                  {LABEL_MAX}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[24%]">{item.href}</span>
              {/* Перевод стоит СЛЕВА ОТ КОРЗИНЫ (владелец, 2026-08-12): рядом с
                  подписью, которую переводит, и подальше от удаления. */}
              <Button
                size="sm" variant="ghost" className="h-6 px-1" title={labels.translateOne}
                disabled={busyId === item.id || langs.length < 2}
                onClick={() => translate(item.id, child ? item.label : items[index].label)}
              >
                {busyId === item.id
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Languages className="size-3.5" />}
              </Button>
              {child ? (
                <Button size="sm" variant="ghost" className="h-6 px-1" title={labels.makeTop}
                  onClick={() => unnest(index, item.id)}><ArrowUpLeft className="size-3.5" /></Button>
              ) : (
                <Button size="sm" variant="ghost" className="h-6 px-1" title={labels.makeChild}
                  onClick={() => nest(index)} disabled={index === 0}><CornerDownRight className="size-3.5" /></Button>
              )}
              {/* 🔒 ДВЕ РАЗНЫЕ СУДЬБЫ — ДВЕ РАЗНЫЕ КНОПКИ (владелец, шаг 527).
                  Здесь стояла ОДНА корзина, и она лгала: нажатие не удаляло
                  страницу, а лишь убирало ссылку — страница оставалась в
                  проекте. Значок обещал необратимое там, где действие обратимо,
                  и человек не решался нажать. Теперь глаз означает «скрыть из
                  подвала, файлы остаются», корзина — «удалить страницу из
                  проекта», и каждая объясняется своим диалогом перед делом. */}
              <Button
                size="sm" variant="ghost" className="group/eye h-6 px-1" title={labels.hideTitle}
                aria-label={`${labels.hideTitle}: ${shown(item)}`}
                // Второй диалог закрывается: два вопроса разом человек читает
                // как один и отвечает наугад. Подложка мешает открыть их мышью,
                // но полагаться на неё нельзя — состояние обязано быть верным
                // само по себе.
                onClick={() => { setDeleting(null); setHiding({ index, id: item.id, child, label: shown(item), href: item.href ?? "" }); }}
              >
                <Eye className="size-3.5 group-hover/eye:hidden" />
                <EyeOff className="hidden size-3.5 group-hover/eye:block" />
              </Button>
              {/* Удаление предлагается только там, где панель умеет довести его
                  до конца: у страницы подвала со своей папкой. У пункта верхнего
                  меню за ссылкой может стоять что угодно — каталог, пост, чужой
                  маршрут, — и стирать его отсюда нельзя. */}
              {canDeletePages && !child && item.href && (
                <Button
                  size="sm" variant="ghost" className="h-6 px-1 text-destructive hover:text-destructive"
                  title={labels.deleteTitle}
                  aria-label={`${labels.deleteTitle}: ${shown(item)}`}
                  onClick={() => { setHiding(null); setDeleting({ index, id: item.id, label: shown(item), href: item.href ?? "" }); }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
        </section>
      </div>

      {showAuthSide && (
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.authSide}</span>
        {(["left", "right"] as const).map((s) => (
          <Button key={s} size="sm" variant={authSide === s ? "default" : "outline"} className="h-7 text-[11px]"
            onClick={() => setAuthSide(s)}>{s === "left" ? labels.authLeft : labels.authRight}</Button>
        ))}
      </div>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}{busy ? labels.saving : labels.save}
        </Button>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>

      {/* 🔒 ДИАЛОГ ОБЪЯСНЯЕТ ПОСЛЕДСТВИЕ, А НЕ СПРАШИВАЕТ «ВЫ УВЕРЕНЫ?»
          (владелец, шаг 527). «Уверены?» не добавляет человеку ни одного факта:
          он нажимает «да», потому что уже нажал кнопку. Здесь сказано, ЧТО
          именно произойдёт и как это отменить, — и тогда согласие осмысленно. */}
      <Dialog open={hiding !== null} onOpenChange={(o) => !o && setHiding(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[13px]">
              <EyeOff className="size-4 shrink-0" />
              {labels.hideDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-relaxed">
              {labels.hideDialogBody}
            </DialogDescription>
          </DialogHeader>
          {hiding && (
            <p className="rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-[11px]">
              {hiding.label} <span className="text-muted-foreground">{hiding.href}</span>
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setHiding(null)}>
              {labels.cancel}
            </Button>
            <Button
              size="sm" className="text-[11px]"
              onClick={() => { if (hiding) remove(hiding.index, hiding.id, hiding.child); setHiding(null); }}
            >
              <EyeOff className="size-3.5" />{labels.hideConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[13px] text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {labels.deleteDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-relaxed">
              {labels.deleteDialogBody}
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 font-mono text-[11px]">
              {deleting.label} <span className="text-muted-foreground">{deleting.href}</span>
            </p>
          )}
          {/* Пересборка названа ЗДЕСЬ, до нажатия: страницы отдаёт собранный
              `.next`, и до неё удалённый адрес продолжает отвечать. */}
          <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">{labels.deleteRebuild}</p>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setDeleting(null)}>
              {labels.cancel}
            </Button>
            <Button
              size="sm" variant="destructive" className="text-[11px]" disabled={busy}
              onClick={() => { if (deleting) void deletePage(deleting); }}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {labels.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
