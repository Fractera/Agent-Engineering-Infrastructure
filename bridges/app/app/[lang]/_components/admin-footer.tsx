// Подвал нового слоя панели (шаг 501). Серверный компонент, форма повторяет
// сегодняшний подвал: слева состояние проекта, справа действия.
//
// Три действия — развернуть, забрать, отправить — живут в островке
// `FooterActions`: они трогают сервер, а развёртывание ещё и опрашивает
// собственную задачу. До 2026-08-10 здесь стояли заготовки, и это читалось как
// поломка: связь с GitHub настроена, а кнопки серые.
//
// Мобильное правило дня 2026-08-08 соблюдено сразу: ниже sm остаются иконки и
// версия коммита, подписи и имя репозитория скрыты.

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { adminHref } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch.client";
import { WidthSwitch } from "./width-switch.client";
import { FooterActions } from "./footer-actions.client";

export function AdminFooter({ s, lang }: { s: AdminStrings; lang: string }) {
  const f = s.footer;

  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-t border-border bg-background px-3">
      {/* Подписи приезжают пропсами: словарь остаётся серверным, 82 языка в
          браузер не уезжают. */}
      <FooterActions
        labels={{
          deploy: f.deploy, pull: f.pull, push: f.push,
          deploying: f.deploying, pulling: f.pulling, pushing: f.pushing,
          deployStarted: f.deployStarted, deployOk: f.deployOk, deployFailed: f.deployFailed,
          pullOk: f.pullOk, pullFailed: f.pullFailed,
          pushOk: f.pushOk, pushFailed: f.pushFailed,
          notConnected: f.notConnected, stateUnknown: f.stateUnknown,
          copy: f.copy, copied: f.copied, copyFailed: f.copyFailed,
          agentHint: f.agentHint,
          stateBranch: f.stateBranch, stateCommit: f.stateCommit,
          stateUncommitted: f.stateUncommitted, stateAheadBehind: f.stateAheadBehind,
          stateCompareUnavailable: f.stateCompareUnavailable, statePlatform: f.statePlatform,
        }}
      >
        {/* Ссылка на руководство стоит между состоянием и действиями — как в
            старом подвале. Передаётся островку СОДЕРЖИМЫМ: сама она серверная и
            в браузер как код не уезжает. */}
        <Link
          href={adminHref(lang, "how-to-build")}
          className="inline-flex h-5 items-center gap-1 rounded border border-border px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <BookOpen size={10} />
          <span className="hidden lg:inline">{f.howToBuild}</span>
        </Link>
      </FooterActions>

      {/* Правый нижний угол — три настройки взгляда на панель, а не действия над
          проектом: ширина, тема и язык. Стоят последними и рядом намеренно, в
          порядке от общего к частному: сколько места, каким цветом, на каком
          языке.
          Подписи приезжают сюда пропсами: островки клиентские, и словарь им
          передаётся уже разрешённым, чтобы 82 языка не уехали в браузер. */}
      <WidthSwitch labels={s.width} />
      <ThemeSwitch labels={s.theme} />
      <LanguageSwitch lang={lang} />
    </div>
  );
}
