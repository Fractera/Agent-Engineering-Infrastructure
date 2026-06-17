// The full role vocabulary the admin can assign — mirrors the app's role model
// (ai-workspace/app/config/ui/initial-app-config.ts ALL_ROLES). The admin app is
// a separate Next package and can't import from app/, so the list is kept here.
//
// Two layers:
//   • Access tiers ENFORCED by the auth substrate + route gates: guest / user /
//     architect (architect = owner / top tier).
//   • The rest are the business RBAC vocabulary the application can assign.
export const ALL_ROLES = [
  // Access tiers (enforced)
  "guest",
  "user",
  "architect",
  // Customer-facing
  "buyer",
  "vip_user",
  "subscriber_lite",
  "subscriber_standard",
  "subscriber_max",
  // Staff / operations
  "manager",
  "senior_manager",
  "support_manager",
  "delivery_manager",
  "finance",
  "content_editor",
  // Admin
  "admin",
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

// The architect role can only be removed from a user by ANOTHER architect, and
// no one can remove it from their own account — both enforced server-side in
// app/api/admin/users/[id]/route.ts (architect-gated PATCH + self-edit blocked).
export const PROTECTED_ROLE = "architect";
