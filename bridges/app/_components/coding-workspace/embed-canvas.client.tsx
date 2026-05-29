"use client";

import { useRef } from "react";
import type { ComponentType } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";

type Props = {
  url: string;
  title: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

export function EmbedCanvas({ url, title, Icon }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function handleReload() {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  }

  return (
    <div className="flex flex-col w-full h-full bg-background">
      <div className="shrink-0 flex items-center gap-2 px-3 border-b border-border bg-background" style={{ height: 32 }}>
        <Icon size={12} className="text-primary shrink-0" />
        <span className="text-[11px] text-muted-foreground flex-1 truncate">{title}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[10px] font-medium"
          title="Open in new tab"
        >
          <ExternalLink size={10} />
          New tab
        </a>
        <button
          type="button"
          onClick={handleReload}
          className="shrink-0 flex items-center gap-1 px-2 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[10px] font-medium"
          title="Reload"
        >
          <RefreshCw size={10} />
          Reload
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={url}
        className="flex-1 border-0 w-full"
        style={{ minHeight: 0 }}
        title={title}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
