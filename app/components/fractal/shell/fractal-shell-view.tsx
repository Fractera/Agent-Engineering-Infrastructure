import React from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import type { FractalEntry, SlotShellConfig, SlotMetaStyles, ShellLayout, MetaStyleEntry, DepthContainerStyles, TitleWordStyle, TitleMetaStyleEntry } from '@/config/ui/initial-app-config';
import { isTitleEntry } from '@/config/ui/initial-app-config';
import { META_STYLE_DEFAULTS } from '@/config/ui/layout-presets';
import { toBrandBookKey } from '@/lib/utils/slot-key-mapping';
import { mergeTemplateStyles } from '@/lib/utils/merge-template-styles';
import { cn } from '@/lib/utils';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { GridShell } from '../fine-tune-chain/fractal-shell-grid.client';
import { CarouselShell } from '../fine-tune-chain/fractal-shell-carousel.client';

function renderTitleWords(
  text: string,
  wordStyles: TitleWordStyle[] | null | undefined,
  titleStyle: TitleMetaStyleEntry,
): React.ReactNode {
  if (!wordStyles || wordStyles.length === 0) return text;

  const primaryAnimation = titleStyle.primary.animation;
  const accentAnimation = titleStyle.accent.animation;
  const thirdAnimation = titleStyle.third.animation;

  const styleMap = new Map(wordStyles.map(ws => [ws.word, ws.style]));
  const words = text.trim().split(/\s+/);

  return words.reduce<React.ReactNode[]>((acc, word, i) => {
    const style = styleMap.get(word);
    const isLast = i === words.length - 1;

    let node: React.ReactNode;
    if (style === 'accent') {
      node = (
        <span
          key={i}
          className={cn(titleStyle.accent.classes, accentAnimation ?? '')}
          style={titleStyle.accent.font ? { fontFamily: titleStyle.accent.font } : undefined}
        >
          {word}
        </span>
      );
    } else if (style === 'third') {
      node = (
        <span
          key={i}
          className={cn(titleStyle.third.classes, thirdAnimation ?? '')}
          style={titleStyle.third.font ? { fontFamily: titleStyle.third.font } : undefined}
        >
          {word}
        </span>
      );
    } else {
      if (primaryAnimation) {
        node = (
          <span
            key={i}
            className={cn(titleStyle.primary.classes, primaryAnimation)}
            style={titleStyle.primary.font ? { fontFamily: titleStyle.primary.font } : undefined}
          >
            {word}
          </span>
        );
      } else {
        node = <React.Fragment key={i}>{word}</React.Fragment>;
      }
    }

    acc.push(node);
    if (!isLast) acc.push(' ');
    return acc;
  }, []);
}

function getStyleClasses(style: MetaStyleEntry): string {
  return isTitleEntry(style) ? style.primary.classes : style.classes;
}
function getStyleFont(style: MetaStyleEntry): string {
  return isTitleEntry(style) ? style.primary.font : style.font;
}

type ShellContainerStyles = {
  shellLayout?: string;
  shellClasses?: string;
  overlayClasses?: string;
  contentClasses?: string;
  metaClasses?: string;
  widgetClasses?: string;
  textClasses?: string;
  mediaClasses?: string;
  childrenClasses?: string;
};

type FractalShellProps = {
  fractal: FractalEntry;
  shellConfig?: SlotShellConfig;
  metaStyles?: SlotMetaStyles;
  containerStyles?: ShellContainerStyles;
  slotKey: string;
  depth: number;
  isRenderOnlyIntoWidget?: boolean;
  children: React.ReactNode;
  childFractals?: React.ReactNode;
  isCarouselItem?: boolean;
  isCarouselChild?: boolean;
  isGridItem?: boolean;
  gridColumns?: number | null;
  gridGap?: 'none' | 'sm' | 'md' | 'lg' | null;
  carouselChildLayout?: string | null;
  debugMode?: boolean;
  debugHighlight?: string | null;
};

const DEPTH_KEYS = ['depth0', 'depth1', 'depth2', 'depth3', 'depth4', 'depth5'] as const;

function getLayout(shellConfig: SlotShellConfig | undefined, containerStyles: ShellContainerStyles | undefined, depth: number): ShellLayout {
  if (containerStyles?.shellLayout) return containerStyles.shellLayout as ShellLayout;
  if (!shellConfig) return 'content';
  const key = DEPTH_KEYS[Math.min(depth, 5)];
  return shellConfig.shellLayouts[key] ?? 'content';
}

