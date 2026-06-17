# Authentication architecture — full technical reference (for AI agents)

This document describes, in maximal technical detail, how authentication works in this workspace.
It is written for an AI agent that needs to read, extend, or reason about the auth system. Every fact
here reflects the real implementation. Treat it as authoritative; verify a file before changing it.

---

## 1. Where it runs

| Fact | Value |
|---|---|
| Service | **Auth service** — `services/auth` (a standalone Next.js 16 app) |
| PM2 process | `fractera-auth` |
| Port | **3001** |
| Library | **NextAuth.js v5 (Auth.js)** — `next-auth@^5.0.0-beta.30` |
| Session strategy | **JWT** (`session: { strategy: "jwt" }` in `lib/auth/auth.ts`) |
| Database driver | `better-sqlite3` |
| Secure subdomain | `auth.<domain>` (secure mode); on a bare IP it is `http://<IP>:3001` |

The auth service is the single authority for identity. Every other surface (the public Shell, the
admin platform, the coding agents, Hermes, LightRAG, the web chat) defers to it — directly via
`proxy.ts` or indirectly via nginx `auth_request`. See §8.

---

## 2. Configuration entry points

- `services/auth/lib/auth/auth.config.ts` — the `authConfig` object: providers, cookies, callbacks.
- `services/auth/lib/auth/auth.ts` — wraps `authConfig` with `NextAuth(...)`, attaches the **adapter**
  and the JWT session strategy, and exports `{ handlers, auth, signIn, signOut }`.
- `services/auth/app/api/auth/[...nextauth]/route.ts` — the NextAuth catch-all route handler
  (`GET`/`POST`). Handles `/api/auth/signin`, `/api/auth/callback/<provider>`, `/api/auth/csrf`, etc.

NextAuth is configured to use a custom sign-in page: `pages.signIn = "/login"`.

---

## 3. Sign-in methods (providers)

Providers are built dynamically in `buildProviders()` (`auth.config.ts`). Five methods exist; two of
them are **conditional on environment variables** — they only activate when their credentials are set.

| # | Method | Provider type | Activation |
|---|---|---|---|
| 1 | Architect token | `Credentials` (id `architect`) | Active only if `ARCHITECT_TOKEN` env is set |
| 2 | Email + password | `Credentials` | Always active |
| 3 | Guest | on-demand account creation (`/api/auth/guest`) | Always available |
| 4 | **Google OAuth** | `Google` (`next-auth/providers/google`) | Active only if `GOOGLE_CLIENT_ID` **and** `GOOGLE_CLIENT_SECRET` are set |
| 5 | **Magic link** | `Resend` (`next-auth/providers/resend`) | Active only if `RESEND_API_KEY` is set |

### 3.1 Credentials — email + password
`authorize()` looks up the user by lower-cased email (`SELECT id, email, nickname, password, roles FROM
users WHERE email = ?`), and verifies the password with `bcrypt-ts` `compare()`. Returns
`{ id, email, name: nickname, roles }`. A user row with a `NULL` password (e.g. a guest or an
OAuth-only account) cannot sign in by password.

### 3.2 Credentials — architect token
A virtual sign-in: if `credentials.token === process.env.ARCHITECT_TOKEN`, returns a virtual user with
`roles: ["architect"]`. Used for break-glass / headless administration. Provider id is `architect`
(also surfaced by `/api/auth/architect` and `signIn("architect", { token })`).

### 3.3 Guest
`GET /api/auth/guest?redirectUrl=…` creates an anonymous user `guest_<uuid>@fractera.guest` with
`roles: ["guest"]`, `provider: "guest"`, then signs them in via the credentials provider.

