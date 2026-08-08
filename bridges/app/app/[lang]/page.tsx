// Холст покоя нового слоя панели (шаг 501). То, что видно по адресу `/en`.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { NAV_GROUPS, NAV_BY_GROUP, adminHref } from "@/lib/admin-nav";
import { PageShell } from "./_components/page-shell";

export default async function AdminHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);

  return (
    <PageShell title={s.home.title} hint={s.home.hint}>
      {/* Тот же список, что в гамбургере, — чтобы карту слоя было видно целиком
          с первого экрана, пока разделы наполняются. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {NAV_GROUPS.map((group) => (
          <section key={group}>
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {s.navGroups[group]}
            </h2>
            <ul className="space-y-0.5">
              {NAV_BY_GROUP[group].map((slug) => (
                <li key={slug}>
                  <Link
                    href={adminHref(lang, slug)}
                    className="block rounded-md px-2 py-1 text-[12px] text-foreground hover:bg-muted"
                  >
                    {s.pages[slug].title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