export function getStyle(metaStyles: SlotMetaStyles | undefined, slotKey: string, depth: number, element: 'title' | 'description' | 'media' | 'label' | 'link', customMetaStyles?: SlotMetaStyles | null) {
  const key = `${toBrandBookKey(slotKey)}-depth${Math.min(depth, 5)}-${element}`;
  const base = metaStyles?.[key] ?? META_STYLE_DEFAULTS[key] ?? { tag: 'p', classes: '', font: '', animation: '' };
  const custom = customMetaStyles?.[key];
  if (!custom) return base;
  if (isTitleEntry(custom) && isTitleEntry(base)) {
    return {
      ...base,
      ...custom,
      primary: { classes: custom.primary.classes || base.primary.classes, font: custom.primary.font || base.primary.font, animation: custom.primary.animation || base.primary.animation },
      accent:  { classes: custom.accent.classes  || base.accent.classes,  font: custom.accent.font  || base.accent.font,  animation: custom.accent.animation  || base.accent.animation  },
      third:   { classes: custom.third?.classes  || base.third?.classes  || '', font: custom.third?.font  || base.third?.font  || '', animation: custom.third?.animation  || base.third?.animation  || '' },
    } as MetaStyleEntry;
  }
  return { ...base, ...custom } as MetaStyleEntry;
}

