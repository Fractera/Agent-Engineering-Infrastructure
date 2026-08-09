// Раздел «Каналы связи» (шаг 501, Ф2, партия 11).
//
// Состояние читает сервер, поэтому без JS видно главное: жива ли служба, сохранён
// ли токен, узнаёт ли его сам Telegram, привязана ли учётная запись.
//
// ТРИ РАЗНЫХ состояния различаются намеренно, потому что лечение у них разное:
//   • служба не запущена → её надо поднять;
//   • токен не сохранён → его надо получить у @BotFather;
//   • токен сохранён, но Telegram его не узнаёт → токен неверный или отозван.
// Старая панель показывала последнее припиской в подписи поля, где её легко
// пропустить; здесь это отдельная строка состояния.
//
// Динамическая: состояние службы и привязки — живые.

import { MessagesSquare, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readChannels } from "./_lib/channels";
import { TelegramSetup } from "./_components/telegram-setup.client";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export default async function ChannelsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const c = s.channels;

  const { available, telegram } = await readChannels();

  return (
    <PageShell lang={lang} slug="channels" s={s} title={s.pages.channels.title} hint={s.pages.channels.hint}>
      {!available ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-destructive" />
          <div className="text-[11px] leading-relaxed text-destructive">
            {c.serviceDown}
            <br />
            <code className="mt-1 inline-block rounded bg-destructive/10 px-1 font-mono">pm2 start fractera-channels</code>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <span className="flex flex-1 items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <MessagesSquare size={12} className="text-muted-foreground" />Telegram
            </span>
            {/* Состояние привязки — одной строкой, тремя разными видами. */}
            {telegram?.chatId ? (
              <span className="flex items-center gap-1 text-[10px] text-green-500">
                <CheckCircle size={10} />{fill(c.linkedTo, { who: telegram.who ?? telegram.chatId })}
              </span>
            ) : telegram?.configured ? (
              <span className="text-[10px] text-orange-500">{c.notLinked}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">{c.noToken}</span>
            )}
          </div>

          <div className="flex flex-col gap-3 p-3">
            {/* Токен сохранён, но Telegram его не узнаёт — отдельное состояние, а не
                приписка в подписи поля: лечение у него своё (токен неверный или
                отозван у @BotFather). */}
            {telegram?.configured && !telegram.reachable && (
              <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[10px] leading-relaxed text-destructive">
                <XCircle size={11} className="mt-0.5 shrink-0" />
                <span>{c.tokenRejected}</span>
              </p>
            )}

            {telegram?.configured && telegram.reachable && telegram.bot && (
              <p className="text-[10px] text-muted-foreground">
                {c.currentBot} <span className="font-mono text-foreground">@{telegram.bot}</span>
              </p>
            )}

            <TelegramSetup
              configured={Boolean(telegram?.configured)}
              enabled={telegram?.enabled !== false}
              labels={{
                tokenLabel: c.tokenLabel, tokenPlaceholder: c.tokenPlaceholder, tokenReplace: c.tokenReplace,
                save: c.save, saving: c.saving, saved: c.saved, failed: c.failed,
                connect: telegram?.chatId ? c.relink : c.connect, relink: c.relink,
                waiting: c.waiting, openTelegram: c.openTelegram,
                linked: c.linkedToast, linkTimeout: c.linkTimeout, linkExpired: c.linkExpired,
                linkFailed: c.linkFailed, channelOn: c.channelOn,
              }}
            />

            <p className="border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
              {c.answersFrom}{" "}
              <Link href={adminHref(lang, "agentic-rag")} className="underline">{s.pages["agentic-rag"].title}</Link>
              {". "}
              {c.neverInvents}
            </p>
          </div>
        </div>
      )}

      <HelpDetails label={c.helpLabel}>
        <p><strong>{c.helpWhatTitle}</strong> {c.helpWhat}</p>
        <p><strong>{c.helpWhyTitle}</strong> {c.helpWhy}</p>
        <p><strong>{c.helpLinkTitle}</strong> {c.helpLink}</p>
        <p><strong>{c.helpOffTitle}</strong> {c.helpOff}</p>
      </HelpDetails>
    </PageShell>
  );
}