### 3.4 Google OAuth — `allowDangerousEmailAccountLinking: true`
Reads `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The workspace is single-tenant, so linking a Google
sign-in to a pre-existing account with the **same email** is intentional (Google has verified
ownership of the address) — this avoids creating a duplicate user.

### 3.5 Magic link — `Resend`
Reads `RESEND_API_KEY` (+ optional `AUTH_RESEND_FROM`). A self-contained `sendVerificationRequest`
sends the sign-in email via the Resend SDK. The link is single-use; the token lives in
`verification_tokens` (see §6). This is a **passwordless** flow and **requires the database adapter**
(NextAuth refuses to load the Email/Resend provider without one).

---

## 4. The adapter and why it exists (under the hood)

Production auth originally ran **JWT-only with Credentials providers and no database adapter**. OAuth
(Google) and magic-link (Resend) both need to **persist** users, OAuth accounts, and verification
tokens — so a lightweight adapter was written:

- **File:** `services/auth/lib/auth/sqlite-adapter.ts` — `SqliteAdapter(db): Adapter`.
- Implemented methods: `createUser`, `getUser`, `getUserByEmail`, `getUserByAccount`, `updateUser`,
  `deleteUser`, `linkAccount`, `unlinkAccount`, `createVerificationToken`, `useVerificationToken`.
- Session methods (`createSession`/`getSessionAndUser`/`deleteSession`) are **intentionally omitted** —
  the session strategy is JWT, so NextAuth never calls them.
- **Column mapping** (NextAuth ↔ our schema): `name`→`nickname`, `image`→`avatar_url`,
  `emailVerified`→`email_verified`. The adapter surfaces `roles` as an extra field on the user object
  so the `jwt` callback can stamp it onto the token.
- **`createUser` sets the role** (see §7) and defaults `provider` to `"email"`; `linkAccount` overwrites
  `provider` with the real OAuth provider id (e.g. `"google"`).

The adapter is attached in `auth.ts`: `NextAuth({ ...authConfig, adapter: SqliteAdapter(getDb()),
session: { strategy: "jwt" } })`.

---

## 5. Hooks (callbacks) — what they do, who calls them

NextAuth invokes these from inside the sign-in / session lifecycle. Defined in `authConfig.callbacks`:

| Hook | Signature | Purpose |
|---|---|---|
| `jwt` | `({ token, user })` | On sign-in, copies `user.id` → `token.id` and `user.roles` → `token.roles` (fallback `["user"]`). Runs on every token read. |
| `session` | `({ session, token })` | Copies `token.id` → `session.user.id` and `token.roles` → `session.user.roles`. This is how downstream code learns the caller's roles. |
| `redirect` | `({ url, baseUrl })` | Allows post-auth redirects to the configured **cookie-domain family** (`COOKIE_DOMAIN`, e.g. `.aifa.dev` → any `*.aifa.dev` host) plus same-origin; otherwise falls back to `baseUrl`. This lets OAuth/magic-link complete on `auth.<domain>` and land back on the Shell or Admin subdomain. |

Other lifecycle surfaces (not NextAuth callbacks, but part of the auth contract):
- `auth()` (exported from `auth.ts`) wraps API route handlers (e.g. the admin user routes) and injects
  `req.auth` (the session).
- `app/proxy.ts` (Shell) and `bridges/app/proxy.ts` (Admin) are the request-time gate (see §8).
- `GET /api/session` (auth service) returns `{ userId, email, roles }` for cross-service session reads,
  CORS-checked against `ALLOWED_ORIGINS`.
- `GET /api/me` (Shell) is what client components call to learn identity (never `auth()`/`cookies()` in
  pages — that would break static generation).
- `GET /api/auth/methods` (auth service, public) returns `{ google: boolean, magicLink: boolean }` — the
  login page renders each provider button only when its flag is true.

---

## 6. Database — connection, activation, and the required tables

### 6.1 Connection & activation
- Driver: `better-sqlite3`. Path from `DATABASE_URL` (`file:` prefix stripped); default
  `…/data/auth.db`. In production the auth service points at the **shared app database**:
  `DATABASE_URL=file:/opt/fractera/app/data/app.db`.
- `getDb()` (`lib/db/index.ts`) is **lazy**: first call creates the directory, opens the DB, sets
  `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`, then runs `runMigrations()`. The database
  "becomes active" on the **first** `getDb()` call (first request that needs identity), not at boot.
- Migrations are idempotent `CREATE TABLE IF NOT EXISTS` + additive `ALTER TABLE … ADD COLUMN` guarded
  by `PRAGMA table_info` — no migration files, no migration button. Adding a column/table to
  `migrations.ts` makes it appear on next start in every environment.

### 6.2 Required tables (the four NextAuth-shaped tables)
All four are created by `services/auth/lib/db/migrations.ts`:

| Table | Purpose | Key columns |
|---|---|---|
| **`users`** | One row per human identity | `id` (PK), `email` (UNIQUE), `nickname`, `password` (bcrypt or NULL), `roles` (JSON string array), `avatar_url`, `bio`, `locale`, `timezone`, `provider`, `email_verified`, `is_active`, `last_login_at`, `created_at`, `updated_at` |
| **`accounts`** | One row per **linked external provider** for a user | `id` (PK), `user_id` (FK→users), `type`, `provider`, `provider_account_id`, `access_token`, `refresh_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state`; `UNIQUE(provider, provider_account_id)` |
| **`sessions`** | DB sessions table | `id`, `user_id` (FK), `expires`, `session_token` (UNIQUE). Present for adapter completeness; **unused under JWT strategy** (sessions live in the signed cookie). |
| **`verification_tokens`** | Single-use magic-link / email tokens | `identifier`, `token`, `expires`; `UNIQUE(identifier, token)` |

### 6.3 The account-linking relationship (one account, many providers — no duplicates)
The link between **`users`** and **`accounts`** is what lets a single identity authenticate through one
**or several** providers at once, without creating redundant users:
- A user signs up with email+password → a `users` row (no `accounts` row needed for the credentials path).
- The same person later signs in with Google → the adapter calls `getUserByAccount`; if no account
  match, NextAuth finds the user **by email** (with `allowDangerousEmailAccountLinking`) and `linkAccount`
  inserts an `accounts` row (`provider="google"`, `provider_account_id=<google sub>`) pointing at the
  **same** `users.id`. No second user is created.
- Result: one `users` row, multiple `accounts` rows (one per provider). `users.provider` reflects the
  most recent sign-in provider; the authoritative per-provider link is the `accounts` table.

### 6.4 What the user record stores
Besides credentials/roles, `users` stores the **user's image** (`avatar_url` — e.g. the Google profile
picture), display name (`nickname`), `email` + `email_verified`, locale/timezone preferences, a free-text
`bio`, the active/blocked flag (`is_active`), the sign-in `provider`, and timestamps. OAuth tokens
(access/refresh/id) live in `accounts`, not `users`.

---

## 7. Roles

- **Storage:** `users.roles` is a **JSON array of strings** (e.g. `["architect"]`, `["user","finance"]`).
  Default `'["user"]'`. A user can hold **one or several** roles simultaneously.
- **Resolution:** `jwt` callback → `token.roles`; `session` callback → `session.user.roles`. Callers read
  `session.user.roles.includes("<role>")`.
- **Two layers:**
  - **Access tiers enforced by auth + route gates:** `guest`, `user`, `architect` (architect = owner /
    top tier; gates the Admin workspace).
  - **Application role vocabulary** (`ai-workspace/app/config/ui/initial-app-config.ts` `ALL_ROLES`, 15):
    `guest`, `user`, `architect`, `buyer`, `vip_user`, `subscriber_lite`, `subscriber_standard`,
    `subscriber_max`, `manager`, `senior_manager`, `support_manager`, `delivery_manager`, `finance`,
    `content_editor`, `admin`. (The admin app keeps a mirror in `bridges/app/lib/roles.ts`, since it is a
    separate package and cannot import from `app/`.)
- **First user becomes architect.** `createUser` (adapter) and `register` both run
  `SELECT id FROM users LIMIT 1`; if the table is empty the new user gets `["architect"]`, otherwise
  `["user"]`. This holds for **any** provider — whoever deploys and signs in first owns the server.
- **A user cannot remove the architect role from themselves**, and only **another** architect can change
  someone else's roles — both enforced server-side in `services/auth/app/api/admin/users/[id]/route.ts`:
  the PATCH/DELETE handlers require the caller to be `architect` (403 otherwise) **and** reject editing
  your own account (`if (id === currentUserId) → 400 "Cannot modify your own account"`). The self-block
  makes it impossible to strip your own architect role; the architect-gate makes it impossible for a
  non-architect to touch anyone.

---

## 8. How auth covers every surface

There are **two modes**, controlled by `FRACTERA_IP_NODOMAIN_MODE` (env in 4 files; see the modes doc):
- **Insecure / IP mode (`true`):** `shouldBypassAuth()` returns true → auth is **bypassed** everywhere
  (open onboarding on `http://<IP>:port`). The host firewall is open.
