"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, OctagonAlert, RotateCcw, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Small } from "@/components/ui/typography";
import { Callout } from "./callout";
import { watchBuild } from "./build-watch";

// ЗАМЕНА СЛОТА СОДЕРЖИМЫМ ДОНОРА — САМОЕ РАЗРУШИТЕЛЬНОЕ ДЕЙСТВИЕ ПУТИ (35-3).
//
// 🔒 РАЗРУШЕНИЕ ТРЕБУЕТ ВТОРОГО ДВИЖЕНИЯ. Кнопка не запускает замену сразу:
// сначала человек видит, ЧТО именно будет уничтожено, и подтверждает. Одно
// нажатие на действие, отменить которое нельзя, — приглашение к беде. Закон
// перенесён из удалённого `adopt-outcome.client.tsx` (шаг 25-7), а не изобретён.
//
// 🔒 ОТКАЗ ГОВОРИТ, ЧТО СЛОТ ЦЕЛ. Дверь возвращает `slotIntact`, и это выводится
// человеку словами. Без такой строки любая ошибка читается как «проект уже
// уничтожен», и человек не решается повторить с исправленным адресом — то есть
// застревает на ровном месте, имея целый проект.
//
// 🔒 ДВЕ РАЗВИЛКИ ОТКАЗА, И ОНИ РАЗНЫЕ. Отказ ЗАМЕНЫ (донор не отозвался) —
// слот цел, надо поправить адрес. Отказ СБОРКИ — слот уже заменён, и вина не в
// адресе: проект собран не по архитектуре Fractera. Второй ведёт к миграции, и
// текст для него владелец написал сам (`_content/launch-adopt-failed.ru.md`):
// вернуть стартовый шаблон · написать нам · перейти к миграции.
//
// 🔒 ПИСЬМО — `mailto:` С ГОТОВЫМ ТЕКСТОМ. Своего почтового канала для этого
// случая у панели нет, и делать вид, что есть, значит потерять обращение молча.
//
// 🔒 ОЖИДАНИЕ СБОРКИ — ОБЩИЙ ПРИЁМ (`build-watch.ts`), а не свой опрос. Тот же,
// которым ждёт подвал панели.
//
// 🔒 ШАГ ЗАКРЫВАЕТ ДВЕРЬ, А НЕ ЭТОТ ФАЙЛ. Дожавшись успеха, островок ПРОСИТ
// сервер проверить слот (`POST /api/config/launch-flow/adopted`) — и сервер
// смотрит сам. Поставить отметку отсюда значило бы закрыть шаг по слову
// браузера, то есть по слову того, кто ничего не проверял.

export type AdoptConfirmLabels = {
  /** Первое движение: кнопка, открывающая подтверждение. */
  cta: string;
  /** Второе движение. */
  confirmTitle: string;
  confirmBody: string;
  confirmYes: string;
  confirmNo: string;
  /** Пока идёт замена и сборка. */
  running: string;
  buildWaiting: string;
  /** Донор не назван — кнопки нет, сказано почему. */
  noDonor: string;
  /** Удача. */
  okTitle: string;
  okHint: string;
  /** Отказ ЗАМЕНЫ. */
  failTitle: string;
  slotIntact: string;
  reasons: Record<string, string>;
  reasonUnknown: string;
  /** Отказ УСТАНОВКИ ЗАВИСИМОСТЕЙ — наша беда, не проекта человека. */
  depsFailedTitle: string;
  depsFailedBody: string;
  depsRetry: string;
  /** Отказ СБОРКИ — та самая развилка к миграции. */
  buildFailedTitle: string;
  buildFailedBody: string;
  restoreCta: string;
  restoreRunning: string;
  mailCta: string;
  mailSubject: string;
  mailBody: string;
  migrationCta: string;
};

type Stage = "idle" | "confirming" | "replacing" | "building" | "build-failed" | "deps-failed";

/**
 * Маркер, который сборка печатает в лог, поставив зависимости.
 *
 * 🔒 ПРИЧИНА ЧИТАЕТСЯ ИЗ ЛОГА, А НЕ УГАДЫВАЕТСЯ ПО КОДУ ВОЗВРАТА. Установка и
 * сборка идут одной задачей — у неё один код выхода, и по нему «не встал sharp»
 * неотличимо от «проект не той архитектуры». Отличает их факт: дошла ли работа
 * до конца установки. Строка задана в `api/deploy` и импортом сюда не тянется:
 * это клиентский файл, а тот модуль серверный.
 */
