"use client";

import { useUiLang } from "../../../use-ui-lang";
import { welcomeStrings } from "./i18n";

// ПРИВЕТСТВИЕ НОВОРОЖДЁННОЙ АВТОМАТИЗАЦИИ (микросервис `components/welcome`, шаг 302). Показывается, пока
// автоматизация — только что созданный замороженный клон стартера БЕЗ единого пользовательского кейса:
// пустой холст, имя в шапке и это приглашение. Смысл — увести СТРОИТЕЛЯ в пользовательские кейсы: описание
// рождается там, в Quiz, и только из него ИИ понимает, что строить (закон `passport.md` §7).
//
// 🔒 ПОЧЕМУ ЗДЕСЬ, А НЕ В СТАРТЕРЕ (шаг 302): онбординг обращён к СТРОИТЕЛЮ, не к конечному пользователю
// продукта → по границе «кто смотрит» это КОКПИТ, а кокпит десятиязычен и живёт одной копией в `_shared-v2`.
// Стартер монтирует его тонко через свой fail-silent дев-слот (`DevWelcome`) — отсутствует `_shared-v2`,
// приветствия просто нет, продакшн не задет (закон устойчивости, шаг 298).
export function Welcome({ lang }: { lang: string }) {
  // Реактивный язык кокпита (селектор в футере зоны) ПОБЕЖДАЕТ серверный проп: welcome переключается
  // мгновенно вместе с остальным дев-слоем, без перезагрузки. Проп остаётся как SSR-фолбэк (хотя welcome
  // рендерится ssr:false — на всякий случай). Это и есть лечение «футер на русском, а содержимое английское».
  const ui = useUiLang();
  const t = welcomeStrings(ui || lang);
  return (
    <section data-section="welcome" className="mt-6 rounded-xl border border-dashed bg-card/50 p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{t.title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{t.body}</p>
      <p className="mt-3 text-sm font-medium text-foreground">{t.cta}</p>
    </section>
  );
}
