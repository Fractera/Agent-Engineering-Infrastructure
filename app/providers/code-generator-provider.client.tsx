'use client';

import { createContext, useCallback, useContext } from 'react';

// ADAPTED from the 22slots reference (providers/code-generator-provider.client.tsx).
//
// In the reference the Code Generator is an in-page architect panel driven by next-auth +
// the plugin marketplace. In Fractera the code generator lives in the ADMIN layer (we are
// already inside the admin workspace), so it is never "open" inside the Shell. This is the
// approved @codeGenerator exclusion: we keep the SAME provider interface so the layout
// containers that read `useCodeGenerator()` stay byte-identical to the reference, but it is
// inert — `codeGeneratorOpen` is always false and the actions are no-ops. No next-auth, no
// marketplace dependency is pulled in.

type CodeGeneratorContextValue = {
  codeGeneratorOpen: boolean;
  toggleCodeGenerator: () => void;
  closeCodeGenerator: () => void;
  navLoading: boolean;
  startNavLoading: () => void;
  activePluginIds: string[];
  hasCodePlatformPlugin: boolean;
  hasFineTunePlugin: boolean;
  hasSeoPlugin: boolean;
  refreshPlugins: () => void;
  setPendingPrompt: (text: string) => void;
  consumePendingPrompt: () => string | null;
};

const CodeGeneratorContext = createContext<CodeGeneratorContextValue | null>(null);

export function CodeGeneratorProvider({ children }: { children: React.ReactNode }) {
  const noop = useCallback(() => {}, []);
  const consumePendingPrompt = useCallback((): string | null => null, []);

  // Per directive: code-generator state is TRUE — the Shell runs inside the admin workspace,
  // i.e. we are inside the code generator. Architect tooling gated on codeGeneratorOpen (e.g.
  // the footer page editor) is therefore visible. (The width reservation a real code-gen panel
  // would add is handled as 0 when the center/right containers are wired, since no panel renders.)
  return (
    <CodeGeneratorContext.Provider
      value={{
        codeGeneratorOpen: true,
        toggleCodeGenerator: noop,
        closeCodeGenerator: noop,
        navLoading: false,
        startNavLoading: noop,
        activePluginIds: [],
        hasCodePlatformPlugin: false,
        hasFineTunePlugin: false,
        hasSeoPlugin: false,
        refreshPlugins: noop,
        setPendingPrompt: noop,
        consumePendingPrompt,
      }}
    >
      {children}
    </CodeGeneratorContext.Provider>
  );
}

export function useCodeGenerator() {
  const ctx = useContext(CodeGeneratorContext);
  if (!ctx) throw new Error('useCodeGenerator must be used within CodeGeneratorProvider');
  return ctx;
}
