// Ported verbatim from the 22slots reference (components/slot/slot-label.server.tsx).

type SlotLabelProps = {
  type: string;
  name: string;
  className?: string;
};

export function SlotLabel({ type, name, className = '' }: SlotLabelProps) {
  return (
    <div
      className={`flex items-center justify-center h-full w-full text-sm font-mono border border-dashed border-gray-300 ${className}`.trim()}
    >
      I am {type} page {name}
    </div>
  );
}
