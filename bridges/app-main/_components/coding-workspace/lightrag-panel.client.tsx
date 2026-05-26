"use client";

// Stub placeholder for Fractera Main bridges/app-main.
// LightRAG (Company Brain) integration arrives in a later step.
// The full panel from bridges/app/_components/coding-workspace/lightrag-panel.client.tsx
// will be ported when LightRAG service is provisioned in bootstrap-main.sh.

export function LightRagPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 text-zinc-200 rounded-xl p-6 max-w-sm border border-zinc-700" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold mb-2">Company Brain</h3>
        <p className="text-sm text-zinc-400 mb-4">
          LightRAG integration is not available yet in Fractera Main. Coming in a future update.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
