import type { DepthContainerStyles } from '@/config/ui/initial-app-config';

export type TemplateMediaMode = 'required' | 'none';

export type TemplateHiddenContainer = 'overlay' | 'media_container' | 'content' | 'meta' | 'children' | 'widget';

export type ShellLayoutEntry = {
  value: string;
  label: string;
  group: string;
  shortLabel: string;
};

export type TemplateStructureNode = {
  role: string;
  children?: Record<string, TemplateStructureNode | null> | null;
} | null;

export type TemplateDefault = {
  // UI metadata for carousel selector (was in shell-layouts.config.ts)
  label: string;
  group: string;
  shortLabel: string;
  // Behaviour flags used by Brand Book UI
  mediaMode: TemplateMediaMode;
  hiddenContainers: TemplateHiddenContainer[];
  hideBackground: boolean;
  // AI-readable description of intended use
  description: string;
  // DOM nesting structure — lets AI visualise layout without reading fractal-shell.tsx
  structure: Record<string, TemplateStructureNode | null>;
  // Default Tailwind wrapper classes
  wrappers: Required<DepthContainerStyles>;
};

export const TEMPLATE_REGISTRY: Record<string, TemplateDefault> = {

  // ── Vertical ───────────────────────────────────────────────────────────────

  'content': {
    label:      'Content — vertical, no media',
    group:      'Vertical',
    shortLabel: 'Content',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container'],
    hideBackground:   true,
    description: 'Vertical stack: meta texts above, widget below. No media. Universal template for articles, CTAs, forms, lists, FAQ.',
    structure: {
      shell: {
        role: 'desktop: @container full-width outer wrapper; mobile: same',
        children: {
          content: {
            role: 'desktop: flex-col gap-6 px-6 py-12 — wraps meta + widget vertically; mobile: same',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — wraps media_container + text; mobile: same',
                children: {
                  media_container: { role: 'desktop: inline img/video with mediaClasses if metaMediaUrl set; mobile: same', children: null },
                  text:            { role: 'desktop: flex-col gap-2 — label, title (primary/accent/third spans), description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: w-full widget slot below meta; mobile: same', children: null },
            },
          },
          children: { role: 'desktop: grid @md:grid-cols-2 @lg:grid-cols-3 gap-6 of nested fractals; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full',
      overlayClasses:  '',
      contentClasses:  'relative z-10 flex flex-col gap-6 px-6 py-10',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    '',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  // ── Split ──────────────────────────────────────────────────────────────────

  'split-media-right': {
    label:      'Split — content left, media right',
    group:      'Split',
    shortLabel: 'Split →',
    mediaMode:        'required',
    hiddenContainers: ['overlay'],
    hideBackground:   false,
    description: 'Two-column grid: text content left, media right. Collapses to single column on mobile via Container Query.',
    structure: {
      shell: {
        role: 'desktop: @container grid grid-cols-2 — left: content with meta, right: media_container; mobile: grid-cols-1 single column',
        children: {
          content: {
            role: 'desktop: left column flex-col gap-6 px-6 py-12; mobile: full width',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — text block + inline media below text; mobile: same',
                children: {
                  text:            { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                  media_container: { role: 'desktop: inline img/video rendered after text via renderInlineMedia(); mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: w-full widget below meta; mobile: same', children: null },
            },
          },
          children: { role: 'desktop: @md:col-span-2 grid @md:grid-cols-2 gap-6; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative grid grid-cols-1 @md:grid-cols-2 overflow-hidden rounded-xl border border-border/60',
      overlayClasses:  '',
      contentClasses:  'flex flex-col gap-5 px-6 py-10',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    'relative overflow-hidden min-h-64 bg-muted',
      childrenClasses: '@md:col-span-2 flex flex-col gap-3',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  'split-media-left': {
    label:      'Split — media left, content right',
    group:      'Split',
    shortLabel: 'Split ←',
    mediaMode:        'required',
    hiddenContainers: ['overlay'],
    hideBackground:   false,
    description: 'Two-column grid: media left, text content right. Collapses to single column on mobile via Container Query.',
    structure: {
      shell: {
        role: 'desktop: @container grid grid-cols-2 — left: media_container, right: content with meta; mobile: grid-cols-1 single column',
        children: {
          content: {
            role: 'desktop: right column flex-col gap-6 px-6 py-12; mobile: full width',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — inline media first (above text), then text block; mobile: same',
                children: {
                  media_container: { role: 'desktop: inline img/video rendered before text via renderInlineMedia(); mobile: same', children: null },
                  text:            { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: w-full widget below meta; mobile: same', children: null },
            },
          },
          children: { role: 'desktop: @md:col-span-2 grid @md:grid-cols-2 gap-6; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative grid grid-cols-1 @md:grid-cols-2 overflow-hidden rounded-xl border border-border/60',
      overlayClasses:  '',
      contentClasses:  'flex flex-col gap-5 px-6 py-10',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    'relative overflow-hidden min-h-64 bg-muted',
      childrenClasses: '@md:col-span-2 flex flex-col gap-3',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  // ── Hero ───────────────────────────────────────────────────────────────────

  'media-hero': {
    label:      'Hero — media background, content over',
    group:      'Hero',
    shortLabel: 'Hero',
    mediaMode:        'required',
    hiddenContainers: [],
    hideBackground:   false,
    description: 'Full-shell media background with overlay dimming and text/widget on top. Z-index: media(0) → overlay(10) → content(20). Ideal for landing heroes and banners.',
    structure: {
      shell: {
        role: 'desktop: relative @container overflow-hidden min-h-[320px] @md:min-h-[480px]; mobile: min-h-[320px]',
        children: {
          content: {
            role: 'desktop: relative z-20 flex-col gap-4 px-6 py-12; mobile: same',
            children: {
              media_container: { role: 'desktop: absolute inset-0 z-0 — img/video fills entire shell behind content; mobile: same', children: null },
              overlay:         { role: 'desktop: absolute inset-0 z-10 bg-black/40 — dimming layer between media and text; mobile: same', children: null },
              meta: {
                role: 'desktop: flex-col gap-3 — text only (no inline media), rendered inside overlay at z-20; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: w-full widget below meta at z-20; mobile: same', children: null },
            },
          },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6 below shell; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative overflow-hidden rounded-xl min-h-[360px] @md:min-h-[500px]',
      overlayClasses:  'absolute inset-0 z-10 bg-black/50',
      contentClasses:  'relative z-20 flex flex-col gap-5 px-8 py-14',
      metaClasses:     'flex flex-col gap-4 max-w-2xl',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    'absolute inset-0 z-0',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  'hero-content-bg': {
    label:      'Hero Content BG — media inside content section',
    group:      'Hero',
    shortLabel: 'Hero C',
    mediaMode:        'required',
    hiddenContainers: [],
    hideBackground:   false,
    description: 'Media bg scoped to content section only. Shell is plain; content has relative overflow-hidden with absolute media, overlay, meta and widget inside.',
    structure: {
      shell: {
        role: 'desktop: @container full-width outer wrapper; mobile: same',
        children: {
          content: {
            role: 'desktop: relative overflow-hidden min-h-[320px] @md:min-h-[480px] flex-col — contains media bg + overlay + meta + widget; mobile: min-h-[320px]',
            children: {
              media_container: { role: 'desktop: absolute inset-0 z-0 — img/video fills content area; mobile: same', children: null },
              overlay:         { role: 'desktop: absolute inset-0 z-10 bg-black/40 — dimming layer; mobile: same', children: null },
              meta: {
                role: 'desktop: relative z-20 flex-col gap-3 px-6 py-12 — text only above widget; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: relative z-20 w-full px-6 pb-6 widget below meta; mobile: same', children: null },
            },
          },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6 below content; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full',
      overlayClasses:  'absolute inset-0 z-10 bg-black/50',
      contentClasses:  'relative overflow-hidden rounded-xl min-h-[360px] @md:min-h-[480px] flex flex-col',
      metaClasses:     'relative z-20 flex flex-col gap-4 px-8 py-14 max-w-2xl',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    'absolute inset-0 z-0',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   'relative z-20 w-full px-8 pb-8',
      widgetAnimation: '',
    },
  },

  'hero-meta-bg': {
    label:      'Hero Meta BG — media inside meta only',
    group:      'Hero',
    shortLabel: 'Hero M',
    mediaMode:        'required',
    hiddenContainers: ['content'],
    hideBackground:   false,
    description: 'Media bg scoped to meta section only. Content wrapper is skipped. Meta has overflow-hidden with absolute media and overlay; widget lives outside meta in shell.',
    structure: {
      shell: {
        role: 'desktop: @container relative w-full flex-col; mobile: same',
        children: {
          meta: {
            role: 'desktop: relative overflow-hidden min-h-[240px] @md:min-h-[360px] — contains media bg + overlay + text at z-20; mobile: min-h-[240px]',
            children: {
              media_container: { role: 'desktop: absolute inset-0 z-0 — img/video fills meta area only; mobile: same', children: null },
              overlay:         { role: 'desktop: absolute inset-0 z-10 bg-black/40 — dimming layer; mobile: same', children: null },
              text:            { role: 'desktop: relative z-20 flex-col gap-2 px-6 py-12 — label, title, description, link; mobile: same', children: null },
            },
          },
          widget:   { role: 'desktop: w-full px-6 py-6 widget outside meta in shell; mobile: same', children: null },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full flex flex-col',
      overlayClasses:  'absolute inset-0 z-10 bg-black/50',
      contentClasses:  '',
      metaClasses:     'relative overflow-hidden rounded-xl min-h-[260px] @md:min-h-[360px]',
      textClasses:     'relative z-20 flex flex-col gap-3 px-8 py-12 max-w-2xl',
      mediaClasses:    'absolute inset-0 z-0',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   'w-full px-6 py-6',
      widgetAnimation: '',
    },
  },

  // ── Card ───────────────────────────────────────────────────────────────────

  'card-media': {
    label:      'Card — media + meta side by side in content',
    group:      'Card',
    shortLabel: 'Card',
    mediaMode:        'required',
    hiddenContainers: ['overlay'],
    hideBackground:   false,
    description: 'Horizontal card: meta text and media side by side inside content row. Plugin below. Stacks to column on mobile.',
    structure: {
      shell: {
        role: 'desktop: @container flex-col; mobile: same',
        children: {
          content: {
            role: 'desktop: flex-row — meta left (flex-1), media_container right (flex-1); mobile: @container flex-col single column',
            children: {
              meta: {
                role: 'desktop: flex-1 flex-col gap-3 px-6 py-12 — text only; mobile: full width',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              media_container: { role: 'desktop: flex-1 relative overflow-hidden min-h-[240px] — img/video fills right column; mobile: full width min-h-[240px]', children: null },
            },
          },
          widget:   { role: 'desktop: w-full px-6 py-6 below content row; mobile: same', children: null },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'flex flex-col rounded-xl overflow-hidden border border-border/60',
      overlayClasses:  '',
      contentClasses:  'flex flex-col @md:flex-row',
      metaClasses:     'flex-1 flex flex-col gap-4 px-6 py-10',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    'relative overflow-hidden flex-1 min-h-[220px] bg-muted',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   'w-full px-6 py-6',
      widgetAnimation: '',
    },
  },

  'card-widget-bg': {
    label:      'Card Widget BG — widget + meta with media bg',
    group:      'Card',
    shortLabel: 'Card P',
    mediaMode:        'required',
    hiddenContainers: [],
    hideBackground:   false,
    description: 'Card with media bg behind meta section; widget occupies opposite half of the content row. Stacks on mobile.',
    structure: {
      shell: {
        role: 'desktop: @container flex-col; mobile: same',
        children: {
          content: {
            role: 'desktop: flex-row — meta left (flex-1 with media bg), widget right (flex-1); mobile: @container flex-col single column',
            children: {
              meta: {
                role: 'desktop: flex-1 relative overflow-hidden min-h-[240px] — contains media bg + overlay + text at z-20; mobile: full width',
                children: {
                  media_container: { role: 'desktop: absolute inset-0 z-0 — img/video fills meta column; mobile: same', children: null },
                  overlay:         { role: 'desktop: absolute inset-0 z-10 bg-black/40 — dimming layer; mobile: same', children: null },
                  text:            { role: 'desktop: relative z-20 flex-col gap-2 px-6 py-12 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: flex-1 w-full px-6 py-6 widget column right of meta; mobile: full width', children: null },
            },
          },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'flex flex-col rounded-xl overflow-hidden border border-border/60',
      overlayClasses:  'absolute inset-0 z-10 bg-black/50',
      contentClasses:  'flex flex-col @md:flex-row',
      metaClasses:     'relative overflow-hidden flex-1 min-h-[220px]',
      textClasses:     'relative z-20 flex flex-col gap-3 px-6 py-10',
      mediaClasses:    'absolute inset-0 z-0',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   'flex-1 w-full px-6 py-6',
      widgetAnimation: '',
    },
  },

  // ── Timeline ───────────────────────────────────────────────────────────────

  'timeline-left': {
    label:      'Timeline Left — content left, no media',
    group:      'Timeline',
    shortLabel: 'TL ←',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container'],
    hideBackground:   true,
    description: 'Timeline entry: content in left 50% with border-right as vertical line. pb-64px extends the border to connect with the next fractal below. Mobile: full width, border-left.',
    structure: {
      shell: {
        role: 'desktop: @container w-full overflow-visible; mobile: same',
        children: {
          content: {
            role: 'desktop: w-1/2 flex-col gap-4 px-6 py-12 pb-16 border-r-[8px] border-current — left column with right border as timeline line, pb-16 extends line to next fractal; mobile: @sm w-full border-r-0 border-l-[8px]',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — wraps text block; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: w-full widget below meta; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full overflow-visible',
      overlayClasses:  '',
      contentClasses:  'relative w-1/2 flex flex-col gap-5 px-8 py-12 pb-16 border-r-[6px] border-current @sm:w-full @sm:border-r-0 @sm:border-l-[6px]',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    '',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  'timeline-right': {
    label:      'Timeline Right — content right, no media',
    group:      'Timeline',
    shortLabel: 'TL →',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container'],
    hideBackground:   true,
    description: 'Timeline entry: content in right 50% with border-left as vertical line. pb-64px extends the border to connect with the next fractal below. Mobile: full width, border-left.',
    structure: {
      shell: {
        role: 'desktop: @container w-full overflow-visible flex justify-end — pushes content to right half; mobile: no justify-end',
        children: {
          content: {
            role: 'desktop: w-1/2 flex-col gap-4 px-6 py-12 pb-16 border-l-[8px] border-current — right column with left border as timeline line; mobile: @sm w-full border-l-[8px]',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — wraps text block; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: w-full widget below meta; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full overflow-visible flex justify-end',
      overlayClasses:  '',
      contentClasses:  'relative w-1/2 flex flex-col gap-5 px-8 py-12 pb-16 border-l-[6px] border-current @sm:w-full @sm:border-l-[6px]',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    '',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  'timeline-left-media': {
    label:      'Timeline Left Media — content left, media below',
    group:      'Timeline',
    shortLabel: 'TLM ←',
    mediaMode:        'required',
    hiddenContainers: ['overlay'],
    hideBackground:   true,
    description: 'Timeline entry left with inline media below meta texts inside the content column. Mobile: full width, border-left.',
    structure: {
      shell: {
        role: 'desktop: @container w-full overflow-visible; mobile: same',
        children: {
          content: {
            role: 'desktop: w-1/2 flex-col gap-4 px-6 py-12 pb-16 border-r-[8px] border-current; mobile: @sm w-full border-r-0 border-l-[8px]',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — text only (metaBlockTextOnly, no inline media inside); mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              media_container: { role: 'desktop: w-full overflow-hidden rounded-md — img/video rendered after meta via renderInlineMedia(); mobile: same', children: null },
              widget:          { role: 'desktop: w-full widget below media_container; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full overflow-visible',
      overlayClasses:  '',
      contentClasses:  'relative w-1/2 flex flex-col gap-5 px-8 py-12 pb-16 border-r-[6px] border-current @sm:w-full @sm:border-r-0 @sm:border-l-[6px]',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    'w-full overflow-hidden rounded-xl',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  'timeline-right-media': {
    label:      'Timeline Right Media — content right, media below',
    group:      'Timeline',
    shortLabel: 'TLM →',
    mediaMode:        'required',
    hiddenContainers: ['overlay'],
    hideBackground:   true,
    description: 'Timeline entry right with inline media below meta texts inside the content column. Mobile: full width, border-left.',
    structure: {
      shell: {
        role: 'desktop: @container w-full overflow-visible flex justify-end; mobile: no justify-end',
        children: {
          content: {
            role: 'desktop: w-1/2 flex-col gap-4 px-6 py-12 pb-16 border-l-[8px] border-current; mobile: @sm w-full border-l-[8px]',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — text only (metaBlockTextOnly); mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              media_container: { role: 'desktop: w-full overflow-hidden rounded-md — img/video after meta; mobile: same', children: null },
              widget:          { role: 'desktop: w-full widget below media_container; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full overflow-visible flex justify-end',
      overlayClasses:  '',
      contentClasses:  'relative w-1/2 flex flex-col gap-5 px-8 py-12 pb-16 border-l-[6px] border-current @sm:w-full @sm:border-l-[6px]',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    'w-full overflow-hidden rounded-xl',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  'timeline-left-bg': {
    label:      'Timeline Left BG — content left, media as bg',
    group:      'Timeline',
    shortLabel: 'TLB ←',
    mediaMode:        'required',
    hiddenContainers: [],
    hideBackground:   false,
    description: 'Timeline entry left with full-shell media background. Content column is 50% at z-20; media and overlay are absolute behind everything. Mobile: full width, border-left.',
    structure: {
      shell: {
        role: 'desktop: @container relative w-full overflow-visible; mobile: same',
        children: {
          media_container: { role: 'desktop: absolute inset-0 z-0 — img/video fills entire shell behind content; mobile: same', children: null },
          overlay:         { role: 'desktop: absolute inset-0 z-10 bg-black/40 — dimming layer; mobile: same', children: null },
          content: {
            role: 'desktop: relative z-20 w-1/2 flex-col gap-4 px-6 py-12 pb-16 border-r-[8px] border-current — left column over bg; mobile: @sm w-full border-r-0 border-l-[8px]',
            children: {
              meta: {
                role: 'desktop: flex-col gap-3 — text only; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: relative z-20 w-full widget below meta; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full overflow-visible',
      overlayClasses:  'absolute inset-0 z-10 bg-black/60',
      contentClasses:  'relative z-20 w-1/2 flex flex-col gap-5 px-8 py-12 pb-16 border-r-[6px] border-current @sm:w-full @sm:border-r-0 @sm:border-l-[6px]',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    'absolute inset-0 z-0',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'relative z-20 w-full',
      widgetAnimation: '',
    },
  },

  'timeline-right-bg': {
    label:      'Timeline Right BG — content right, media as bg',
    group:      'Timeline',
    shortLabel: 'TLB →',
    mediaMode:        'required',
    hiddenContainers: [],
    hideBackground:   false,
    description: 'Timeline entry right with full-shell media background. Content column is 50% at z-20; media and overlay are absolute behind everything. Mobile: full width, border-left.',
    structure: {
      shell: {
        role: 'desktop: @container relative w-full overflow-visible flex justify-end; mobile: no justify-end',
        children: {
          media_container: { role: 'desktop: absolute inset-0 z-0 — img/video fills entire shell; mobile: same', children: null },
          overlay:         { role: 'desktop: absolute inset-0 z-10 bg-black/40 — dimming layer; mobile: same', children: null },
          content: {
            role: 'desktop: relative z-20 w-1/2 flex-col gap-4 px-6 py-12 pb-16 border-l-[8px] border-current — right column over bg; mobile: @sm w-full border-l-[8px]',
            children: {
              meta: {
                role: 'desktop: flex-col gap-3 — text only; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
              widget: { role: 'desktop: relative z-20 w-full widget below meta; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full overflow-visible flex justify-end',
      overlayClasses:  'absolute inset-0 z-10 bg-black/60',
      contentClasses:  'relative z-20 w-1/2 flex flex-col gap-5 px-8 py-12 pb-16 border-l-[6px] border-current @sm:w-full @sm:border-l-[6px]',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-3',
      mediaClasses:    'absolute inset-0 z-0',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'relative z-20 w-full',
      widgetAnimation: '',
    },
  },

  // ── Grid ───────────────────────────────────────────────────────────────────

  'grid': {
    label:      'Grid — adaptive masonry-style child grid',
    group:      'Grid',
    shortLabel: 'Grid',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container', 'children'],
    hideBackground:   false,
    description: 'Header meta (label + title + description + link) above an adaptive flex-wrap grid of child fractals. Grid column count and gap are configurable per-fractal. Orphan last item is auto-hidden when it would sit alone in a row.',
    structure: {
      shell: {
        role: 'desktop: @container full-width outer wrapper; mobile: same',
        children: {
          content: {
            role: 'desktop: optional flex-col wrapper with contentClasses; mobile: same',
            children: {
              meta: {
                role: 'desktop: flex-col — text block (label, title, description, link) + inline media below; mobile: same',
                children: {
                  text:            { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                  media_container: { role: 'desktop: inline img/video below text if metaMediaUrl set; mobile: same', children: null },
                },
              },
              widget: {
                role: 'desktop: adaptive flex-wrap grid — child fractals as flex items with calculated flex-basis; orphan last item auto-hidden on desktop when alone in row; mobile: single column stack',
                children: {
                  child_fractals: { role: 'desktop: each child fractal fills one grid cell; mobile: full width', children: null },
                },
              },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full',
      overlayClasses:  '',
      contentClasses:  'flex flex-col gap-8 px-6 py-10',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    'w-full object-cover rounded-xl',
      childrenClasses: 'gap-5',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  // ── Carousel ───────────────────────────────────────────────────────────────

  'carousel': {
    label:      'Carousel — horizontal scroll of child fractals',
    group:      'Carousel',
    shortLabel: 'Carousel',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container', 'children'],
    hideBackground:   false,
    description: 'Header row with optional square media thumbnail (150×150) on the left, meta texts in center, prev/next buttons on the right. Below: horizontal scroll track of child fractals with smooth translateX animation, dots navigation, and optional autoPlay (3s interval). Track height is fixed at min-h-[450px].',
    structure: {
      shell: {
        role: 'desktop: relative @container flex-col full-height; mobile: same',
        children: {
          content: {
            role: 'desktop: optional flex-col full-height wrapper with contentClasses; mobile: same',
            children: {
              meta: {
                role: 'desktop: flex-row — media thumbnail (150×150 shrink-0) left + text (flex-1) center + prev/next buttons (shrink-0) right; mobile: same layout',
                children: {
                  media_container: { role: 'desktop: 150×150 square thumbnail img/video object-cover shrink-0; mobile: same', children: null },
                  text:            { role: 'desktop: flex-1 min-w-0 — label, title, description, link; mobile: same', children: null },
                  nav_buttons:     { role: 'desktop: prev/next arrow buttons shrink-0 self-end; disabled at boundary; mobile: same', children: null },
                },
              },
              widget: {
                role: 'desktop: flex-1 overflow-hidden min-h-[450px] — horizontal scroll track; child fractals translated via CSS translateX; visible count calculated from container width; mobile: single card visible',
                children: {
                  child_fractals: { role: 'desktop: fixed-width cards in flex row; translateX drives scroll; mobile: same but only 1 visible', children: null },
                },
              },
              dots: { role: 'desktop: dot indicators below track, count = total − visible + 1; hidden when ≤1 dot; mobile: same', children: null },
            },
          },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full',
      overlayClasses:  '',
      contentClasses:  'flex flex-col gap-6 px-6 py-10',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    '',
      childrenClasses: '',
      widgetClasses:   'w-full h-[400px]',
      widgetAnimation: '',
    },
  },

  // ── Accordion ──────────────────────────────────────────────────────────────

  'accordion': {
    label:      'Accordion — single collapsible item',
    group:      'Accordion',
    shortLabel: 'Accord.',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container', 'widget'],
    hideBackground:   true,
    description: 'Single accordion row: title is always visible as the trigger, description is revealed on open. One fractal = one accordion item. Compose multiple fractals to build a full FAQ section.',
    structure: {
      shell: {
        role: 'desktop: @container w-full; mobile: same',
        children: {
          content: {
            role: 'desktop: flex-col — wraps meta; mobile: same',
            children: {
              meta: {
                role: 'desktop: flex-col — text block with title (accordion trigger) and description (accordion panel); mobile: same',
                children: {
                  text: { role: 'desktop: title = trigger label always visible; description = collapsible panel content; mobile: same', children: null },
                },
              },
            },
          },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'border rounded-md overflow-hidden w-full',
      overlayClasses:  '',
      contentClasses:  'px-4',
      metaClasses:     'flex flex-col gap-2',
      textClasses:     '',
      mediaClasses:    '',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

  // ── Null Plugin ────────────────────────────────────────────────────────────

  'null-widget': {
    label:      'Null Plugin — content only, widget suppressed',
    group:      'Plugin',
    shortLabel: 'No Plugin',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container', 'widget'],
    hideBackground:   true,
    description: 'Vertical stack: meta texts above, children below. Widget zone renders null. Use when a fractal needs the content template but must suppress the widget (e.g. FAQ root with accordion children).',
    structure: {
      shell: {
        role: 'desktop: @container full-width outer wrapper; mobile: same',
        children: {
          content: {
            role: 'desktop: flex-col gap-6 px-6 py-10 — wraps meta only; mobile: same',
            children: {
              meta: {
                role: 'desktop: flex-col gap-4 — wraps text; mobile: same',
                children: {
                  text: { role: 'desktop: flex-col gap-2 — label, title, description, link; mobile: same', children: null },
                },
              },
            },
          },
          children: { role: 'desktop: flex flex-col gap-2 of nested fractals; mobile: same', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full',
      overlayClasses:  '',
      contentClasses:  'relative z-10 flex flex-col gap-6 px-6 py-10',
      metaClasses:     'flex flex-col gap-4',
      textClasses:     'flex flex-col gap-2',
      mediaClasses:    '',
      childrenClasses: 'flex flex-col gap-3',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

  // ── Plugin ─────────────────────────────────────────────────────────────────

  'widget-only': {
    label:      'Widget Only — shell with widget and children',
    group:      'Widget',
    shortLabel: 'Widget',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container', 'content', 'meta'],
    hideBackground:   true,
    description: 'Shell contains only widget and children. No meta, no media, no overlay. Ideal for pure widget components that render their own UI.',
    structure: {
      shell: {
        role: 'desktop: relative w-full flex-col; mobile: same',
        children: {
          widget:   { role: 'desktop: w-full full-width widget slot — no meta, no media; mobile: same', children: null },
          children: { role: 'desktop: grid @md:grid-cols-2 gap-6 of nested fractals; mobile: single column', children: null },
        },
      },
    },
    wrappers: {
      shellClasses:    'relative w-full flex flex-col',
      overlayClasses:  '',
      contentClasses:  '',
      metaClasses:     '',
      textClasses:     '',
      mediaClasses:    '',
      childrenClasses: 'flex flex-col gap-2',
      widgetClasses:   'w-full',
      widgetAnimation: '',
    },
  },

  // ── Carousel Item ──────────────────────────────────────────────────────────

  'carousel-item-content': {
    label:      'Carousel Card — text only',
    group:      'Carousel',
    shortLabel: 'Card Text',
    mediaMode:        'none',
    hiddenContainers: ['overlay', 'media_container', 'widget', 'children'],
    hideBackground:   false,
    description: 'Carousel card with label, title and description. No media. Content is strictly clamped to one line each to fit inside carousel item boundaries.',
    structure: {
      shell: { role: 'h-full w-full flex flex-col overflow-hidden', children: {
        meta: { role: 'flex flex-col gap-2 p-3 shrink-0 — label + title + desc', children: null },
      }},
    },
    wrappers: {
      shellClasses:    'h-full w-full flex flex-col overflow-hidden',
      overlayClasses:  '',
      contentClasses:  'flex flex-col h-full',
      metaClasses:     'flex flex-col gap-2 p-3 shrink-0',
      textClasses:     'flex flex-col gap-1',
      mediaClasses:    '',
      childrenClasses: '',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

  'carousel-item-image': {
    label:      'Carousel Card — text + image',
    group:      'Carousel',
    shortLabel: 'Card Img',
    mediaMode:        'required',
    hiddenContainers: ['overlay', 'widget', 'children'],
    hideBackground:   false,
    description: 'Carousel card with label, title, description at top and image filling the remaining height. Text is clamped to one line each.',
    structure: {
      shell: { role: 'h-full w-full flex flex-col overflow-hidden', children: {
        meta: { role: 'flex flex-col gap-2 p-3 shrink-0 — label + title + desc', children: null },
        media: { role: 'flex-1 mx-3 mb-3 object-cover overflow-hidden rounded', children: null },
      }},
    },
    wrappers: {
      shellClasses:    'h-full w-full flex flex-col overflow-hidden',
      overlayClasses:  '',
      contentClasses:  'flex flex-col h-full',
      metaClasses:     'flex flex-col gap-2 p-3 shrink-0',
      textClasses:     'flex flex-col gap-1',
      mediaClasses:    'flex-1 mx-3 mb-3 overflow-hidden rounded',
      childrenClasses: '',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

  'carousel-item-image-below': {
    label:      'Carousel Card — label + image + text',
    group:      'Carousel',
    shortLabel: 'Card Img↓',
    mediaMode:        'required',
    hiddenContainers: ['overlay', 'widget', 'children'],
    hideBackground:   false,
    description: 'Carousel card: label at top, image in the middle (fills remaining height), title and description at the bottom.',
    structure: {
      shell: { role: 'h-full w-full flex flex-col overflow-hidden', children: {
        label: { role: 'p-3 pb-0 shrink-0', children: null },
        media: { role: 'flex-1 mx-3 my-2 overflow-hidden rounded', children: null },
        text:  { role: 'p-3 pt-0 shrink-0 — title + desc', children: null },
      }},
    },
    wrappers: {
      shellClasses:    'h-full w-full flex flex-col overflow-hidden',
      overlayClasses:  '',
      contentClasses:  'flex flex-col h-full',
      metaClasses:     '',
      textClasses:     'flex flex-col gap-1',
      mediaClasses:    'flex-1 mx-3 my-2 overflow-hidden rounded',
      childrenClasses: '',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

  'carousel-item-image-below-2': {
    label:      'Carousel Card — label + image + text (v2)',
    group:      'Carousel',
    shortLabel: 'Card Img↓2',
    mediaMode:        'required',
    hiddenContainers: ['overlay', 'widget', 'children'],
    hideBackground:   false,
    description: 'Carousel card: label at top, image in the middle (fills remaining height), title and description at the bottom. Variant 2.',
    structure: {
      shell: { role: 'h-full w-full flex flex-col overflow-hidden', children: {
        label: { role: 'p-3 pb-0 shrink-0', children: null },
        media: { role: 'flex-1 mx-3 my-2 overflow-hidden rounded', children: null },
        text:  { role: 'p-3 pt-0 shrink-0 — title + desc', children: null },
      }},
    },
    wrappers: {
      shellClasses:    'h-full w-full flex flex-col overflow-hidden',
      overlayClasses:  '',
      contentClasses:  'flex flex-col h-full',
      metaClasses:     '',
      textClasses:     'flex flex-col gap-1',
      mediaClasses:    'flex-1 mx-3 my-2 overflow-hidden rounded',
      childrenClasses: '',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

  'carousel-item-video': {
    label:      'Carousel Card — text + video',
    group:      'Carousel',
    shortLabel: 'Card Vid',
    mediaMode:        'required',
    hiddenContainers: ['overlay', 'widget', 'children'],
    hideBackground:   false,
    description: 'Carousel card with label, title, description at top and autoplay video filling the remaining height. Text is clamped to one line each.',
    structure: {
      shell: { role: 'h-full w-full flex flex-col overflow-hidden', children: {
        meta: { role: 'flex flex-col gap-2 p-3 shrink-0 — label + title + desc', children: null },
        media: { role: 'flex-1 mx-3 mb-3 object-cover overflow-hidden rounded', children: null },
      }},
    },
    wrappers: {
      shellClasses:    'h-full w-full flex flex-col overflow-hidden',
      overlayClasses:  '',
      contentClasses:  'flex flex-col h-full',
      metaClasses:     'flex flex-col gap-2 p-3 shrink-0',
      textClasses:     'flex flex-col gap-1',
      mediaClasses:    'flex-1 mx-3 mb-3 overflow-hidden rounded',
      childrenClasses: '',
      widgetClasses:   '',
      widgetAnimation: '',
    },
  },

};

// ─── Derived SHELL_LAYOUTS — replaces shell-layouts.config.ts ─────────────────
// Consumers that previously imported from shell-layouts.config.ts
// should now import from this file.
export const SHELL_LAYOUTS: readonly ShellLayoutEntry[] = Object.entries(TEMPLATE_REGISTRY).map(
  ([value, t]) => ({ value, label: t.label, group: t.group, shortLabel: t.shortLabel })
);

/**
 * Returns template defaults. Falls back to 'content' if template not found.
 */
export function getTemplateDefaults(templateType: string): TemplateDefault {
  return TEMPLATE_REGISTRY[templateType] ?? TEMPLATE_REGISTRY['content'];
}
