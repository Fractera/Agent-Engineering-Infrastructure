'use client';

import React, { useRef, useState, useEffect, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Check, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { saveCarouselTrackHeight } from '@features/brand-book/save-carousel-track-height';
import { updateFractal } from '@features/fractal/update-fractal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCodeGenerator } from '@/providers/code-generator-provider.client';

export function CarouselShell({ fractalId, metaDepthKey, ftSuffix, shellClasses, overlayClasses, contentClasses, metaClasses, widgetClasses, childrenClasses, overlayAttrs, contentAttrs, metaAttrs, widgetAttrs, textBlock, mediaBlock, childFractals, childCount, autoPlay, slotKey, depth, carouselItemType, carouselChildLayout }: {
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
  mediaBlock: React.ReactNode;
  childFractals?: React.ReactNode;
  childCount?: number;
  autoPlay?: boolean;
  slotKey: string;
  depth: number;
  carouselItemType: string;
  carouselChildLayout?: string | null;
}) {
  const { codeGeneratorOpen } = useCodeGenerator();
  const [isPending, startTransition] = useTransition();

  const currentHeight = (() => {
    const match = widgetClasses?.match(/h-\[(\d+)px\]/);
    return match ? parseInt(match[1]) : 400;
  })();
  const [heightInput, setHeightInput] = useState(String(currentHeight));
  const [optimisticHeight, setOptimisticHeight] = useState(currentHeight);
  const isDirty = heightInput !== String(optimisticHeight);

  const handleHeightSave = () => {
    const val = parseInt(heightInput);
    if (!val || val < 100 || val > 2000) return;
    setOptimisticHeight(val);
    startTransition(async () => {
      const result = await saveCarouselTrackHeight(slotKey, depth, val);
      if (result.success) {
        toast.success('Track height saved');
      } else {
        toast.error('Failed to save');
        setOptimisticHeight(currentHeight);
        setHeightInput(String(currentHeight));
      }
    });
  };

  const [itemType, setItemType] = useState(carouselItemType);
  const [isTypeLocked, setIsTypeLocked] = useState(false);
  const ITEM_TYPES = ['square', 'vertical', 'horizontal'] as const;
  const ITEM_TYPE_LABELS: Record<string, string> = { square: 'Square', vertical: 'Vertical', horizontal: 'Horizontal' };

  const handleItemTypeChange = (type: string) => {
    if (isTypeLocked) return;
    setItemType(type);
    setIsTypeLocked(true);
    startTransition(async () => {
      await updateFractal({ id: fractalId, slotName: slotKey, carouselItemType: type as 'square' | 'vertical' | 'horizontal' });
      toast.success('Card type saved');
    });
    setTimeout(() => setIsTypeLocked(false), 5000);
  };
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleN, setVisibleN] = useState(1);
  const [cardWidth, setCardWidth] = useState(0);
  const [dynamicGap, setDynamicGap] = useState(12);
  const [total, setTotal] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const measure = () => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !inner.firstElementChild) return;
    const trackW = outer.clientWidth;
    const cw = (inner.firstElementChild as HTMLElement).offsetWidth;
    if (cw === 0) return;
    const n = Math.max(1, Math.floor(trackW / cw));
    const g = (trackW - n * cw) / (n + 1);
    const t = inner.children.length;
    setTotal(t);
    setVisibleN(n);
    setCardWidth(cw);
    setDynamicGap(g);
    setCurrentIndex(prev => Math.min(prev, Math.max(0, t - n)));
  };

  useEffect(() => {
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPlaying || codeGeneratorOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev >= total - visibleN ? 0 : prev + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, codeGeneratorOpen, total, visibleN]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < total - visibleN;

  const scrollByCard = (direction: 1 | -1) => {
    setCurrentIndex(prev => Math.max(0, Math.min(prev + direction, total - visibleN)));
  };

  const offset = currentIndex * (cardWidth + dynamicGap);
  const dotsCount = Math.max(0, total - visibleN + 1);

  const metaHeader = (
    <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col gap-3 mb-3 shrink-0', metaClasses)}>
      <div className="w-full">{textBlock}</div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => scrollByCard(-1)} disabled={!canPrev} aria-label="Previous">
          <ChevronLeft size={16} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => scrollByCard(1)} disabled={!canNext} aria-label="Next">
          <ChevronRight size={16} />
        </Button>
        {codeGeneratorOpen && (
          <div className="flex items-center gap-2 ml-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={100}
                max={2000}
                value={heightInput}
                onChange={e => setHeightInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleHeightSave()}
                disabled={isPending}
                className="w-16 h-8 text-sm text-center border rounded-md bg-background px-1 disabled:opacity-50"
                title="Track height (px)"
              />
              <span className="text-xs text-muted-foreground">px</span>
              {isDirty && (
                <Button size="sm" onClick={handleHeightSave} disabled={isPending}>
                  <Check size={14} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-0.5 border rounded-md overflow-hidden">
              {ITEM_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => handleItemTypeChange(type)}
                  disabled={isTypeLocked}
                  title={type}
                  className={cn('h-8 px-2 text-sm transition-colors relative', itemType === type ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted', isTypeLocked && itemType === type && 'opacity-70')}
                >
                  {isTypeLocked && itemType === type
                    ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : ITEM_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const ITEM_ASPECT: Record<string, string> = {
    square: '1 / 1',
    vertical: '2 / 3',
    horizontal: '16 / 9',
  };
  const aspectRatio = ITEM_ASPECT[itemType] ?? '1 / 1';
  const cardHeightPx = optimisticHeight;
  const cardWidthPx = (() => {
    const [w, h] = aspectRatio.split('/').map(s => parseFloat(s.trim()));
    return Math.round(cardHeightPx * (w / h));
  })();

  const singleSkeletonCard = (key: string) => {
    const isBelow = carouselChildLayout === 'carousel-item-image-below';
    return isBelow ? (
      <div
        key={key}
        className="shrink-0 overflow-hidden rounded-lg flex flex-col bg-muted/30 border border-border/40"
        style={{ width: `${cardWidthPx}px`, height: `${cardHeightPx}px` }}
      >
        <div className="px-3 pt-3 shrink-0">
          <div className="h-[14px] w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 mx-3 my-2 rounded bg-muted animate-pulse" />
        <div className="flex flex-col gap-1 px-3 pb-3 shrink-0">
          <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
        </div>
      </div>
    ) : (
      <div
        key={key}
        className="shrink-0 overflow-hidden rounded-lg flex flex-col bg-muted/30 border border-border/40"
        style={{ width: `${cardWidthPx}px`, height: `${cardHeightPx}px` }}
      >
        <div className="flex flex-col gap-2 p-3 shrink-0">
          <div className="h-[14px] w-16 rounded bg-muted animate-pulse" />
          <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 mx-3 mb-3 rounded bg-muted animate-pulse" />
      </div>
    );
  };

  const skeletonCards = [0, 1, 2, 3].map(i => singleSkeletonCard(`sk-${i}`));

  const wrappedChildren = childFractals
    ? [
        ...(React.Children.map(childFractals, (child, i) => (
          <div
            key={i}
            className="shrink-0 overflow-hidden"
            style={{ width: `${cardWidthPx}px`, height: `${cardHeightPx}px` }}
          >
            {child}
          </div>
        )) ?? []),
        ...(codeGeneratorOpen ? [singleSkeletonCard('cg-extra')] : []),
      ]
    : skeletonCards;

  const track = (
    <div
      {...widgetAttrs}
      ref={outerRef}
      className="fractal-shell-widget overflow-hidden"
      style={{ height: `${cardHeightPx}px` }}
    >
      <div
        ref={innerRef}
        className="flex h-full"
        style={{
          gap: `${dynamicGap}px`,
          paddingLeft: `${dynamicGap}px`,
          paddingRight: `${dynamicGap}px`,
          transform: `translateX(-${offset}px)`,
          transition: 'transform 600ms cubic-bezier(0.37, 0, 0.63, 1)',
        }}
      >
        {wrappedChildren}
      </div>
    </div>
  );

  const dots = dotsCount > 1 ? (
    <div className="flex justify-center gap-1.5 mt-3 shrink-0">
      {Array.from({ length: dotsCount }).map((_, i) => (
        <button
          key={i}
          onClick={() => setCurrentIndex(i)}
          aria-label={`Go to slide ${i + 1}`}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            i === currentIndex ? 'bg-foreground' : 'bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  ) : null;

  const innerContent = <>{metaHeader}{track}{dots}</>;

  const withOverlay = overlayClasses
    ? <div {...overlayAttrs} className={cn('fractal-shell-overlay flex flex-col h-full', overlayClasses)}>{innerContent}</div>
    : innerContent;

  const withContent = contentClasses
    ? <div {...contentAttrs} className={cn('fractal-shell-content flex flex-col h-full', contentClasses)}>{withOverlay}</div>
    : withOverlay;

  return (
    <div data-ft-id={`${fractalId}-Shell-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-shell`} className={cn('fractal-shell fractal-shell--carousel relative @container flex flex-col h-full', shellClasses)}>
      {withContent}
    </div>
  );
}
