// Co-located reader for the PUBLIC app-shell auth toggle. Owns the meaning of the
// build-time key NEXT_PUBLIC_APP_SHELL_AUTH:
//   'left' | 'right' = public auth ON, account drawer opens from that side;
//   absent / empty / anything else = OFF (no public account UI; smaller bundle).
// The admin-panel login always exists separately — this only governs the public shell.
// Parsing style mirrors config/translations/translations.config.ts. Co-located with the
// account feature: delete components/menu/account/ and the read path goes with it.

export type AuthShellSide = "left" | "right";

/** The account-drawer side when public auth is enabled, else null (= disabled). */
export function appShellAuthSide(): AuthShellSide | null {
  const raw = process.env.NEXT_PUBLIC_APP_SHELL_AUTH?.trim().toLowerCase();
  return raw === "left" || raw === "right" ? raw : null;
}

/** True when the public app-shell auth control must render (key = left|right). */
export function isAuthRequired(): boolean {
  return appShellAuthSide() !== null;
}
