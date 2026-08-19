// Раздел «Переменные окружения» (шаг 501, Ф2, партия 15).
//
// 🔒 Значения секретов НЕ уезжают в браузер: сервер отдаёт маску. Старая панель
// присылала весь файл окружения и рисовала значения открытым текстом — ключ GitHub
// и AUTH_SECRET лежали в разметке страницы. Смотреть на секрет незачем, менять его
// нужно, поэтому обмен верный.
//
// 🔒 ПОРЯДОК СВЕРХУ ВНИЗ ОТВЕЧАЕТ ПОРЯДКУ РАБОТЫ (владелец 2026-08-19): сначала
// как устроен второй канал к серверу, потом перенос файла на локальную машину —
// шаг, без которого клон не поднимается вовсе, — и только потом правка значений.
//
// Динамическая: значения живые.

import { AlertCircle, Lock, Download } from "lucide-react";
import { getAdminStrings, fill } from "@/lib/i18n/admin-strings";
import { hasMark, ENV_TRANSFERRED_KEY } from "@/lib/dev-tools-marks";
import { publicAppUrl } from "@/lib/public-app-url";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readEnv } from "./_lib/env";
import { EnvEditor } from "./_components/env-editor.client";
import { TransferCheck } from "./_components/transfer-check.client";
import { SshAccess } from "./_components/ssh-access.client";

export const dynamic = "force-dynamic";

export default async function EnvPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const e = s.env;

  const result = await readEnv();
  const transferred = hasMark(ENV_TRANSFERRED_KEY);

  // Письмо о правке платформы собирается на СЕРВЕРЕ и теми же словами, что на
  // странице «Как построить этот проект»: партнёру не нужно вспоминать свой адрес,
  // а нам он — единственное, что требуется во вводном письме.
  const address = publicAppUrl().url;
  const change = {
    title: s.howToBuild.changeTitle,
    body: s.howToBuild.changeBody,
    button: s.howToBuild.changeButton,
    copied: s.howToBuild.changeCopied,
    hint: s.howToBuild.changeMailHint,
    mailSubject: s.howToBuild.changeMailSubject,
    mailBody: fill(s.howToBuild.changeMailBody, { address }),
  };

  return (
    <PageShell lang={lang} slug="env" s={s} title={s.pages.env.title} hint={s.pages.env.hint}>
      {/* Второй канал к серверу — абзац на странице, процедура в окне. */}
      <SshAccess
        ui={{
          lead: e.sshLead, open: e.sshOpen, title: e.sshTitle,
          whyTitle: e.sshWhyTitle, why: e.sshWhy,
          allowedTitle: e.sshAllowedTitle, allowed: e.sshAllowed,
          forbiddenTitle: e.sshForbiddenTitle, forbidden: e.sshForbidden,
          howTitle: e.sshHowTitle, how: e.sshHow,
        }}
        change={change}
        to="admin@fractera.ai"
      />

      <p className="mt-3 flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <span>{e.warning}</span>
      </p>

      {/* ВЫГРУЗКА ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ. Перенесена из старой панели вместе с
          её сутью: этот файл — единственный способ, которым клон на машине
          разработчика ходит в ЖИВОЙ слой данных сервера. Ничего не копируется на
          ноутбук, поэтому двух расходящихся версий данных не возникает.

          Обычная ссылка с `download`, а не островок: браузер сохраняет ответ сам,
          и работает это без JS.

          🔒 ГАЛОЧКА ПОД КНОПКОЙ, А НЕ ВМЕСТО НЕЁ (владелец 2026-08-19). Скачивание
          панель видит, перенос — нет: между загрузками браузера и папкой клона у
          неё нет глаз. Поэтому красное предупреждение гасит человек, и снимается
          отметка так же легко, как ставится. */}
      <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          {e.transferTitle}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">{e.exportHint}</p>
        <a
          href="/api/config/env-export"
          download=".env.local"
          title={e.exportTitle}
          className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/10 px-2.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-500/20 dark:text-blue-300"
        >
          <Download size={11} />
          <span className="font-mono">{e.exportAction}</span>
        </a>
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{e.transferHint}</p>
        <TransferCheck
          initial={transferred}
          labels={{ label: e.transferLabel, saving: e.transferSaving, failed: e.transferFailed }}
        />
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{e.exportWarning}</p>
      </div>

      {!result.ok ? (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{e.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.reason}</p>
        </div>
      ) : (
        <div className="mt-3">
          <EnvEditor
            entries={result.entries}
            labels={{
              keyHeader: e.keyHeader, valueHeader: e.valueHeader,
              lockedHint: e.lockedHint, secretHint: e.secretHint,
              emptyValue: e.emptyValue, unchanged: e.unchanged,
              add: e.add, newKey: e.newKey, newValue: e.newValue,
              remove: e.remove, removeConfirm: e.removeConfirm,
              save: e.save, saving: e.saving, saved: e.saved,
              nothingToSave: e.nothingToSave, failed: e.failed,
            }}
          />
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
            <Lock size={10} className="mt-0.5 shrink-0" />
            <span>{e.lockedHint}</span>
          </p>
        </div>
      )}

      <HelpDetails label={e.helpLabel}>
        <p><strong>{e.helpWhenTitle}</strong> {e.helpWhen}</p>
        <p><strong>{e.helpBuildTitle}</strong> {e.helpBuild}</p>
        <p><strong>{e.helpMaskTitle}</strong> {e.helpMask}</p>
        <p><strong>{e.helpLockedTitle}</strong> {e.helpLocked}</p>
      </HelpDetails>
    </PageShell>
  );
}
