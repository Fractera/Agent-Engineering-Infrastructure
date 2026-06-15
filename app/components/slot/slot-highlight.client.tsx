'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { useHighlightFineTune } from '@/providers/highlight-fine-tune-provider.client';
import { useIsArchitect } from '@/lib/hooks/use-is-architect';
import { useSlotActions } from '@/components/slot/slot-actions-context.client';
import { useSlotRoutes } from '@/components/slot/slot-routes-context.client';
import { useFractalHover } from '@/components/fractal/fine-tune-chain/fractal-hover-context.client';

interface SlotHighlightProps {
  slotName: string;
  children: ReactNode;
}

export function SlotHighlight({ slotName, children }: SlotHighlightProps) {
  const isArchitect = useIsArchitect();
  const { actionsNode, chatNode, setIsHovered: setContextHovered } = useSlotActions();
  const { fineTuneActive, hasFineTunePlugin } = useHighlightFineTune();
  const { activeId, setActive } = useFractalHover();
  const { defaultPageUrl, activePagePath, isDefaultPageNull } = useSlotRoutes();
  const activePath = activePagePath ?? defaultPageUrl;

  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [isSlotHovered, setIsSlotHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => setContainerHeight(containerRef.current?.offsetHeight ?? 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const NO_HIGHLIGHT_SLOTS = ['header', 'footer'];
  const showHandle = fineTuneActive && isArchitect && hasFineTunePlugin && !isDefaultPageNull && !NO_HIGHLIGHT_SLOTS.includes(slotName);

  const slotId = `slot:${slotName}`;
  const isActive = activeId === slotId;

  useEffect(() => {
    if (!showHandle) return;
    const onMove = () => {
      const hovered = (containerRef.current?.matches(':hover') ?? false) || (handleRef.current?.matches(':hover') ?? false);
      setIsSlotHovered(hovered);
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [showHandle]);

  useEffect(() => {
    setContextHovered(isSlotHovered);
    if (!isSlotHovered) { setIsHandleHovered(false); }
  }, [isSlotHovered, setContextHovered]);

  return (
    <div
      ref={containerRef}
      data-slot-id={slotName}
      className={`relative w-full h-full overflow-visible${showHandle ? ' mb-[24px]' : ''}`}
      onMouseEnter={() => setActive(slotId, slotId)}
      onMouseLeave={() => setActive(null, null)}
    >
      {showHandle && isHandleHovered && (
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(219,234,254,0.4)', zIndex: 11 }} />
      )}

      {children}

      {showHandle && (
        <div
          ref={handleRef}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
          className="absolute left-0 right-0 h-[26px] flex items-center bg-blue-400 border-t-2 border-muted-foreground/30 transition-opacity duration-150"
          style={{ bottom: '-26px', zIndex: 13, opacity: isSlotHovered ? 1 : 0.5 }}
        >
          <div className="flex items-center shrink-0 pl-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {actionsNode}
          </div>
          <span className="flex-1 text-center text-[9px] leading-none text-gray-600 pointer-events-none select-none truncate px-2">
            @{slotName}{activePath} — {containerHeight}px
          </span>
        </div>
      )}

      {showHandle && chatNode && (
        <div className="absolute left-0 right-0" style={{ bottom: 0, zIndex: 14 }}>
          {chatNode}
        </div>
      )}
    </div>
  );
}
