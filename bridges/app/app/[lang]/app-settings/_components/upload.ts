import { getRuntimeUrls } from "@/lib/runtime-urls";

// Upload helpers for Site Settings. Images go to the Data/Media service (same path the Media
// Library uses); we store the SHELL-relative URL (/api/media/{id}/file) in the config so the
// Shell renders them through its own proxy. The media id is recoverable from that URL for
// later preview, so we keep the config small (just the URL).

export type Uploaded = { id: string; shellUrl: string };

function mediaBase(): string {
  return getRuntimeUrls().mediaUrl;
}

export function shellUrlToId(url: string | null | undefined): string | null {
  const m = (url ?? "").match(/\/api\/media\/([^/]+)\/file/);
  return m ? m[1] : null;
}

// Preview URL for the admin (different origin than the Shell) — hit the media service directly.
export function previewUrl(shellUrl: string | null | undefined): string | null {
  const id = shellUrlToId(shellUrl);
  return id ? `${mediaBase()}/media/${id}/file` : null;
}

export async function uploadImage(name: string, blob: Blob, cropMode?: string): Promise<Uploaded> {
  const fd = new FormData();
  fd.append("file", new File([blob], name, { type: "image/jpeg" }));
  fd.append("name", name);
  if (cropMode) fd.append("crop_mode", cropMode);
  const res = await fetch(`${mediaBase()}/media/upload`, { method: "POST", body: fd, credentials: "include" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Upload failed");
  return { id: data.item.id, shellUrl: `/api/media/${data.item.id}/file` };
}

export type IconSet = { id: string; files: Record<string, string> };

export async function generateIcons(mediaId: string): Promise<IconSet> {
  const res = await fetch(`${mediaBase()}/media/generate-icons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_id: mediaId }),
    credentials: "include",
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "Icon generation failed");
  return { id: data.id, files: data.files };
}
