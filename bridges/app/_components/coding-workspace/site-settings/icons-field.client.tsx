"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRuntimeUrls } from "@/lib/runtime-urls";
import { ImageCropper } from "./image-cropper.client";
import { uploadImage, generateIcons, type IconSet } from "./upload";

// The PWA/favicon field: upload ONE square logo, crop to 1:1, and the Data service generates
// the full icon set (favicon.ico, 16/32, apple-touch, 192/512, og, manifest). We store the
// returned { id, files } in config.iconSet; the Shell builds icon URLs from it.

function faviconPreview(set: IconSet | null): string | null {
  if (!set) return null;
  const rel = set.files?.icon_192 ?? set.files?.favicon_32 ?? set.files?.favicon_ico;
  if (!rel) return null;
  const file = rel.split("/").pop() ?? rel;
  return `${getRuntimeUrls().mediaUrl}/media/icons/${set.id}/file/${file}`;
}

export function IconsField({
  value,
  onChange,
}: {
  value: IconSet | null;
  onChange: (set: IconSet | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("logo.jpg");
  const [busy, setBusy] = useState(false);
  const preview = faviconPreview(value);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPendingName(file.name);
      setCropSrc(URL.createObjectURL(file));
    }
    e.target.value = "";
  }

  async function onCropped(blob: Blob, cropMode: string) {
    setCropSrc(null);
    setBusy(true);
    try {
      const { id } = await uploadImage(pendingName, blob, cropMode);
      const set = await generateIcons(id);
      onChange(set);
      toast.success("Icon set generated");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="size-12 shrink-0 rounded border border-border bg-muted/40 overflow-hidden flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="App icon" className="size-full object-contain" />
        ) : (
          <span className="text-[9px] text-muted-foreground">none</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button variant="outline" size="xs" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
        {value ? "Replace logo" : "Upload square logo"}
      </Button>
      {value && (
        <Button variant="ghost" size="xs" onClick={() => onChange(null)} disabled={busy}>
          <Trash2 size={11} />Clear
        </Button>
      )}
      {cropSrc && <ImageCropper src={cropSrc} force="square" onDone={onCropped} onCancel={() => setCropSrc(null)} />}
    </div>
  );
}
