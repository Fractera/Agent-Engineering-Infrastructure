// Документ «Пользовательские кейсы» — что это и зачем, без машинерии.
//
// 🔒 РАБОТА ОТСЮДА ПЕРЕЕХАЛА 2026-08-18 в группу «Продукты»: список продуктов на
// `/products`, кейсы конкретного продукта на `/products/{id}/use-cases`. Здесь
// была страница на 534 строки с Quiz, доской кейсов и выбором продукта через
// `?product=`, и лежала она между двадцатью одним текстом — по виду меню
// неотличимая от документа, хотя документом не была.
//
// Что осталось: объяснение сущности и команды активации. Документ нужен затем,
// что кейс — понятие продукта, а не кнопка: человек, впервые встретивший слово,
// должен прочитать его определение там же, где читает остальные.
//
// Динамическая: команды приходят из набора инструкций, который живой.

import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { DocCommands } from "../_components/doc-commands";
import { readInstructionSet } from "@/lib/instruction-set";
import { USE_CASES_DIR, CASES_SUBDIR, RAW_SUBDIR } from "@/lib/use-cases-store";

export const dynamic = "force-dynamic";

export default async function UseCasesDocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const u = s.useCases;
  const o = s.docsOverview;
  const page = s.pages["doc-use-cases"];
  const set = readInstructionSet();

  return (
    <PageShell lang={lang} slug="doc-use-cases" s={s} title={page.title} hint={page.hint}>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{u.flowLead}</p>

      {/* Четыре этапа рождения кейса — теми же словами, что подсвечиваются на
          рабочей странице продукта. Здесь без отметки «вы здесь»: документ
          объясняет устройство, а не ведёт за руку. */}
      <ol className="mt-4 space-y-2.5">
        {[
          { t: u.flowStep1Title, b: u.flowStep1, out: u.flowStep1Out },
          { t: u.flowStep2Title, b: u.flowStep2, out: u.flowStep2Out },
          { t: u.flowStep3Title, b: u.flowStep3, out: u.flowStep3Out },
          { t: u.flowStep4Title, b: u.flowStep4, out: u.flowStep4Out },
        ].map((x) => (
          <li key={x.t} className="rounded-md border border-border p-2.5 text-[11px] leading-relaxed">
            <p className="font-semibold text-foreground">{x.t}</p>
            <p className="mt-1 text-muted-foreground">{x.b}</p>
            <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
              <span className="uppercase tracking-wide">{u.flowOutLabel}:</span> {x.out}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
        <strong>{u.flowQualityTitle}</strong> {u.flowQuality}
      </p>

      <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-foreground">
        <p><strong>{u.flowBoundaryTitle}</strong> {u.flowBoundary}</p>
        <p><strong>{u.flowAfterTitle}</strong> {u.flowAfter}</p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">{u.flowWhereTitle}</strong> {u.flowWhere}
        </p>
      </div>

      {/* Где кейсы лежат на диске. Продукт в пути назван переменной: у каждого
          продукта своя папка, и общего адреса у кейсов не существует. */}
      <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <FolderOpen size={11} />
        {`${USE_CASES_DIR}/<product>/${CASES_SUBDIR}`} · {`${USE_CASES_DIR}/<product>/${RAW_SUBDIR}`}
      </p>

      {/* Работа — в другой группе, и ссылка обязана быть первой вещью, которую
          человек здесь найдёт: документ, не показывающий дороги к делу, читается
          как тупик. */}
      <Link
        href={adminHref(lang, "products")}
        className="mt-5 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 transition-colors hover:border-primary"
      >
        <span>
          <span className="block text-[12px] font-medium text-foreground">{s.pages["products"].title}</span>
          <span className="block text-[10px] text-muted-foreground">{s.pages["products"].hint}</span>
        </span>
        <ArrowRight size={13} className="shrink-0 text-muted-foreground" />
      </Link>

      {/* Команды кейсов: добавить, найти, изменить — здесь, потому что команда
          принадлежит документу-способности, а не рабочему экрану. */}
      <div className="mt-3 rounded-lg border border-border p-3">
        <DocCommands
          docKey="doc-use-cases"
          lang={lang}
          commands={set.commands}
          labels={{
            caption: o.commandCaption, helpTitle: o.commandHelp,
            edit: o.commandEdit, save: o.commandSave, saving: o.commandSaving,
            cancel: o.commandCancel, saved: o.commandSaved, failed: s.docs.failed,
            phrasePlaceholder: o.commandPlaceholder, anchorNote: o.commandAnchorNote,
            verbs: { activate: o.verbActivate, add: o.verbAdd, find: o.verbFind, edit: o.verbEdit },
          }}
        />
      </div>

      <HelpDetails label={u.helpLabel}>
        <p><strong>{u.helpWhyTitle}</strong> {u.helpWhy}</p>
        <p><strong>{u.helpRawTitle}</strong> {u.helpRaw}</p>
        <p><strong>{u.helpConfirmTitle}</strong> {u.helpConfirm}</p>
      </HelpDetails>
    </PageShell>
  );
}
