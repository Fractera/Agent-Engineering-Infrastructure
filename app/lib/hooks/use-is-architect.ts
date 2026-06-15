'use client';

import { useState, useEffect } from 'react';
import { detectAdminPreview } from '@/lib/preview/admin-preview';

// In Fractera the code generator IS the Admin layer. The architect / developer-debug tools
// (footer page editor, slot highlight + fine-tune handles) are active ONLY when the Shell is
// viewed inside the Admin preview — NOT for a regular end-user page view. So "is architect" =
// "are we in the Admin preview context" (detectAdminPreview). Replaces the reference's
// next-auth session role. Resolves client-side after mount (SSR renders the non-architect view,
// the tools reveal on hydration when in the preview).
export function useIsArchitect(): boolean {
  const [isArchitect, setIsArchitect] = useState(false);
  useEffect(() => {
    setIsArchitect(detectAdminPreview());
  }, []);
  return isArchitect;
}
