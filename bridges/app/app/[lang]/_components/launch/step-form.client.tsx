"use client";

// ДЕЙСТВИЕ РЕАЛЬНОГО ШАГА МАСТЕРА (шаг 28-9, 2026-08-27).
//
// 🔒 ЭТО НЕ ТОТ ЖЕ ФАЙЛ, ЧТО У ОБРАЗЦА, И РАЗЛИЧИЕ СОДЕРЖАТЕЛЬНОЕ. У образца
// (`github/example/_components/step-action.client.tsx`) есть переключатель
// «показать удачу / показать отказ» — там он нужен, чтобы владелец увидел оба
// исхода, не подстраивая среду. На реальном шаге такого переключателя быть не
// может: исход решает сервер, и тумблер рядом с настоящей кнопкой был бы ложью о
// работе шага.
//
// 🔒 ОДИН ШАГ — ОДНО ДЕЙСТВИЕ (закон владельца 2026-08-27: «one step for one
// step»). Здесь ровно одно поле и ровно одна кнопка. Живой мастер сегодня внутри
// «шага 1 из 13» требует четырёх действий подряд — владелец назвал это дефектом
// словами «it must to be 4 steps , not 1». Второе действие сюда положить некуда,
// и это не оплошность конструкции, а сама конструкция.
//
// 🔒 ПРАВИЛО ГОТОВНОСТИ И ДВЕ ДЛИТЕЛЬНОСТИ — СТАНДАРТ, ПРИНЯТЫЙ НА ОБРАЗЦЕ.
// Кнопка активна, когда поле заполнено (`trim()`: один пробел заполнением не
// считается) либо отмечена галочка. Тост удачи живёт пять секунд, переход —
// через три: тост обязан пережить переход, иначе поздравление исчезает раньше,
// чем человек успел прочесть, ради чего он это делал.
//
// 🔒 ТОСТ ОТКАЗА БЕЗ УКАЗАНИЯ, ЧТО ДЕЛАТЬ, ЗАПРЕЩЁН. «Не удалось» — сообщение о
// состоянии программы; человеку нужно следующее действие.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Small } from "@/components/ui/typography";

export type StepFormLabels = {
  inputLabel: string;
  inputPlaceholder: string;
  /** Подпись под полем: чего от значения ждут. */
  inputHint?: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  /** Заголовок отказа, когда сервер не назвал причину сам. */
  failureTitle: string;
  /** Что делать — показывается, когда причины нет. */
  failureFix: string;
  /**
   * Подписи навигации ПРОЙДЕННОГО шага.
   *
   * 🔒 ЗАЧЕМ ОНИ ПОЯВИЛИСЬ (28-18, 2026-08-27). Владелец вернулся на шаг, где
   * всё уже сохранено, и увидел неактивную кнопку «Сохранить адрес»: «горит
   * неактивная кнопка… здесь нужно допилить логику». Он прав, и дефект глубже
   * внешнего вида — на пройденном шаге ГЛАВНОЕ ДЕЙСТВИЕ ДРУГОЕ. Сохранять
   * нечего: значение уже есть. Человеку нужно идти дальше или вернуться.
   */
  goPrev: string;
  goNext: string;
  /** Подпись кнопки сохранения, когда значение вводят ЗАНОВО поверх сохранённого. */
  replace: string;
};

