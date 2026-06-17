"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, X, Pencil, Trash2, Ban, CheckCircle, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type User = {
  id: string;
  email: string;
  nickname: string | null;
  roles: string;
  is_active: number;
  provider: string;
  created_at: string;
};

type Props = { onClose: () => void };

const ALL_ROLES = ["architect", "user", "guest"];
const PER_PAGE = 100;

export function UsersPanel({ onClose }: Props) {
  const [users, setUsers]         = useState<User[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [openMenu, setOpenMenu]   = useState<string | null>(null);

  const [editUser, setEditUser]   = useState<User | null>(null);
  const [editNick, setEditNick]   = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const [confirmUser, setConfirmUser] = useState<{ user: User; action: "block" | "unblock" | "delete" } | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  const menuRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers("", 1); }, [fetchUsers]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); fetchUsers(search, 1); }, 300);
  }, [search, fetchUsers]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function openEdit(u: User) {
    setEditUser(u);
    setEditNick(u.nickname ?? "");
    setEditEmail(u.email);
    try { setEditRoles(JSON.parse(u.roles)); } catch { setEditRoles(["user"]); }
    setOpenMenu(null);
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: editNick, email: editEmail, roles: editRoles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("User updated");
      setEditUser(null);
      fetchUsers(search, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  }

  async function runConfirm() {
    if (!confirmUser) return;
    setConfirmSaving(true);
    const { user, action } = confirmUser;
    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        toast.success("User deleted");
      } else {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ is_active: action === "block" ? 0 : 1 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        toast.success(action === "block" ? "User blocked" : "User unblocked");
      }
      setConfirmUser(null);
      fetchUsers(search, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirmSaving(false);
    }
  }

  function handlePageChange(next: number) {
    setPage(next);
    fetchUsers(search, next);
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold">Users</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-[11px]"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] text-muted-foreground">No users found</div>
        ) : (
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Role</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                let parsedRoles: string[] = [];
                try { parsedRoles = JSON.parse(u.roles); } catch { parsedRoles = []; }
                const isActive = u.is_active === 1;

                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-medium truncate max-w-[120px]">{u.nickname ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                        {parsedRoles[0] ?? "user"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isActive ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle size={10} />Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <Ban size={10} />Blocked
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 relative">
                      <div ref={openMenu === u.id ? menuRef : undefined} className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical size={12} />
                        </button>
                        {openMenu === u.id && (
                          <div className="absolute right-0 top-full mt-1 z-[9999] bg-background border border-border rounded-md shadow-lg overflow-hidden min-w-[120px]">
                            <button type="button" onClick={() => openEdit(u)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-foreground hover:bg-muted transition-colors">
                              <Pencil size={10} />Edit
                            </button>
                            <button type="button" onClick={() => { setConfirmUser({ user: u, action: isActive ? "block" : "unblock" }); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-foreground hover:bg-muted transition-colors">
                              <Ban size={10} />{isActive ? "Block" : "Unblock"}
                            </button>
                            <div className="h-px bg-border mx-2" />
                            <button type="button" onClick={() => { setConfirmUser({ user: u, action: "delete" }); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 size={10} />Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[11px] text-muted-foreground shrink-0">
        <span>{total} users total</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}
            className="disabled:opacity-30 hover:text-foreground transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}
            className="disabled:opacity-30 hover:text-foreground transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit user</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Nickname</label>
              <Input value={editNick} onChange={(e) => setEditNick(e.target.value)} className="h-8 text-[11px]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Email</label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 text-[11px]" type="email" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Role</label>
              <select
                value={editRoles[0] ?? "user"}
                onChange={(e) => setEditRoles([e.target.value])}
                className="h-8 rounded-md border border-border bg-background px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 size={11} className="animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmUser} onOpenChange={(o) => { if (!o) setConfirmUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {confirmUser?.action === "delete" ? "Delete user" : confirmUser?.action === "block" ? "Block user" : "Unblock user"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            {confirmUser?.action === "delete"
              ? `Are you sure you want to permanently delete ${confirmUser.user.email}? This cannot be undone.`
              : confirmUser?.action === "block"
              ? `Block ${confirmUser?.user.email}? They will not be able to sign in.`
              : `Unblock ${confirmUser?.user.email}? They will be able to sign in again.`}
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setConfirmUser(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              variant={confirmUser?.action === "delete" ? "destructive" : "default"}
              onClick={runConfirm}
              disabled={confirmSaving}
            >
              {confirmSaving ? <Loader2 size={11} className="animate-spin mr-1" /> : null}
              {confirmUser?.action === "delete" ? "Delete" : confirmUser?.action === "block" ? "Block" : "Unblock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