export function FractalShellView({ fractal, shellConfig, metaStyles, containerStyles, slotKey, depth, isRenderOnlyIntoWidget, children, childFractals, isCarouselItem, isCarouselChild, isGridItem, gridColumns, gridGap, carouselChildLayout, debugMode, debugHighlight }: FractalShellProps) {
  const titleFallback = fractal.metaTitleFallback ?? null;
  const descFallback  = fractal.metaDescriptionFallback ?? null;
  const labelFallback = fractal.metaLabelFallback ?? null;
  const displayTitle  = fractal.metaTitle ?? null;
  const displayDesc   = fractal.metaDescription ?? null;
  const displayLabel  = fractal.metaLabel ?? null;
  const displayLinkText = fractal.metaLinkText ?? null;
  const displayLinkHref = fractal.metaLinkHref ?? null;
  const linkTextFallback = fractal.metaLinkTextFallback ?? null;
  const linkHrefFallback = fractal.metaLinkHrefFallback ?? null;

  const titleNeedsTranslation = !displayTitle && !!titleFallback;
  const descNeedsTranslation  = !displayDesc && !!descFallback;

  const renderedTitle = displayTitle ?? titleFallback ?? null;
  const renderedDesc  = displayDesc ?? descFallback ?? null;
  const renderedLabel = displayLabel ?? labelFallback ?? null;
  const renderedLinkText = displayLinkText ?? linkTextFallback ?? null;
  const renderedLinkHref = displayLinkHref ?? linkHrefFallback ?? null;
  const hasLink = !!(renderedLinkText && renderedLinkHref);
  const hasMeta = !!(renderedTitle || renderedDesc || renderedLabel || fractal.metaMediaUrl || hasLink);

  // Merge custom styles from fractal into shellConfig and metaStyles
  const customShellConfig = fractal.customShellConfig ?? undefined;
  const customMetaStyles = fractal.customMetaStyles ?? undefined;
  const mergedShellConfig: SlotShellConfig | undefined = shellConfig
    ? {
        shellLayouts: customShellConfig
          ? { ...shellConfig.shellLayouts, ...customShellConfig.shellLayouts }
          : shellConfig.shellLayouts,
        depthStyles: customShellConfig?.depthStyles || shellConfig.depthStyles
          ? Object.fromEntries(
              DEPTH_KEYS.map(dk => [
                dk,
                { ...(shellConfig.depthStyles?.[dk] ?? {}), ...(customShellConfig?.depthStyles?.[dk] ?? {}) },
              ])
            )
          : undefined,
      }
    : customShellConfig;

  // Resolve container styles: template defaults → depthStyles → explicit containerStyles
  const depthKey = DEPTH_KEYS[Math.min(depth, 5)];
  const metaDepthKey = `${toBrandBookKey(slotKey)}-depth${Math.min(depth, 5)}`;
  const depthStylesFromConfig: DepthContainerStyles | undefined = mergedShellConfig?.depthStyles?.[depthKey];
  const templateLayout = getLayout(mergedShellConfig, containerStyles, depth);
  // Если layout задан индивидуально через containerStyles — не применять глобальные depthStyles из brand_book_fractal,
  // кроме widget_classes (там хранится высота карусели)
  const hasIndividualLayout = !!containerStyles?.shellLayout;
  const effectiveDepthStyles = hasIndividualLayout
    ? (depthStylesFromConfig?.widgetClasses ? { widgetClasses: depthStylesFromConfig.widgetClasses } : undefined)
    : depthStylesFromConfig;
  const templateMerged = mergeTemplateStyles(templateLayout, effectiveDepthStyles);
  const resolvedContainerStyles: ShellContainerStyles = {
    ...templateMerged,
    ...containerStyles,
  };

  const layout = templateLayout;

  const ftSuffix = `Fractal-${layout}-${depth}`;
  const dbg = (name: string) => {
    if (!debugMode) return {};
    if (debugHighlight !== name) return {};
    return { 'data-debug-label': name } as Record<string, string>;
  };
  const shellAttrs = { 'data-ft-id': `${fractal.id}-Shell-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-shell`, ...dbg('shell') };
  const overlayAttrs = { 'data-ft-id': `${fractal.id}-Overlay-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-overlay`, ...dbg('overlay') };
  const contentAttrs = { 'data-ft-id': `${fractal.id}-Content-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-content`, ...dbg('content') };
  const textAttrs = { 'data-ft-id': `${fractal.id}-MetaTexts-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-text`, ...dbg('meta_texts') };
  const mediaAttrs = { 'data-ft-id': `${fractal.id}-Media-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-media_container`, ...dbg('media') };
  const metaAttrs = { 'data-ft-id': `${fractal.id}-Meta-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-meta`, ...dbg('meta') };
  const widgetAttrs = { 'data-ft-id': `${fractal.id}-Widget-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-widget`, ...dbg('widget') };
  const childrenAttrs = { 'data-ft-id': `${fractal.id}-Children-${ftSuffix}`, 'data-ft-meta': `${metaDepthKey}-children`, ...dbg('children') };

  const childrenBlock = childFractals
    ? <div {...childrenAttrs} className={cn('fractal-shell-children flex flex-col', resolvedContainerStyles.childrenClasses)}>{childFractals}</div>
    : null;

  if ((!hasMeta || isRenderOnlyIntoWidget) && layout !== 'grid' && layout !== 'carousel') {
    return (
      <>
        {children}
        {childrenBlock}
      </>
    );
  }
  const titleStyle = getStyle(metaStyles, slotKey, depth, 'title', customMetaStyles);
  const descStyle  = getStyle(metaStyles, slotKey, depth, 'description', customMetaStyles);
  const mediaStyle = getStyle(metaStyles, slotKey, depth, 'media', customMetaStyles);
  const labelStyle = getStyle(metaStyles, slotKey, depth, 'label', customMetaStyles);
  const linkStyle  = getStyle(metaStyles, slotKey, depth, 'link', customMetaStyles);

  const TitleTag = titleStyle.tag as React.ElementType;
  const DescTag  = descStyle.tag as React.ElementType;
  const LabelTag = labelStyle.tag as React.ElementType;

  const titleProps = {
    'data-ft-id': `${fractal.id}-Title-${ftSuffix}`,
    'data-ft-meta': `${metaDepthKey}-title`,
    className: getStyleClasses(titleStyle),
    ...(getStyleFont(titleStyle) ? { style: { fontFamily: getStyleFont(titleStyle) } } : {}),
    ...dbg('title'),
  };
  const descProps = {
    'data-ft-id': `${fractal.id}-Description-${ftSuffix}`,
    'data-ft-meta': `${metaDepthKey}-description`,
    className: cn(getStyleClasses(descStyle), isCarouselItem && 'line-clamp-1'),
    ...(getStyleFont(descStyle) ? { style: { fontFamily: getStyleFont(descStyle) } } : {}),
    ...dbg('description'),
  };
  const labelProps = {
    'data-ft-id': `${fractal.id}-Label-${ftSuffix}`,
    'data-ft-meta': `${metaDepthKey}-label`,
    className: getStyleClasses(labelStyle),
    ...(getStyleFont(labelStyle) ? { style: { fontFamily: getStyleFont(labelStyle) } } : {}),
    ...dbg('label'),
  };
  const linkProps = {
    'data-ft-id': `${fractal.id}-Link-${ftSuffix}`,
    'data-ft-meta': `${metaDepthKey}-link`,
    className: getStyleClasses(linkStyle),
    href: renderedLinkHref ?? '#',
    ...(getStyleFont(linkStyle) ? { style: { fontFamily: getStyleFont(linkStyle) } } : {}),
    ...dbg('link'),
  };
  const mediaClass = getStyleClasses(mediaStyle);

  const translationBadge = (needed: boolean) =>
    needed ? <span className="inline-flex items-center gap-0.5 ml-1 text-xs font-medium text-amber-500"><TriangleAlert className="size-3" /> needs translation</span> : null;

  const isBgLayout = layout.startsWith('bg-');
  const bgStyle = isBgLayout && fractal.metaMediaUrl
    ? { backgroundImage: `url(${fractal.metaMediaUrl})` }
    : undefined;

  const renderInlineMedia = () => {
    if (!fractal.metaMediaUrl || isBgLayout) return null;
    const mediaElement = fractal.metaMediaType === 'video'
      ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} autoPlay muted loop playsInline className={mediaClass} />
      // eslint-disable-next-line @next/next/no-img-element
      : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} alt={renderedTitle ?? ''} className={mediaClass} />;
    return (
      <div {...mediaAttrs} className={cn('fractal-shell-media', resolvedContainerStyles.mediaClasses)}>
        {mediaElement}
      </div>
    );
  };

  const textBlock = (
    <div {...textAttrs} className={cn('fractal-shell-text', resolvedContainerStyles.textClasses)}>
      {renderedLabel && <LabelTag {...labelProps}>{renderedLabel}</LabelTag>}
      {renderedTitle && (() => {
        const titleEl = (
          <TitleTag {...titleProps}>
            {isTitleEntry(titleStyle)
              ? renderTitleWords(renderedTitle, fractal.titleWordStyles, titleStyle)
              : renderedTitle}
            {translationBadge(titleNeedsTranslation)}
          </TitleTag>
        );
        const wc = isTitleEntry(titleStyle) ? titleStyle.wrapperClasses : undefined;
        return wc ? <div className={wc}>{titleEl}</div> : titleEl;
      })()}
      {renderedDesc  && <DescTag  {...descProps}>{renderedDesc}{translationBadge(descNeedsTranslation)}</DescTag>}
      {hasLink && (
        /^https?:\/\//i.test(renderedLinkHref ?? '')
          ? <a {...linkProps} target="_blank" rel="noopener noreferrer">{renderedLinkText}</a>
          : <Link {...linkProps}>{renderedLinkText}</Link>
      )}
    </div>
  );

  const metaBlock = (
    <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col', resolvedContainerStyles.metaClasses)}>
      {renderInlineMedia()}
      {textBlock}
    </div>
  );

  const metaBlockTextOnly = (
    <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col', resolvedContainerStyles.metaClasses)}>
      {textBlock}
    </div>
  );

  const metaBlockMediaFirst = (
    <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col', resolvedContainerStyles.metaClasses)}>
      {renderInlineMedia()}
      {textBlock}
    </div>
  );

  const widgetBlock = isCarouselChild ? null : (
    <div {...widgetAttrs} className={cn('fractal-shell-widget flex flex-col', resolvedContainerStyles.widgetClasses)}>
      {children}
    </div>
  );

  // ── accordion ──────────────────────────────────────────────────────────────
  if (layout === 'accordion') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--accordion w-full', resolvedContainerStyles.shellClasses)}>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={fractal.id} className="border-0">
            <AccordionTrigger className={cn(resolvedContainerStyles.contentClasses)}>
              {renderedTitle && (
                <div {...textAttrs} className={cn('fractal-shell-text flex-1 min-w-0', resolvedContainerStyles.textClasses)}>
                  <TitleTag {...titleProps}>
                    {isTitleEntry(titleStyle)
                      ? renderTitleWords(renderedTitle, fractal.titleWordStyles, titleStyle)
                      : renderedTitle}
                  </TitleTag>
                </div>
              )}
            </AccordionTrigger>
            <AccordionContent className={cn(resolvedContainerStyles.contentClasses)}>
              <div {...metaAttrs} className={cn('fractal-shell-meta', resolvedContainerStyles.metaClasses, resolvedContainerStyles.textClasses)}>
                {renderedDesc && <DescTag {...descProps}>{renderedDesc}</DescTag>}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {childrenBlock}
      </div>
    );
  }

  // ── widget-only ────────────────────────────────────────────────────────────
  if (layout === 'widget-only') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--widget-only', resolvedContainerStyles.shellClasses)}>
        {widgetBlock}
        {childrenBlock}
      </div>
    );
  }

  // ── null-widget ────────────────────────────────────────────────────────────
  if (layout === 'null-widget') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--null-widget @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── carousel-item-* ────────────────────────────────────────────────────────
  if (layout === 'carousel-item-content' || layout === 'carousel-item-image' || layout === 'carousel-item-video') {
    const hasMedia = !!(fractal.metaMediaUrl && (layout === 'carousel-item-image' || layout === 'carousel-item-video'));
    const cardClasses = cn('fractal-shell fractal-shell--carousel-item group/card h-full w-full flex flex-col overflow-hidden border border-border/40 bg-card rounded-lg transition-[border-color,box-shadow] duration-300 hover:border-primary/50 hover:shadow-[0_0_16px_4px_hsl(var(--primary)/0.3)]', resolvedContainerStyles.shellClasses);
    const cardInner = (
      <>
        <div className={cn('flex flex-col gap-1.5 p-3 shrink-0', resolvedContainerStyles.metaClasses)}>
          {renderedLabel && <LabelTag {...labelProps} className="text-[10px] font-medium uppercase tracking-wide leading-none text-primary line-clamp-1">{renderedLabel}</LabelTag>}
          {renderedTitle && <TitleTag {...titleProps} className="text-sm font-semibold leading-snug line-clamp-2">{renderedTitle}</TitleTag>}
          {renderedDesc  && <DescTag  {...descProps}  className="text-[11px] leading-[14px] text-muted-foreground line-clamp-2 text-pretty">{renderedDesc}</DescTag>}
        </div>
        {hasMedia && (
          <div className={cn('flex-1 mx-3 mb-3 overflow-hidden rounded', resolvedContainerStyles.mediaClasses)}>
            {fractal.metaMediaType === 'video'
              ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl!} autoPlay muted loop playsInline className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.06]" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl!} alt={renderedTitle ?? ''} className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.06]" />
            }
          </div>
        )}
      </>
    );
    return renderedLinkHref
      ? <Link {...shellAttrs} href={renderedLinkHref} className={cardClasses}>{cardInner}</Link>
      : <div {...shellAttrs} className={cardClasses}>{cardInner}</div>;
  }

  // ── carousel-item-image-below ──────────────────────────────────────────────
  if (layout === 'carousel-item-image-below') {
    const hasMedia = !!fractal.metaMediaUrl;
    const cardClasses2 = cn('fractal-shell fractal-shell--carousel-item-image-below group/card relative h-full w-full flex flex-col rounded-lg cursor-pointer bg-background overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_20px_4px_hsl(var(--primary)/0.2)]', resolvedContainerStyles.shellClasses);
    const cardInner2 = (
      <>
        {/* Изображение сверху — aspect-video, zoom on hover, label абсолютно */}
        <div className="relative overflow-hidden aspect-video shrink-0">
          {hasMedia && (
            fractal.metaMediaType === 'video'
              ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl!} autoPlay muted loop playsInline className="w-full h-full object-cover object-top transition-transform duration-300 group-hover/card:scale-105" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl!} alt={renderedTitle ?? ''} className="w-full h-full object-cover object-top transition-transform duration-300 group-hover/card:scale-105" />
          )}
          {renderedLabel && (
            <div className="absolute top-2 left-2">
              <LabelTag {...labelProps} className="inline-block text-[10px] font-medium uppercase tracking-wide leading-none text-white bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded line-clamp-1">{renderedLabel}</LabelTag>
            </div>
          )}
        </div>
        {/* Текст снизу */}
        <div className="flex flex-col gap-1 p-4 flex-grow">
          {renderedTitle && <TitleTag {...titleProps} className="text-foreground text-base font-bold leading-snug line-clamp-2">{renderedTitle}</TitleTag>}
          {renderedDesc  && <DescTag  {...descProps}  className="text-[11px] leading-[14px] text-muted-foreground line-clamp-2 text-pretty">{renderedDesc}</DescTag>}
        </div>
        {/* Градиентная рамка — 1px padding-border через псевдофон */}
        <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ padding: '1px', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.5) 26%, hsl(var(--primary)/0.15) 83%, transparent)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
      </>
    );
    return renderedLinkHref
      ? <Link {...shellAttrs} href={renderedLinkHref} className={cardClasses2}>{cardInner2}</Link>
      : <div {...shellAttrs} className={cardClasses2}>{cardInner2}</div>;
  }

  // ── carousel-item-image-below-2 ───────────────────────────────────────────
  if (layout === 'carousel-item-image-below-2') {
    const hasMedia = !!fractal.metaMediaUrl;
    const cardClasses3 = cn('fractal-shell fractal-shell--carousel-item-image-below-2 group/card relative h-full w-full overflow-hidden border border-border/40 bg-card rounded-lg transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/50 hover:shadow-[0_0_16px_4px_hsl(var(--primary)/0.3)]', resolvedContainerStyles.shellClasses);
    const cardInner3 = (
      <>
        {/* Текст: label + title + description — левый верхний угол */}
        <div className="flex flex-col gap-1 px-5 py-4 w-[65%]">
          {renderedLabel && (
            <LabelTag {...labelProps} className="text-[10px] font-medium leading-none uppercase tracking-wide text-primary line-clamp-1">{renderedLabel}</LabelTag>
          )}
          {renderedTitle && (
            <TitleTag {...titleProps} className="text-sm font-semibold leading-snug line-clamp-2">{renderedTitle}</TitleTag>
          )}
          {renderedDesc && (
            <DescTag {...descProps} className="text-[11px] leading-[14px] text-muted-foreground line-clamp-2 text-pretty">{renderedDesc}</DescTag>
          )}
        </div>
        {/* Изображение: абсолютное, правый нижний угол, с наклоном */}
        {hasMedia && (
          fractal.metaMediaType === 'video'
            ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl!} autoPlay muted loop playsInline
                className="absolute top-[45%] right-[-5%] w-[93%] h-[59.5%] rounded-md border border-border/40 object-cover rotate-[-5deg] transition-transform duration-200 ease-out group-hover/card:-rotate-[3deg] group-hover/card:-translate-y-1"
                style={{ boxShadow: 'var(--shadow-small)' }} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl!} alt={renderedTitle ?? ''}
                className="absolute top-[45%] right-[-5%] w-[93%] h-[59.5%] rounded-md border border-border/40 object-cover rotate-[-5deg] transition-transform duration-200 ease-out group-hover/card:-rotate-[3deg] group-hover/card:-translate-y-1"
                style={{ boxShadow: 'var(--shadow-small)' }} />
        )}
      </>
    );
    return renderedLinkHref
      ? <Link {...shellAttrs} href={renderedLinkHref} className={cardClasses3}>{cardInner3}</Link>
      : <div {...shellAttrs} className={cardClasses3}>{cardInner3}</div>;
  }

  // ── content ────────────────────────────────────────────────────────────────
  if (layout === 'content') {
    if (isCarouselItem) {
      const carouselMedia = fractal.metaMediaUrl ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          {fractal.metaMediaType === 'video'
            // eslint-disable-next-line @next/next/no-img-element
            ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} alt={renderedTitle ?? ''} className="w-full h-full object-cover" />
          }
        </div>
      ) : null;
      const carouselMetaBlock = (
        <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col', resolvedContainerStyles.metaClasses)}>
          <div className="shrink-0">{textBlock}</div>
          {carouselMedia}
        </div>
      );
      return (
        <div {...shellAttrs} className={cn('fractal-shell fractal-shell--content @container overflow-hidden h-full', resolvedContainerStyles.shellClasses)}>
          <div {...contentAttrs} className={cn('fractal-shell-content flex flex-col h-full', resolvedContainerStyles.contentClasses)}>
            {carouselMetaBlock}
            <div {...widgetAttrs} className={cn('fractal-shell-widget flex flex-col mt-auto shrink-0', resolvedContainerStyles.widgetClasses)}>{children}</div>
          </div>
          {childrenBlock}
        </div>
      );
    }
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--content @container', isCarouselChild && 'h-full', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', isCarouselChild && 'h-full', resolvedContainerStyles.contentClasses)}>
          {metaBlock}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── media-hero ─────────────────────────────────────────────────────────────
  if (layout === 'media-hero') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--media-hero relative @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {renderInlineMedia()}
          <div {...overlayAttrs} className={cn('fractal-shell-overlay absolute inset-0', resolvedContainerStyles.overlayClasses)}>
            {metaBlockTextOnly}
          </div>
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── hero-content-bg ────────────────────────────────────────────────────────
  if (layout === 'hero-content-bg') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--hero-content-bg @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {renderInlineMedia()}
          <div {...overlayAttrs} className={cn('fractal-shell-overlay absolute inset-0 z-10', resolvedContainerStyles.overlayClasses)} />
          {metaBlockTextOnly}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── hero-meta-bg ───────────────────────────────────────────────────────────
  if (layout === 'hero-meta-bg') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--hero-meta-bg @container', resolvedContainerStyles.shellClasses)}>
        <div {...metaAttrs} className={cn('fractal-shell-meta', resolvedContainerStyles.metaClasses)}>
          {renderInlineMedia()}
          <div {...overlayAttrs} className={cn('fractal-shell-overlay absolute inset-0 z-10', resolvedContainerStyles.overlayClasses)} />
          <div {...textAttrs} className={cn('fractal-shell-text relative z-20', resolvedContainerStyles.textClasses)}>
            {renderedLabel && <LabelTag {...labelProps}>{renderedLabel}</LabelTag>}
            {renderedTitle && (() => {
              const titleEl = (
                <TitleTag {...titleProps}>
                  {isTitleEntry(titleStyle) ? renderTitleWords(renderedTitle, fractal.titleWordStyles, titleStyle) : renderedTitle}
                </TitleTag>
              );
              const wc = isTitleEntry(titleStyle) ? titleStyle.wrapperClasses : undefined;
              return wc ? <div className={wc}>{titleEl}</div> : titleEl;
            })()}
            {renderedDesc && <DescTag {...descProps}>{renderedDesc}</DescTag>}
            {hasLink && (
              /^https?:\/\//i.test(renderedLinkHref ?? '')
                ? <a {...linkProps} target="_blank" rel="noopener noreferrer">{renderedLinkText}</a>
                : <Link {...linkProps}>{renderedLinkText}</Link>
            )}
          </div>
        </div>
        {widgetBlock}
        {childrenBlock}
      </div>
    );
  }

  // ── card-media ─────────────────────────────────────────────────────────────
  if (layout === 'card-media') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--card-media @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col', resolvedContainerStyles.metaClasses)}>
            {textBlock}
          </div>
          <div {...mediaAttrs} className={cn('fractal-shell-media', resolvedContainerStyles.mediaClasses)}>
            {fractal.metaMediaUrl && (
              fractal.metaMediaType === 'video'
                ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} alt={renderedTitle ?? ''} className="w-full h-full object-cover" />
            )}
          </div>
        </div>
        {widgetBlock}
        {childrenBlock}
      </div>
    );
  }

  // ── card-widget-bg ─────────────────────────────────────────────────────────
  if (layout === 'card-widget-bg') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--card-widget-bg @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          <div {...metaAttrs} className={cn('fractal-shell-meta', resolvedContainerStyles.metaClasses)}>
            {renderInlineMedia()}
            <div {...overlayAttrs} className={cn('fractal-shell-overlay absolute inset-0 z-10', resolvedContainerStyles.overlayClasses)} />
            <div {...textAttrs} className={cn('fractal-shell-text relative z-20', resolvedContainerStyles.textClasses)}>
              {renderedLabel && <LabelTag {...labelProps}>{renderedLabel}</LabelTag>}
              {renderedTitle && (() => {
                const titleEl = (
                  <TitleTag {...titleProps}>
                    {isTitleEntry(titleStyle) ? renderTitleWords(renderedTitle, fractal.titleWordStyles, titleStyle) : renderedTitle}
                  </TitleTag>
                );
                const wc = isTitleEntry(titleStyle) ? titleStyle.wrapperClasses : undefined;
                return wc ? <div className={wc}>{titleEl}</div> : titleEl;
              })()}
              {renderedDesc && <DescTag {...descProps}>{renderedDesc}</DescTag>}
              {hasLink && (
                /^https?:\/\//i.test(renderedLinkHref ?? '')
                  ? <a {...linkProps} target="_blank" rel="noopener noreferrer">{renderedLinkText}</a>
                  : <Link {...linkProps}>{renderedLinkText}</Link>
              )}
            </div>
          </div>
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── split-media-right (text left, media right, widget below) ───────────────
  if (layout === 'split-media-right') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--split-media-right @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col fractal-shell-split-row', resolvedContainerStyles.metaClasses)}>
            {textBlock}
            {renderInlineMedia()}
          </div>
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── split-media-left (media left, text right, widget below) ────────────────
  if (layout === 'split-media-left') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--split-media-left @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          <div {...metaAttrs} className={cn('fractal-shell-meta flex flex-col fractal-shell-split-row', resolvedContainerStyles.metaClasses)}>
            {renderInlineMedia()}
            {textBlock}
          </div>
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── timeline-left ──────────────────────────────────────────────────────────
  if (layout === 'timeline-left') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--timeline-left @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlock}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── timeline-right ─────────────────────────────────────────────────────────
  if (layout === 'timeline-right') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--timeline-right @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlock}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── timeline-left-media ────────────────────────────────────────────────────
  if (layout === 'timeline-left-media') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--timeline-left-media @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlockTextOnly}
          {renderInlineMedia()}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── timeline-right-media ───────────────────────────────────────────────────
  if (layout === 'timeline-right-media') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--timeline-right-media @container', resolvedContainerStyles.shellClasses)}>
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlockTextOnly}
          {renderInlineMedia()}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── timeline-left-bg ───────────────────────────────────────────────────────
  if (layout === 'timeline-left-bg') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--timeline-left-bg relative @container', resolvedContainerStyles.shellClasses)}>
        <div {...mediaAttrs} className={cn('fractal-shell-media', resolvedContainerStyles.mediaClasses)}>
          {fractal.metaMediaUrl && (
            fractal.metaMediaType === 'video'
              ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} alt={renderedTitle ?? ''} className="w-full h-full object-cover" />
          )}
        </div>
        <div {...overlayAttrs} className={cn('fractal-shell-overlay absolute inset-0', resolvedContainerStyles.overlayClasses)} />
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlockTextOnly}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── timeline-right-bg ──────────────────────────────────────────────────────
  if (layout === 'timeline-right-bg') {
    return (
      <div {...shellAttrs} className={cn('fractal-shell fractal-shell--timeline-right-bg relative @container', resolvedContainerStyles.shellClasses)}>
        <div {...mediaAttrs} className={cn('fractal-shell-media', resolvedContainerStyles.mediaClasses)}>
          {fractal.metaMediaUrl && (
            fractal.metaMediaType === 'video'
              ? <video data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img data-ft-id={`${fractal.id}-image-${ftSuffix}`} data-ft-meta={`${metaDepthKey}-media`} src={fractal.metaMediaUrl} alt={renderedTitle ?? ''} className="w-full h-full object-cover" />
          )}
        </div>
        <div {...overlayAttrs} className={cn('fractal-shell-overlay absolute inset-0', resolvedContainerStyles.overlayClasses)} />
        <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
          {metaBlockTextOnly}
          {widgetBlock}
        </div>
        {childrenBlock}
      </div>
    );
  }

  // ── grid ──────────────────────────────────────────────────────────────────
  if (layout === 'grid') {
    return <GridShell
      fractalId={fractal.id}
      metaDepthKey={metaDepthKey}
      ftSuffix={ftSuffix}
      shellClasses={resolvedContainerStyles.shellClasses}
      overlayClasses={resolvedContainerStyles.overlayClasses}
      contentClasses={resolvedContainerStyles.contentClasses}
      metaClasses={resolvedContainerStyles.metaClasses}
      widgetClasses={resolvedContainerStyles.widgetClasses}
      childrenClasses={containerStyles?.childrenClasses}
      overlayAttrs={overlayAttrs}
      contentAttrs={contentAttrs}
      metaAttrs={metaAttrs}
      widgetAttrs={widgetAttrs}
      textBlock={textBlock}
      renderInlineMedia={renderInlineMedia}
      childFractals={childFractals}
      gridColumns={gridColumns ?? null}
      gridGap={gridGap ?? 'md'}
    />;
  }

  // ── carousel ───────────────────────────────────────────────────────────────
  if (layout === 'carousel') {
    return <CarouselShell
      fractalId={fractal.id}
      metaDepthKey={metaDepthKey}
      ftSuffix={ftSuffix}
      shellClasses={resolvedContainerStyles.shellClasses}
      overlayClasses={resolvedContainerStyles.overlayClasses}
      contentClasses={resolvedContainerStyles.contentClasses}
      metaClasses={resolvedContainerStyles.metaClasses}
      widgetClasses={resolvedContainerStyles.widgetClasses}
      childrenClasses={containerStyles?.childrenClasses}
      overlayAttrs={overlayAttrs}
      contentAttrs={contentAttrs}
      metaAttrs={metaAttrs}
      widgetAttrs={widgetAttrs}
      textBlock={textBlock}
      mediaBlock={renderInlineMedia()}
      childFractals={childFractals}
      childCount={Array.isArray(childFractals) ? childFractals.length : (childFractals ? 1 : 0)}
      autoPlay={fractal.carouselAutoPlay ?? false}
      slotKey={toBrandBookKey(slotKey)}
      depth={depth}
      carouselItemType={fractal.carouselItemType ?? 'square'}
      carouselChildLayout={carouselChildLayout ?? null}
    />;
  }

  // fallback → content
  return (
    <div {...shellAttrs} className={cn('fractal-shell fractal-shell--content @container', resolvedContainerStyles.shellClasses)}>
      <div {...contentAttrs} className={cn('fractal-shell-content', resolvedContainerStyles.contentClasses)}>
        {metaBlock}
        {widgetBlock}
      </div>
      {childrenBlock}
    </div>
  );
}

