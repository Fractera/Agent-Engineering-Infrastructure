// Таблица учётных записей (шаг 501, Ф2). СЕРВЕРНЫЙ компонент: строки приезжают
// готовым HTML, поэтому список читается и при выключенном JS. Клиентским
// остаётся только меню действий на строке.
//
// Разметка и классы взяты из старой панели дословно — те же размеры, те же
// бейджи ролей, тот же зелёный «активен» и красный «заблокирован».

import { CheckCircle, Ban } from "lucide-react";
import { parseRoles, type AdminUser } from "../_lib/users";
import { UserActions, type UserActionLabels } from "./user-actions.client";

export type TableLabels = {
  name: string; email: string; role: string; status: string;
  active: string; blocked: string; empty: string;
};

export function UsersTable(
  { users, labels, actionLabels }:
  { users: AdminUser[]; labels: TableLabels; actionLabels: UserActionLabels },
) {
  if (!users.length) {
    return (
      <div className="flex h-32 items-center justify-center text-[11px] text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  return (
    // Узкий экран не имеет права растягивать страницу — таблица прокручивается
    // внутри себя.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{labels.name}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{labels.email}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{labels.role}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{labels.status}</th>
            <th className="w-8 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const roles = parseRoles(u.roles);
            const isActive = u.is_active === 1;
            return (
              <tr key={u.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                <td className="max-w-[120px] truncate px-3 py-2 font-medium">{u.nickname ?? "—"}</td>
                <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                      <span key={r} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {r}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {isActive ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle size={10} />{labels.active}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-destructive">
                      <Ban size={10} />{labels.blocked}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <UserActions
                    id={u.id}
                    email={u.email}
                    nickname={u.nickname}
                    roles={roles}
                    isActive={isActive}
                    labels={actionLabels}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
