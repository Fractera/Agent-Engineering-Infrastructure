"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, Loader2, Play, Scissors } from "lucide-react";

// Minimal video trimmer (step 500) — keep the middle, cut the head and the tail.
//
// The cut itself is NOT done here. The browser only picks two moments on the
// timeline; the data service runs ffmpeg with `-c copy`, which copies the streams
// instead of re-encoding: instant, lossless, no CPU on the visitor's machine. The
// alternative — a wasm editor in the page — would ship ~30 MB and re-encode locally.
//
// The file is uploaded FIRST and trimmed in place, so the owner trims what is
// really stored and can reopen the trimmer later from the same row.
export function VideoTrimmer({
  mediaUrl,
  itemId,
  name,
  onDone,
  onClose,
}: {
  mediaUrl: string;
  itemId: string;
  name: string;
  onDone: (updated: unknown) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [applying, setApplying] = useState(false);

  const src = `${mediaUrl}/media/${itemId}/file`;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onMeta() {
      const d = v!.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        setStart(0);
        setEnd(d);
      }
    }
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  // Playing the kept part is the only honest preview: the owner sees exactly the
  // middle that will survive, with the same boundaries the server will use.
  function playMiddle() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
    v.play();
    const stop = () => {
      if (v.currentTime >= end) {
        v.pause();
        v.removeEventListener("timeupdate", stop);
      }
    };
    v.addEventListener("timeupdate", stop);
  }

  async function apply() {
    if (end - start < 0.2) {
      toast.error("The kept part is too short");
      return;
    }
    setApplying(true);
    try {
      // Straight to the data service, exactly like every other media operation in
      // this panel (upload / patch / delete): same origin for the cookie, same
      // `credentials: "include"`. Routing this one call through the admin API
      // instead was the odd one out and answered 401 Unauthorized.
      const r = await fetch(`${mediaUrl}/media/${itemId}/trim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
        credentials: "include",
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error ?? "trim failed");
      toast.success(`"${name}" trimmed to ${(end - start).toFixed(1)}s`);
      onDone(d.item);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setApplying(false);
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40" onClick={onClose}>
      <div
        className="bg-background rounded-xl p-4 flex flex-col gap-3 shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
            <Scissors size={13} /> Trim video — keep the middle
          </span>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X size={13} />
          </Button>
        </div>

        <video ref={videoRef} src={src} controls className="w-full rounded-lg bg-black max-h-[46vh]" />

        {duration > 0 ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-10 text-[10px] text-muted-foreground">Start</span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.05}
                  value={start}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStart(Math.min(v, end - 0.2));
                    if (videoRef.current) videoRef.current.currentTime = v;
                  }}
                  className="flex-1"
                />
                <span className="w-16 text-right text-[10px] font-mono text-foreground">{fmt(start)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 text-[10px] text-muted-foreground">End</span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.05}
                  value={end}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setEnd(Math.max(v, start + 0.2));
                    if (videoRef.current) videoRef.current.currentTime = v;
                  }}
                  className="flex-1"
                />
                <span className="w-16 text-right text-[10px] font-mono text-foreground">{fmt(end)}</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Keeping <strong className="text-foreground">{(end - start).toFixed(1)}s</strong> of {duration.toFixed(1)}s.
              The cut is lossless — the streams are copied, not re-encoded.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={playMiddle}>
                <Play size={11} /> Preview the middle
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Keep whole
              </Button>
              <Button size="sm" onClick={apply} disabled={applying}>
                {applying ? <Loader2 size={11} className="animate-spin" /> : <Scissors size={11} />}
                Apply trim
              </Button>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">Reading the video…</p>
        )}
      </div>
    </div>
  );
}
