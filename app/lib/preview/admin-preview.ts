// Detects whether the Shell is being viewed inside the Admin PREVIEW — the developer /
// architect debug context — versus as a regular end-user page.
//
// In Fractera the code generator IS the Admin layer (admin.<domain>). The architect/debug tools
// (footer page editor button, slot highlight + fine-tune handles) must appear ONLY in that
// preview, never for end users. The Admin loads the preview iframe with the
// `?fractera_admin_preview=1` marker; we persist it in sessionStorage so client-side navigation
// within the preview keeps the context (the query string is otherwise lost on route changes).
// A normal page view has no marker → false. The per-tool toggles to refine this within the Admin
// flow are a separate, future step — this only establishes the mode signal.

const KEY = "fractera_admin_preview";

export function detectAdminPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(KEY) === "1") {
      sessionStorage.setItem(KEY, "1");
      return true;
    }
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export const ADMIN_PREVIEW_PARAM = KEY;
