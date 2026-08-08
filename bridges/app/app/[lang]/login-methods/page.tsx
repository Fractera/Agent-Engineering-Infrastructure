// Раздел «Способы входа» (шаг 501, Ф2, партия 10).
//
// Состояние читает сервер: настроен ли вход через Google, настроена ли
// ссылка-вход по почте, в защищённом ли режиме сервер. Поэтому видно без JS,
// что уже включено, а что нет.
//
// Островки только там, где иначе нельзя: ввод СЕКРЕТОВ (форма без JS отправила бы
// их перезагрузкой, и секрет попал бы в историю навигации) и копирование адреса
// возврата (набирать его руками — верный способ опечататься).
//
// Динамическая: настроенность и режим — живые.

import { KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readAuthMethods } from "./_lib/auth-methods";
import { MethodForm } from "./_components/method-form.client";
import { CopyUri } from "./_components/copy-uri.client";

export const dynamic = "force-dynamic";

export default async function LoginMethodsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const m = s.loginMethods;

  const result = await readAuthMethods();

  if (!result.ok) {
    return (
      <PageShell title={s.pages["login-methods"].title} hint={s.pages["login-methods"].hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{m.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.reason}</p>
        </div>
      </PageShell>
    );
  }

  const { secure, google, resend, googleCallbackUrl } = result.methods;

  const formLabels = {
    save: m.save, saving: m.saving, remove: m.remove, removeConfirm: m.removeConfirm,
    saved: m.saved, removed: m.removed, failed: m.failed,
  };

  const Status = ({ configured, masked }: { configured: boolean; masked: string | null }) =>
    configured ? (
      <span className="flex items-center gap-1 text-[10px] text-green-500">
        <CheckCircle size={10} />
        <span className="font-mono">{masked}</span>
      </span>
    ) : (
      <span className="text-[10px] text-muted-foreground">{m.notSet}</span>
    );

  return (
    <PageShell title={s.pages["login-methods"].title} hint={s.pages["login-methods"].hint}>
      {!secure ? (
        // Не отказ, а объяснимое условие: вход через Google требует адреса
        // возврата по HTTPS, а письмо — настоящего домена отправителя. Ссылка
        // ведёт прямо туда, где это включается, а не оставляет искать.
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          <p className="flex items-start gap-1.5">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>
              {m.needsSecure}{" "}
              <Link href={adminHref(lang, "domain")} className="underline">{s.pages.domain.title}</Link>
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
            {m.intro}
          </div>

          {/* Вход через Google */}
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                <KeyRound size={11} className="text-muted-foreground" />{m.googleTitle}
              </p>
              <Status configured={google.configured} masked={google.clientIdMasked} />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {m.googleHint}{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">
                Google Cloud console
              </a>
            </p>
            {googleCallbackUrl && (
              <>
                <p className="text-[10px] text-muted-foreground">{m.redirectUriLabel}</p>
                <CopyUri value={googleCallbackUrl} copied={m.uriCopied} failed={m.uriCopyFailed} />
              </>
            )}
            <MethodForm
              clearKey="clearGoogle"
              configured={google.configured}
              labels={formLabels}
              fields={[
                { key: "googleClientId", placeholder: google.configured ? m.googleIdReplace : m.googleId },
                { key: "googleClientSecret", placeholder: google.configured ? m.googleSecretReplace : m.googleSecret, secret: true },
              ]}
            />
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Вход по ссылке из письма */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                <KeyRound size={11} className="text-muted-foreground" />{m.emailTitle}
              </p>
              <Status configured={resend.configured} masked={resend.keyMasked} />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {m.emailHint}{" "}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                resend.com
              </a>
            </p>
            <MethodForm
              clearKey="clearResend"
              configured={resend.configured}
              labels={formLabels}
              fields={[
                { key: "resendApiKey", placeholder: resend.configured ? m.resendKeyReplace : m.resendKey, secret: true },
                { key: "resendFrom", placeholder: m.resendFrom, initial: resend.from ?? "" },
              ]}
            />
          </div>

          <p className="mt-4 flex items-start gap-1.5 rounded-md border border-border bg-muted/30 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            <span>{m.restartNote}</span>
          </p>
        </>
      )}

      <HelpDetails label={m.helpLabel}>
        <p><strong>{m.helpWhatTitle}</strong> {m.helpWhat}</p>
        <p><strong>{m.helpWhySecureTitle}</strong> {m.helpWhySecure}</p>
        <p><strong>{m.helpEmptyTitle}</strong> {m.helpEmpty}</p>
        <p><strong>{m.helpSecretsTitle}</strong> {m.helpSecrets}</p>
      </HelpDetails>
    </PageShell>
  );
}