const DEPS_OK_MARK = "[deploy] dependencies installed";

export function AdoptConfirm({
  donorUrl,
  email,
  labels,
  migrationHref,
}: {
  /** Адрес, сохранённый на шаге 1. Пусто — заменять нечем. */
  donorUrl: string;
  /** Куда писать, когда сборка не прошла. */
  email: string;
  labels: AdoptConfirmLabels;
  /** Куда ведёт миграция. Нет адреса — пункта нет вовсе, а не мёртвая ссылка. */
  migrationHref?: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [restoring, setRestoring] = useState(false);
  const stopWatch = useRef<null | (() => void)>(null);

  // 🔒 Опрос снимается при уходе со страницы: иначе он продолжает спрашивать
  // сервер у человека, которого здесь уже нет.
  useEffect(() => () => { stopWatch.current?.(); }, []);

  // 🔒 ДОНОРА НЕТ — КНОПКИ НЕТ ВОВСЕ. Неактивная кнопка объявляет главным
  // действием шага то, которое на нём сейчас невозможно; человек читает
  // «заменить» и ищет, что бы заменить (✗ оплачено 28-18).
  if (!donorUrl.trim()) {
    return <Callout tone="info">{labels.noDonor}</Callout>;
  }

  async function replace() {
    setStage("replacing");
    try {
      const r = await fetch("/api/config/launch/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: donorUrl }),
        credentials: "include",
      });
      const d = (await r.json().catch(() => ({}))) as
        { ok?: boolean; error?: string; slotIntact?: boolean; jobId?: unknown; detached?: boolean };

      if (!r.ok || !d.ok) {
        const why = labels.reasons[String(d.error ?? "")] ?? labels.reasonUnknown;
        toast.error(labels.failTitle, {
          description: `${why}${d.slotIntact ? ` ${labels.slotIntact}` : ""}`,
          duration: 8000,
        });
        setStage("idle");
        return;
      }

      // Замена состоялась. Дальше идёт сборка — её ждём опросом.
      setStage("building");
      toast.info(labels.buildWaiting, { duration: 6000 });

      stopWatch.current = watchBuild(String(d.jobId), async (outcome) => {
        if (!outcome.ok) {
          // ✗ 🔒 РАЗВИЛКА, ОПЛАЧЕННАЯ ЖИВЫМ ПРОГОНОМ ВЛАДЕЛЬЦА (35-9). Раньше
          // ЛЮБОЙ отказ сборки объявлялся отказом ПРОЕКТА и вёл в миграцию —
          // и это было сказано человеку про наш собственный пример, собранный
          // из этого же шаблона. Отказать может наша доставка, и тогда предлагать
          // ему переделывать проект — ложь в самый неудачный момент.
          setStage(outcome.log.includes(DEPS_OK_MARK) ? "build-failed" : "deps-failed");
          return;
        }
        // 🔒 Успех сборки — ещё не закрытый шаг. Спрашиваем сервер, и закрывает
        // его он, посмотрев на слот своими глазами.
        const c = await fetch("/api/config/launch-flow/adopted", {
          method: "POST",
          credentials: "include",
        }).then((x) => x.json()).catch(() => ({ ok: false, reason: "network" }));

        if (c.ok) {
          toast.success(labels.okTitle, { description: labels.okHint, duration: 8000 });
          router.refresh();
          setStage("idle");
        } else {
          // Сборка прошла, а признаки не сошлись — это не удача и не отказ
          // сборки. Называем причину так, как её назвал сервер.
          toast.error(labels.failTitle, {
            description: labels.reasons[String(c.reason ?? "")] ?? labels.reasonUnknown,
            duration: 8000,
          });
          setStage("idle");
        }
      });
    } catch {
      toast.error(labels.failTitle, { description: labels.reasons.network ?? labels.reasonUnknown, duration: 8000 });
      setStage("idle");
    }
  }

  async function restore() {
    setRestoring(true);
    try {
      await fetch("/api/config/launch/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
        credentials: "include",
      });
      router.refresh();
    } finally {
      setRestoring(false);
    }
  }

  // ── РАЗВИЛКА ПОЛУТОРНАЯ: НЕ ВСТАЛИ ЗАВИСИМОСТИ ─────────────────────────────
  //
  // 🔒 ЭТО НЕ ОТКАЗ ПРОЕКТА, И ВЫХОД ЗДЕСЬ ДРУГОЙ. Слот заменён и цел, проект на
  // месте; не хватило одного — установки. Правильное действие человека —
  // повторить, а не идти в миграцию, и уж точно не переписывать свой проект.
  if (stage === "deps-failed") {
    return (
      <div data-adopt-deps-failed className="flex flex-col gap-4">
        <Callout tone="important">
          <span className="font-medium">{labels.depsFailedTitle}</span>
          <br />
          {labels.depsFailedBody}
        </Callout>

        <Button
          type="button"
          onClick={() => setStage("confirming")}
          data-adopt-retry
          className="h-11 text-[length:var(--fs-small)]"
        >
          {labels.depsRetry}
        </Button>
      </div>
    );
  }

  // ── РАЗВИЛКА ВТОРАЯ: СБОРКА НЕ ПРОШЛА ──────────────────────────────────────
  if (stage === "build-failed") {
    const mail =
      `mailto:${email}?subject=${encodeURIComponent(labels.mailSubject)}` +
      `&body=${encodeURIComponent(labels.mailBody.replace("{repoUrl}", donorUrl))}`;

    return (
      <div data-adopt-build-failed className="flex flex-col gap-4">
        <Callout tone="danger">
          <span className="font-medium">{labels.buildFailedTitle}</span>
          <br />
          {labels.buildFailedBody}
        </Callout>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={restore} disabled={restoring} data-adopt-restore>
            {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {restoring ? labels.restoreRunning : labels.restoreCta}
          </Button>

          {/* Ссылка остаётся ссылкой (`<a>`), а вид берёт у кнопки: `Button`
              этой панели не умеет `asChild`, и подменять разметку ради вида
              нельзя — `mailto` обязан открываться средним щелчком и копироваться
              как адрес. Классы берутся у `buttonVariants`, а не пишутся рядом. */}
          <a href={mail} data-adopt-mail className={buttonVariants({ variant: "outline" })}>
            <Mail size={14} />
            {labels.mailCta}
          </a>

          {/* Миграции ещё нет — пункта тоже нет. Мёртвая ссылка на несуществующую
              страницу хуже её отсутствия: человек уходит в 404 в свой худший
              момент, когда проект уже заменён. */}
          {migrationHref && (
            <a href={migrationHref} data-adopt-migration className={buttonVariants()}>
              {labels.migrationCta}
              <ArrowRight size={14} />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── ВТОРОЕ ДВИЖЕНИЕ ────────────────────────────────────────────────────────
  const busy = stage === "replacing" || stage === "building";

  if (stage === "confirming" || busy) {
    return (
      <div data-adopt-confirm className="flex flex-col gap-4">
        <Callout tone="danger">
          <span className="font-medium">{labels.confirmTitle}</span>
          <br />
          {labels.confirmBody}
          <br />
          <span className="font-mono">{donorUrl}</span>
        </Callout>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={replace}
            disabled={busy}
            data-step-cta
            data-adopt-yes
            className="h-11 text-[length:var(--fs-small)]"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {stage === "building" ? labels.buildWaiting : stage === "replacing" ? labels.running : labels.confirmYes}
          </Button>

          {!busy && (
            <Button type="button" variant="outline" onClick={() => setStage("idle")} className="h-11">
              {labels.confirmNo}
            </Button>
          )}
        </div>

        {busy && <Small>{labels.buildWaiting}</Small>}
      </div>
    );
  }

  // ── ПЕРВОЕ ДВИЖЕНИЕ ────────────────────────────────────────────────────────
  return (
    <Button
      type="button"
      onClick={() => setStage("confirming")}
      data-step-cta
      data-adopt-start
      className="h-11 w-full text-[length:var(--fs-small)]"
    >
      <OctagonAlert size={16} />
      {labels.cta}
    </Button>
  );
}
