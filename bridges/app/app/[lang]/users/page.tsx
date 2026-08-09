// Раздел «Пользователи» (шаг 501, Ф2, партия 2).
//
// ПОЧЕМУ ЭТА СТРАНИЦА ДИНАМИЧЕСКАЯ — и почему это не нарушение канона статики.
// Список учётных записей отдаёт служба авторизации ПО СЕССИИ посетителя, значит
// данные принадлежат конкретному человеку и моменту. Запечь их на сборке нельзя
// (это была бы ложь), кешировать — тоже. Канон это прямо разрешает: служебные
// страницы архитектора МОГУТ и РЕКОМЕНДУЕТСЯ оставаться динамическими. Гейт
// роли `architect` стоит в `proxy.ts`, то есть страница по определению
// архитекторская.
//
// Динамика объявлена НА СТРАНИЦЕ, никогда на layout: корневой `force-dynamic`
// сделал бы динамическим весь слой.
//
// Что при этом всё равно работает без JS: чтение таблицы, поиск (форма `get`) и
// перелистывание (ссылки). Клиентский островок нужен только для ИЗМЕНЕНИЙ.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { fetchUsersPage } from "./_lib/users";
import { UsersTable } from "./_components/users-table";
import { SearchForm } from "../_components/search-form";
import { UsersPagination } from "./_components/users-toolbar";

export const dynamic = "force-dynamic";

export default async function UsersPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string; page?: string }>;
  },
) {
  const { lang } = await params;
  const { q = "", page: pageParam } = await searchParams;
  const s = getAdminStrings(lang);
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await fetchUsersPage(q, page);
  const u = s.users;

  return (
    <PageShell lang={lang} slug="users" s={s} title={s.pages.users.title} hint={s.pages.users.hint}>
      <SearchForm value={q} placeholder={u.searchPlaceholder} submit={u.search} resetPage />

      <div className="mt-3">
        {result.ok ? (
          <>
            <UsersTable
              users={result.users}
              labels={{
                name: u.name, email: u.email, role: u.role, status: u.status,
                active: u.active, blocked: u.blocked, empty: u.empty,
              }}
              actionLabels={{
                actions: u.actions, edit: u.edit, block: u.block, unblock: u.unblock, delete: u.delete,
                editTitle: u.editTitle, nickname: u.nickname, email: u.email, roles: u.roles,
                rolesHint: u.rolesHint, cancel: u.cancel, save: u.save,
                blockTitle: u.blockTitle, unblockTitle: u.unblockTitle, deleteTitle: u.deleteTitle,
                blockBody: u.blockBody, unblockBody: u.unblockBody, deleteBody: u.deleteBody,
                updated: u.updated, deleted: u.deleted, blocked: u.blockedToast,
                unblocked: u.unblockedToast, failed: u.failed,
              }}
            />
            <div className="mt-2">
              <UsersPagination
                q={q}
                page={result.page}
                pages={result.pages}
                total={result.total}
                totalLabel={u.total}
                pageLabel={u.pageOf}
              />
            </div>
          </>
        ) : (
          // Служба недоступна — это НЕ «пользователей нет». Разница названа
          // вслух, иначе владелец решит, что база пуста.
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-[12px] font-medium text-destructive">{u.unavailable}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.reason}</p>
          </div>
        )}
      </div>

      <HelpDetails label={u.helpLabel}>
        <p><strong>{u.helpWhatTitle}</strong> {u.helpWhat}</p>
        <p><strong>{u.helpWhyTitle}</strong> {u.helpWhy}</p>
        <p><strong>{u.helpHowTitle}</strong> {u.helpHow}</p>
      </HelpDetails>
    </PageShell>
  );
}