- **Secure / domain mode (`false`):** strict, role-gated auth on HTTPS subdomains. Two enforcement
  layers protect every surface:

| Surface | Port | How auth covers it (secure mode) |
|---|---|---|
| **Public site (Shell)** | 3000 | `app/proxy.ts` — pages are statically generated and public; an **API auth-gate** in `proxy.ts` requires the `architect` role for admin-only service-API namespaces (`/api/glossary`, `/api/architecture/*`, `/api/documents`, `/api/ai-draft-settings`, …). Public APIs (`/api/health`, `/api/me`, `/api/media/*` GET) pass through. Client identity comes from `/api/me`. |
| **Admin platform** | 3002 | `bridges/app/proxy.ts` + `shouldBypassAuth()`. In secure mode the admin requires a valid session with the `architect` role. The `admin.<domain>` subdomain is also fronted by nginx `auth_request` → auth service. |
| **Each coding agent** | 3200–3206 (`fractera-bridge`) | The bridge subdomain is gated by nginx `auth_request` → `services/auth` in secure mode. Reaching a coding agent's PTY/WebSocket requires an authenticated session. (Being *logged in to the AI platform itself* — Claude/Codex/… — is a separate step after the bridge is reachable.) |
| **Vector memory (LightRAG)** | 9621 (`fractera-rag`) | nginx `auth_request` → auth service on `lightrag.<domain>`. LightRAG does **not** run `proxy.ts`, so nginx is its only gate. |
| **Hermes (Brain)** | 9119 (`fractera-hermes`) | nginx `auth_request` → auth service on `hermes.<domain>`. Hermes runs `--insecure` and has no `proxy.ts`; nginx is its only gate. |
| **Web UI chat** | 9120 (`fractera-hermes-webui`) | nginx `auth_request` → auth service on the dedicated `chat.<domain>` subdomain (legacy `hermes.<domain>/chat/` also gated). |
| **Data / media service** | 3300 (`fractera-data`) | Token-auth (`DATA_SECRET`) for service-to-service calls; externally on `data.<domain>` it is behind nginx `auth_request`. |

