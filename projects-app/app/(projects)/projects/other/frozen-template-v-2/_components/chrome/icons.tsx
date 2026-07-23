// ИКОНКИ ШАПКИ — inline SVG, без внешних библиотек (закон 0 запрещает lucide-react и любой импорт наружу).
// Формы повторяют lucide (образец v1): Menu, Sparkles, GripVertical, Pencil, Copy, Trash2, X.
type IconProps = { className?: string };

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4z" />
    </svg>
  );
}

export function HamburgerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function GripVerticalIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Молоток и кривая — иконки двух режимов строительства на холсте. Формы повторяют lucide Hammer и
// Spline: те же иконки стоят на этих кнопках в канвасе v1, и владелец узнаёт кнопки по виду.
export function HammerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M15 12l-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9" />
      <path d="M17.6 6.4l-4.2 4.2" />
      <path d="M12.8 2.8l8.4 8.4-2.4 2.4-8.4-8.4z" />
    </svg>
  );
}

export function SplineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <path d="M5 17A12 12 0 0 1 17 5" />
    </svg>
  );
}

// Глаз и перечёркнутый глаз — «показать узел» и «скрыть узел» в ящике справа.
export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M10.7 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

// Стрелки влево-вправо — перелистывание месяца в календаре; «i» в круге — пояснение владельцу.
// Формы повторяют lucide ChevronLeft / ChevronRight / Info, стоявшие на этих же местах в v1.
export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12" y2="8" />
    </svg>
  );
}
