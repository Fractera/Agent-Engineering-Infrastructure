'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const GAP_CLASSES: Record<string, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const GAP_PX: Record<string, number> = { none: 0, sm: 8, md: 16, lg: 24 };

const GRID_MIN_SIZE: Record<number, string> = {
  1: '100%',
  2: '400px',
  3: '280px',
  4: '220px',
  5: '180px',
  6: '150px',
};

export function GridShell({ fractalId, metaDepthKey, ftSuffix, shellClasses, overlayClasses, contentClasses, metaClasses, widgetClasses, childrenClasses, overlayAttrs, contentAttrs, metaAttrs, widgetAttrs, textBlock, renderInlineMedia, childFractals, gridColumns, gridGap }: {
  fractalId: string;
  metaDepthKey: string;
  ftSuffix: string;
  shellClasses?: string;
  overlayClasses?: string;
  contentClasses?: string;
  metaClasses?: string;
  widgetClasses?: string;
  childrenClasses?: string;
  overlayAttrs?: Record<string, string>;
  contentAttrs?: Record<string, string>;
  metaAttrs?: Record<string, string>;
  widgetAttrs?: Record<string, string>;
  textBlock: React.ReactNode;
  renderInlineMedia: () => React.ReactNode;
  childFractals?: React.ReactNode;
  gridColumns: number | null;
  gridGap: string;
}) {
  const gapClass = GAP_CLASSES[gridGap] ?? GAP_CLASSES.md;
  const gapPx = GAP_PX[gridGap] ?? 16;
  const cols = gridColumns;
  const minSize = cols ? (GRID_MIN_SIZE[cols] ?? '280px') : '280px';
  const flexBasis = cols
    ? `calc((100% - ${(cols - 1) * gapPx}px) / ${cols})`
    : minSize;

  const gridRef = useRef<HTMLDivElement>(null);
  const [hideOrphan, setHideOrphan] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const check = () => {
      const total = el.children.length;
      if (total <= 1 || window.innerWidth < 768) {
        setHideOrphan(false);
        return;
      }
      let firstTop: number | null = null;
      let perRow = 0;
      for (let i = 0; i < total; i++) {
        const child = el.children[i] as HTMLElement;
        if (!child.offsetHeight) continue;
        const top = child.getBoundingClientRect().top;
        if (firstTop === null) firstTop = top;
        if (Math.abs(top - firstTop) < 2) perRow++;
        else break;
      }
      if (perRow <= 1) { setHideOrphan(false); return; }
      setHideOrphan(total % perRow === 1);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => { ro.disconnect(); window.removeEventListener('resize', check); };
  }, []);

  const shellAttrs = { 'data-ft-id': `${fractalId}-Shell-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-shell` };

  const gridBlock = (
    <div
      ref={gridRef}
      className={cn('fractal-adaptive-grid flex flex-wrap min-h-[240px]', hideOrphan && 'fractal-grid-hide-orphan', gapClass, childrenClasses)}
      style={{ '--grid-basis': flexBasis, '--grid-min': minSize } as React.CSSProperties}
    >
      {childFractals}
    </div>
  );

  const gridMetaBlock = (
    <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col', metaClasses)}>
      {textBlock}
      {renderInlineMedia()}
    </div>
  );
  const gridWidgetBlock = (
    <div {...widgetAttrs} className={cn('fractal-shell-widget flex flex-col', widgetClasses)}>
      {gridBlock}
    </div>
  );
  const innerContent = <>{gridMetaBlock}{gridWidgetBlock}</>;

  const withOverlay = overlayClasses
    ? <div {...overlayAttrs} className={cn('fractal-shell-overlay', overlayClasses)}>{innerContent}</div>
    : innerContent;

  const withContent = contentClasses
    ? <div {...contentAttrs} className={cn('fractal-shell-content', contentClasses)}>{withOverlay}</div>
    : withOverlay;

  return (
    <div {...shellAttrs} className={cn('fractal-shell fractal-shell--grid @container', shellClasses)}>
      {withContent}
    </div>
  );
}
