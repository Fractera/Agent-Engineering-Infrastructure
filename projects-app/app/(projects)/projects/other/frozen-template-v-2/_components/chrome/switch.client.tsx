"use client";

// ПЕРЕКЛЮЧАТЕЛЬ — самодостаточная замена shadcn Switch (закон 0): тот же вид (дорожка + бегунок),
// role="switch", управляется с клавиатуры. Используется в меню для видимости контейнеров.
export default function Switch({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span className={`inline-block size-4 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}