const ADVANCE_MS = 3000;
const TOAST_MS = 5000;

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function StepForm({
  index,
  total,
  labels,
  nextHref,
  prevHref,
  secret = false,
  flowStep,
  saved = "",
}: {
  index: number;
  total: number;
  labels: StepFormLabels;
  /**
   * Ключ шага в состоянии НОВОГО пути. Задан — значение сохраняется дверью
   * `POST /api/config/launch-flow` и переживает перезагрузку страницы.
   *
   * 🔒 ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Владелец ввёл адрес, перезагрузил страницу и не
   * нашёл его: «нету обратной связи… ты сохраняешь?». Не сохранял — намеренно,
   * потому что запись в `USER_LAUNCH_*` двигает ЖИВОЙ мастер. Его решение —
   * «replace logic to new flow»: у нового пути свои ключи `USER_FLOW_*`.
   */
  flowStep?: "repo-url" | "token";
  /**
   * Уже сохранённое значение, показываемое человеку. Для секрета приходит
   * замаскированным — полное значение сервер не отдаёт вовсе.
   */
  saved?: string;
  /** Куда вести после удачи. Пусто — шага дальше нет, и тост его не обещает. */
  nextHref?: string;
  /**
   * Адрес предыдущего шага. Пусто — шаг первый, назад идти некуда.
   *
   * 🔒 ТРИ ПОЛОЖЕНИЯ НАВИГАЦИИ, НАЗВАННЫЕ ВЛАДЕЛЬЦЕМ: «перейти к следующему»
   * (первый шаг) · «к предыдущему и к следующему» (середина) · «к предыдущему»
   * (последний). Все три получаются из наличия двух адресов, а не из отдельного
   * признака: признак «какое положение» разошёлся бы с адресами на первой же
   * вставке шага в середину пути.
   */
  prevHref?: string;
  /**
   * Значение — секрет (токен, ключ, пароль).
   *
   * 🔒 ЧТО ЭТО МЕНЯЕТ И ЧЕГО НЕ МЕНЯЕТ. Поле перестаёт показывать значение и
   * просит браузер не сохранять и не подсказывать его: чужой глаз через плечо и
   * автозаполнение — самые дешёвые способы утечь. Чего это НЕ делает: не
   * защищает значение в памяти вкладки и не заменяет того, что секрет обязан
   * уезжать телом запроса, а не строкой адреса. Признак — про экран, а не про
   * безопасность целиком, и путать эти два уровня опасно.
   */
  secret?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔒 Таймер снимается при уходе со страницы: иначе переход случается у
  // человека, которого здесь уже нет.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ready = value.trim().length > 0;

  async function submit() {
    setBusy(true);

    // 🔒 СНАЧАЛА СОХРАНИТЬ, ПОТОМ ПОЗДРАВЛЯТЬ. Тост об удаче до ответа двери —
    // поздравление с тем, чего, возможно, не случилось. Порядок здесь и есть
    // разница между обратной связью и её имитацией.
    if (flowStep) {
      try {
        const r = await fetch("/api/config/launch-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Секрет уезжает ТЕЛОМ запроса: в строке адреса он попал бы в журнал
          // сервера, историю браузера и заголовок Referer.
          body: JSON.stringify({ step: flowStep, value: value.trim() }),
          credentials: "include",
        });
        const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!r.ok || !d.ok) {
          // 🔒 ОТКАЗ НАЗЫВАЕТ, ЧТО ДЕЛАТЬ. Причина от двери приходит машинным
          // словом (`bad-repo-url`); человеку нужно действие, а не код.
          toast.error(labels.failureTitle, { description: labels.failureFix, duration: TOAST_MS });
          setBusy(false);
          return;
        }
      } catch {
        toast.error(labels.failureTitle, { description: labels.failureFix, duration: TOAST_MS });
        setBusy(false);
        return;
      }
    }

    toast.success(fill(labels.successTitle, { n: index, total }), {
      description: labels.successHint,
      duration: TOAST_MS,
    });

    timer.current = setTimeout(() => {
      if (nextHref) router.push(nextHref);
      // 🔒 Обновляем СЕРВЕРНУЮ страницу: зелёная отметка рисуется из состояния
      // на сервере, и без этого она появится только после ручной перезагрузки.
      else { router.refresh(); setBusy(false); }
    }, ADVANCE_MS);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 🔒 СОХРАНЁННОЕ ЗНАЧЕНИЕ ПОКАЗЫВАЕТСЯ ЗЕЛЁНЫМ — требование владельца:
          «поле, в котором был добавлен репозиторий, должно существовать также с
          зелёным цветом». Оно стоит ОТДЕЛЬНОЙ строкой над полем ввода, а не
          подставляется в само поле: подставленное значение человек примет за
          свой черновик и начнёт править, а секрет туда вернуть невозможно —
          сервер отдаёт его замаскированным.

          Так на экране одновременно видно и то, что сохранено, и то, что можно
          ввести взамен. */}
      {saved && (
        <div
          data-saved-value
          className="flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-3.5 py-2.5"
        >
          <Check size={16} aria-hidden className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <Small className="truncate text-emerald-700 dark:text-emerald-300">{saved}</Small>
        </div>
      )}

      <label className="flex flex-col gap-2">
        <Small className="text-foreground">{labels.inputLabel}</Small>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={labels.inputPlaceholder}
          disabled={busy}
          type={secret ? "password" : "text"}
          autoComplete={secret ? "off" : undefined}
          spellCheck={secret ? false : undefined}
          data-secret={secret ? "true" : undefined}
          className="h-11"
        />
        {labels.inputHint && <Small>{labels.inputHint}</Small>}
      </label>

      {/* 🔒 ЕДИНСТВЕННАЯ КНОПКА ШАГА ИМЕЕТ ДВА СОСТОЯНИЯ, И ЭТО ЧАСТЬ СТАНДАРТА,
          А НЕ ЗАПЛАТКА НА ОДНУ СТРАНИЦУ (28-18, 2026-08-27).

          Пока шаг НЕ пройден — она сохраняет. Когда пройден и человек ничего не
          вводит — сохранять нечего, и на её месте стоит НАВИГАЦИЯ. Владелец
          нашёл это, вернувшись на готовый шаг: «горит неактивная кнопка
          „сохранить адрес“… здесь нужно допилить логику».

          🔒 ДЕФЕКТ БЫЛ ГЛУБЖЕ ВНЕШНЕГО ВИДА. Неактивная кнопка не просто
          некрасива — она объявляет главным действием шага то, которое на нём уже
          невозможно. Человек читает «сохранить» и ищет, что бы сохранить, вместо
          того чтобы идти дальше.

          🔒 СТОИТ ВВЕСТИ ЗНАЧЕНИЕ — И СОХРАНЕНИЕ ВОЗВРАЩАЕТСЯ. Пройденный шаг не
          заперт: значение можно заменить, и тогда кнопка снова становится
          кнопкой сохранения, но подписанной иначе — «заменить», а не
          «сохранить»: заменять и записывать впервые для человека разные вещи. */}
      {saved && !ready ? (
        <div className="flex flex-col gap-3 sm:flex-row" data-step-nav>
          {prevHref && (
            <Link
              href={prevHref}
              data-nav-prev
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 text-[length:var(--fs-small)] font-medium transition-colors hover:border-foreground/30"
            >
              <ArrowLeft size={16} aria-hidden className="shrink-0" />
              {labels.goPrev}
            </Link>
          )}
          {nextHref && (
            <Link
              href={nextHref}
              data-nav-next
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[length:var(--fs-small)] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {labels.goNext}
              <ArrowRight size={16} aria-hidden className="shrink-0" />
            </Link>
          )}
        </div>
      ) : (
        <Button
          type="button"
          onClick={submit}
          disabled={!ready || busy}
          data-step-cta
          className="h-11 w-full text-[length:var(--fs-small)]"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {busy ? labels.busy : saved ? labels.replace : labels.cta}
        </Button>
      )}
    </div>
  );
}