**Defence in depth (secure mode):**
- **Layer 1 — per-process flag:** every service reads `FRACTERA_IP_NODOMAIN_MODE`; with it `false`,
  `proxy.ts` enforces in app/admin/auth, and the session cookie is `Secure` + scoped to `.<domain>` (so
  it is never sent to a bare-IP host over HTTP). Services without `proxy.ts` (data, Hermes, LightRAG) are
  gated **only** by nginx `auth_request` — a missing gate there once exposed Brain/Memory, so every
  authenticated subdomain must carry it.
- **Layer 2 — host firewall:** activation runs `lockdownFirewall()` (ufw allows only **22/80/443**
  inbound, denies the rest; loopback unaffected so nginx→127.0.0.1:port still works). This closes the
  raw-port path uniformly. Deactivation re-opens the ports for IP mode.

### 8.1 Cookies
`auth.config.ts` sets the session cookie name to `__Secure-authjs.session-token` when
`COOKIE_SECURE === "true"`, else `authjs.session-token`. Options: `httpOnly`, `sameSite: "lax"`,
`secure: COOKIE_SECURE`, `domain: COOKIE_DOMAIN` (e.g. `.aifa.dev` so the session is shared across
sibling subdomains). Secure mode sets `COOKIE_SECURE=true` + `COOKIE_DOMAIN=.<domain>` (written by the
domain-activation route).

