'use client';

// ADAPTED from the 22slots reference (lib/hooks/use-is-architect.ts).
//
// In the reference this derives the architect role from the next-auth session. In Fractera
// the Shell runs INSIDE the admin workspace — i.e. we are always inside the code generator /
// architect mode — so this returns true. This is the approved "code-generator state = true"
// adaptation: architect-gated tooling (slot handles, page menus, action bars) is always
// available, without pulling in next-auth.
export function useIsArchitect(): boolean {
  return true;
}
