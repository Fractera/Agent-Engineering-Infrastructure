"use client";

// Изменения над учётной записью (шаг 501, Ф2). ЕДИНСТВЕННЫЙ островок раздела:
// правка, блокировка и удаление — действия, их без JS не сделать. Чтение таблицы
// при этом остаётся серверным и работает без JS; островок отвечает только за
// действия.
//
// После успешного изменения вызывается `router.refresh()` — сервер пересобирает
// страницу с новыми данными. Это замена прежнему `fetchUsers()`: список
// приходит из одного места (сервера), а не собирается заново в браузере, поэтому
// таблица и адрес не могут разойтись.
//
// Обращаемся к маршрутам ПАНЕЛИ (`/api/admin/users/...`), а не к службе
// авторизации напрямую: правило «браузер говорит с панелью» не меняем.
//
// Словарь сюда не импортируется — подписи приезжают пропсами из серверной
// страницы, поэтому 82 языка остаются на сервере.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, Ban, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ALL_ROLES } from "@/lib/roles";

export type UserActionLabels = {
  actions: string;
  edit: string; block: string; unblock: string; delete: string;
  editTitle: string; nickname: string; email: string; roles: string; rolesHint: string;
  cancel: string; save: string;
  blockTitle: string; unblockTitle: string; deleteTitle: string;
  blockBody: string; unblockBody: string; deleteBody: string;
  updated: string; deleted: string; blocked: string; unblocked: string; failed: string;
};

type Props = {
  id: string;
  email: string;
  nickname: string | null;
  roles: string[];
  isActive: boolean;
  labels: UserActionLabels;
};

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export function UserActions({ id, email, nickname, roles, isActive, labels }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [nick, setNick] = useState(nickname ?? "");
  const [mail, setMail] = useState(email);
  const [nextRoles, setNextRoles] = useState<string[]>(roles);
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState<null | "block" | "unblock" | "delete">(null);
  const [running, setRunning] = useState(false);

  async function call(init: RequestInit, okMessage: string) {
    const res = await fetch(`/api/admin/users/${id}`, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data?.error ?? labels.failed));
    toast.success(okMessage);
    // Обновление данных — дело сервера; переход в transition, чтобы кнопка не
    // «отпускалась» раньше, чем страница пересобралась.
    startTransition(() => router.refresh());
  }

  async function save() {
    setSaving(true);
    try {
      await call({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nick, email: mail, roles: nextRoles }),
      }, labels.updated);
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  async function run() {
    if (!confirm) return;
    setRunning(true);
    try {
      if (confirm === "delete") {
        await call({ method: "DELETE" }, labels.deleted);
      } else {
        await call({
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ is_active: confirm === "block" ? 0 : 1 }),
        }, confirm === "block" ? labels.blocked : labels.unblocked);
      }
      setConfirm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setRunning(false);
    }
  }

  const confirmTitle = confirm === "delete" ? labels.deleteTitle
    : confirm === "block" ? labels.blockTitle : labels.unblockTitle;
  const confirmBody = confirm === "delete" ? labels.deleteBody
    : confirm === "block" ? labels.blockBody : labels.unblockBody;

  return (
    <>
      <DropdownMenu>
        {/* `asChild` — это Radix: триггером становится наша кнопка, а не
            вложенный в неё второй элемент. Проверено по components/ui/dropdown-menu.tsx,
            он собран на radix-ui. */}
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={labels.actions}>
            <MoreVertical size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem className="text-[11px]" onClick={() => setEditOpen(true)}>
            <Pencil size={10} />{labels.edit}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[11px]" onClick={() => setConfirm(isActive ? "block" : "unblock")}>
            <Ban size={10} />{isActive ? labels.block : labels.unblock}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* У DropdownMenuItem нет пропса `variant` — разрушительное действие
              красится классом. */}
          <DropdownMenuItem
            className="text-[11px] text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={() => setConfirm("delete")}
          >
            <Trash2 size={10} />{labels.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">{labels.editTitle}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">{labels.nickname}</label>
              <Input value={nick} onChange={(e) => setNick(e.target.value)} className="h-8 text-[11px]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">{labels.email}</label>
              <Input value={mail} onChange={(e) => setMail(e.target.value)} type="email" className="h-8 text-[11px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground">{labels.roles}</label>
              <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto rounded-md border border-border bg-background p-2">
                {ALL_ROLES.map((r) => (
                  <label key={r} className="flex cursor-pointer select-none items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
                    <Checkbox
                      checked={nextRoles.includes(r)}
                      onCheckedChange={(v) =>
                        setNextRoles((prev) => (v === true ? [...new Set([...prev, r])] : prev.filter((x) => x !== r)))
                      }
                    />
                    <span className="font-mono text-[11px] text-foreground">{r}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.rolesHint}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setEditOpen(false)}>
              {labels.cancel}
            </Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={save} disabled={saving || nextRoles.length === 0}>
              {saving ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">{confirmTitle}</DialogTitle></DialogHeader>
          <p className="text-[11px] text-muted-foreground">{fill(confirmBody, { email })}</p>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setConfirm(null)}>
              {labels.cancel}
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              variant={confirm === "delete" ? "destructive" : "default"}
              onClick={run}
              disabled={running}
            >
              {running ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}
              {confirm === "delete" ? labels.delete : confirm === "block" ? labels.block : labels.unblock}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
