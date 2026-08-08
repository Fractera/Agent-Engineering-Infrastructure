"use client";

// Действия над файлом (шаг 501, Ф2, партия 4): предпросмотр, монтаж, правка
// подписей, копирование адреса, удаление. Один островок на строку — меньше не
// выйдет: всё это действия, а действия без JS не делаются.
//
// Чтение таблицы при этом остаётся серверным; островок не знает ни про список, ни
// про поиск. После изменения — `router.refresh()`, чтобы строка обновилась из
// одного источника.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Eye, Scissors, Pencil, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PreviewPopup, type PreviewLabels } from "./preview-popup.client";
import { VideoTrimmer, type TrimmerLabels } from "./video-trimmer.client";
import type { MediaItem } from "../_lib/media";

export type ItemActionLabels = {
  actions: string; preview: string; trim: string; edit: string; copyUrl: string; delete: string;
  copied: string; editTitle: string; titleField: string; descriptionField: string;
  cancel: string; save: string; saved: string; failed: string;
  deleteTitle: string; deleteBody: string; deleted: string;
  previewLabels: PreviewLabels;
  trimmerLabels: TrimmerLabels;
};

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export function ItemActions(
  { item, mediaBase, fileUrl, labels }:
  { item: MediaItem; mediaBase: string; fileUrl: string; labels: ItemActionLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const [trim, setTrim] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState(false);

  const isVideo = item.mime_type.startsWith("video/");

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${mediaBase}/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? labels.failed);
      toast.success(labels.saved);
      setEditOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      const res = await fetch(`${mediaBase}/media/${item.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(labels.failed);
      toast.success(fill(labels.deleted, { name: item.name }));
      setConfirmDelete(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setRemoving(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(labels.copied);
    } catch {
      // Вне защищённого контекста браузер отказывает в буфере обмена — говорим
      // об этом, а не делаем вид, что скопировали.
      toast.error(labels.failed);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={labels.actions}>
            <MoreHorizontal size={11} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuItem className="text-[11px]" onClick={() => setPreview(true)}>
            <Eye size={10} />{labels.preview}
          </DropdownMenuItem>
          {isVideo && (
            <DropdownMenuItem className="text-[11px]" onClick={() => setTrim(true)}>
              <Scissors size={10} />{labels.trim}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-[11px]" onClick={() => setEditOpen(true)}>
            <Pencil size={10} />{labels.edit}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[11px]" onClick={copyUrl}>
            {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}{labels.copyUrl}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-[11px] text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={10} />{labels.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {preview && (
        <PreviewPopup item={item} fileUrl={fileUrl} labels={labels.previewLabels} onClose={() => setPreview(false)} />
      )}

      {trim && (
        <VideoTrimmer
          mediaBase={mediaBase}
          itemId={item.id}
          name={item.name}
          serverDuration={item.duration}
          labels={labels.trimmerLabels}
          onClose={() => setTrim(false)}
        />
      )}

      {editOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="flex w-full max-w-xs flex-col gap-3 rounded-xl bg-background p-5 shadow-xl">
            <span className="text-xs font-semibold text-foreground">{labels.editTitle}</span>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">{labels.titleField}</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={item.name} className="font-mono text-[11px]" />
              <span className="truncate font-mono text-[10px] text-muted-foreground/50">{item.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">{labels.descriptionField}</span>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="font-mono text-[11px]" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>{labels.cancel}</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-background p-5 shadow-xl">
            <span className="text-xs font-semibold text-foreground">{labels.deleteTitle}</span>
            <span className="truncate font-mono text-[10px] text-muted-foreground">{item.name}</span>
            <span className="text-[11px] text-muted-foreground">{labels.deleteBody}</span>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>{labels.cancel}</Button>
              <Button variant="destructive" size="sm" onClick={remove} disabled={removing}>
                {removing ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}{labels.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
