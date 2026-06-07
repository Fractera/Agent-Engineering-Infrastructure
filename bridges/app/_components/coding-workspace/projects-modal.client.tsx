"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Search, Check, FolderGit2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export type Project = { id: string; name: string; created_at: string };

type Props = {
  open: boolean;
  onClose: () => void;
  selected: string[];                  // project names used as the table filter
  onChange: (next: string[]) => void;  // multi-select; empty = show all
};

export function ProjectsModal({ open, onClose, selected, onChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setProjects(data.projects ?? []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  }

  async function addProject() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNewName("");
      await load();
      if (!selected.includes(name)) onChange([...selected, name]);
      toast.success(data.existed ? "Project already exists" : "Project added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setAdding(false);
    }
  }

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0" style={{ maxHeight: 600 }}>
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm flex items-center gap-2">
            <FolderGit2 size={14} /> Projects
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Split your codebase by project. Select one or more to filter the table; none selected shows all.
          </p>
        </DialogHeader>

        {/* Add new project */}
        <div className="px-4 py-2 border-y border-border flex items-center gap-2">
          <Input
            placeholder="New project name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addProject(); }}
            className="h-7 text-[11px]"
          />
          <Button size="sm" className="h-7 text-[11px] shrink-0" onClick={addProject} disabled={adding || !newName.trim()}>
            {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
            Add
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-[11px]"
          />
        </div>

        {/* Scrollable list — bounded so a long list scrolls inside the modal */}
        <div className="overflow-y-auto px-2 py-2" style={{ maxHeight: 360 }}>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-[11px] text-muted-foreground">No projects</div>
          ) : (
            filtered.map((p) => {
              const on = selected.includes(p.name);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.name)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-foreground hover:bg-muted transition-colors text-left"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                    {on ? <Check size={11} /> : null}
                  </span>
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="px-4 py-2 border-t border-border">
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onChange([])} disabled={selected.length === 0}>
            Clear selection
          </Button>
          <Button size="sm" className="h-7 text-[11px]" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
