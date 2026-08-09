"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "./image-cropper.client";
import { uploadImage, previewUrl } from "./upload";

// One image config field: shows the current image (if any) and an Upload/Replace + Clear pair.
// Picking a file opens the cropper; the cropped JPEG is uploaded to object storage and the
// SHELL-relative URL is stored back via onChange. Used for logo, OG, illustrations, author photo.

export function ImageField({
  label,
  value,
  crop,
  onChange,
}: {
  label: string;
  value: string | null;
  crop?: "square" | "horizontal";
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("image.jpg");
  const [busy, setBusy] = useState(false);
  const preview = previewUrl(value);

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
      const { shellUrl } = await uploadImage(pendingName, blob, cropMode);
      onChange(shellUrl);
      toast.success(`${label} updated`);
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
          <img src={preview} alt={label} className="size-full object-contain" />
        ) : (
          <span className="text-[9px] text-muted-foreground">none</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button variant="outline" size="xs" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
        {value ? "Replace" : "Upload"}
      </Button>
      {value && (
        <Button variant="ghost" size="xs" onClick={() => onChange(null)} disabled={busy}>
          <Trash2 size={11} />Clear
        </Button>
      )}
      {cropSrc && <ImageCropper src={cropSrc} force={crop} onDone={onCropped} onCancel={() => setCropSrc(null)} />}
    </div>
  );
}
