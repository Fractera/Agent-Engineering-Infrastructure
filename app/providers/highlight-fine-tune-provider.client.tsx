'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { detectAdminPreview } from '@/lib/preview/admin-preview';

// Provides state for the slot-highlight + fine-tune architect tools.
//
// This is the 22slots `CodeGeneratorProvider` RENAMED to its real purpose. In Fractera the code
// generator IS the Admin layer (admin.<domain>), so the Shell has NO in-page code generator and
// NONE of the code-generator-MODE concerns (panel width reservation, footer auto-show,
// slot-collapse-while-open, the in-page editor toggle) — those were cut. What remains are the
// highlight / fine-tune editing tools (the slot hover handle gated by `fineTuneActive` +
// `hasFineTunePlugin`), which are developer-debug tools active ONLY inside the Admin preview —
// exactly as they activated under code-generator mode before. A regular end-user page view sees
// them off. Per-tool toggles to refine WHEN they show within the Admin flow are a future step.

type HighlightFineTuneContextValue = {
  // Whether fine-tune editing mode is on (gates the slot-highlight hover handle).
  fineTuneActive: boolean;
  // Whether the fine-tune tool is available.
  hasFineTunePlugin: boolean;
};

const HighlightFineTuneContext = createContext<HighlightFineTuneContextValue | null>(null);

export function HighlightFineTuneProvider({ children }: { children: React.ReactNode }) {
  // Active only in the Admin preview (developer context); off on a normal page view.
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(detectAdminPreview());
  }, []);

  return (
    <HighlightFineTuneContext.Provider value={{ fineTuneActive: active, hasFineTunePlugin: active }}>
      {children}
    </HighlightFineTuneContext.Provider>
  );
}

export function useHighlightFineTune() {
  const ctx = useContext(HighlightFineTuneContext);
  if (!ctx) throw new Error('useHighlightFineTune must be used within HighlightFineTuneProvider');
  return ctx;
}