---

## 9. User-management API (get / list / add / remove users + roles)

| Method | Route | Auth | Behaviour |
|---|---|---|---|
| List users | `GET /api/admin/users?page=&q=` | architect | Paginated (100/page), searchable by name/email; returns rows incl. raw `roles` JSON. |
| Edit user | `PATCH /api/admin/users/[id]` | architect, not self | Updates any of `nickname`, `email` (UNIQUE-checked), `roles` (stored as `JSON.stringify(array)`), `is_active`. |
| Delete user | `DELETE /api/admin/users/[id]` | architect, not self | Removes the user row (cascade to `accounts`/`sessions`). |
| Register | `register(email, password)` server action | public (sign-up) | bcrypt-hashes the password, inserts a `users` row; first user → `["architect"]`, else `["user"]`, `provider="credentials"`. |
| Guest | `GET /api/auth/guest` | public | Creates + signs in a `guest` user. |

The admin UI for this is the **Users panel** (`bridges/app/_components/coding-workspace/
users-panel.client.tsx`): a paginated table that shows each user's full role set, plus an edit dialog
with a **multi-select of all 15 roles** (shadcn checkboxes) so an architect can assign one or several
roles. The role write path is the PATCH route above; the role values are an array — never a single
column.

---

## 10. Scaling to more providers

NextAuth/Auth.js ships **80+ built-in providers** (OAuth/OIDC: Google, GitHub, Apple, Microsoft Entra
ID, Auth0, Okta, Keycloak, Discord, Facebook, LinkedIn, Twitch, GitLab, Slack, Spotify, Reddit, Yandex,
VK, Kakao, Naver, LINE, Notion, Salesforce, Zoom, … — and Email providers: Resend, Nodemailer, etc.).
The architecture here is built to grow into them.

**To add a provider (the established pattern):**
1. Import it in `auth.config.ts` (`next-auth/providers/<name>`).
2. Push it into `buildProviders()` **conditionally**, gated by its env credentials — exactly like Google
   and Resend:
   ```ts
   if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
     providers.push(GitHub({ clientId: …, clientSecret: … }))
   }
   ```
   An empty credential ⇒ provider not loaded ⇒ no button. This keeps the default deploy byte-identical
   and means **a provider activates automatically the moment its credentials are saved**.
3. Seed the empty credential placeholders in `bootstrap.sh` (`services/auth/.env.local`).
4. Surface the flag in `GET /api/auth/methods` and render its button in the login page (each button is
   rendered only when its flag is true).
5. **No adapter change is needed** — `linkAccount` already persists any OAuth provider into the
   `accounts` table, and `getUserByAccount` already resolves it. The four tables are provider-agnostic.

This is why the same four-table schema + one conditional `buildProviders()` block scales from 2 providers
to dozens without structural change.

---

## 11. Credentials storage & editing

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `AUTH_RESEND_FROM` live in
`/opt/fractera/services/auth/.env.local` (seeded **empty** by `bootstrap.sh`). They are editable from
**Admin → Login methods** (`bridges/app …/api/config/auth-methods`), which is **gated to secure mode**
(POST → 403 in insecure mode; the menu entry is hidden). OAuth needs an HTTPS callback and magic-link
needs a real sending domain, so configuring them is only meaningful once a custom domain is active. The
panel shows the Google redirect URI (`https://auth.<domain>/api/auth/callback/google`) to register in the
Google console. Saving restarts `fractera-auth` so the new provider activates within seconds.

---

## 12. Lost-password limitation (early-stage note)

The default deploy starts you on **email + password**. There is currently **no built-in password-recovery
flow** (no "reset password" email). This is acceptable for an early-stage app, and it is exactly why
adding an OAuth/magic-link provider early is recommended — those flows are passwordless and self-recovering.
Under the hood the two providers (Google + magic-link) are already wired; activating either is just a
matter of saving its credentials.
