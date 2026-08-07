"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

// A "?" next to a panel title that opens a written explanation. (step 500)
//
// The two knowledge stores look interchangeable from the outside — both take
// documents, both answer questions — and they are not. Someone who picks the
// wrong one pays for it either in money (a graph pass over data that changes
// hourly) or in quality (a flat search asked to connect facts across forty
// documents). The difference belongs in the product, next to the thing itself,
// not in a conversation that scrolls away.
//
// English only for now — the ten-language pass comes later, and the dictionary
// lives in lib/i18n/admin-translations.json.
export function HelpNote({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref as React.RefObject<HTMLSpanElement>}>
      <button
        type="button"
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle size={12} />
      </button>

      {open && (
        <>
          {/* Click-away. Sits under the card so a click inside it does not close. */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-5 z-[61] w-[min(28rem,calc(100vw-3rem))] max-h-[60vh] overflow-y-auto
                       rounded-xl border border-border bg-background p-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-[12px] font-semibold text-foreground flex-1">{title}</span>
              <button type="button" onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={12} />
              </button>
            </div>
            <div className="text-[11px] leading-relaxed text-muted-foreground space-y-2.5
                            [&_strong]:text-foreground [&_strong]:font-semibold
                            [&_code]:font-mono [&_code]:text-[10px] [&_code]:text-foreground">
              {children}
            </div>
          </div>
        </>
      )}
    </span>
  );
}

// Both explanations end with the same fact, so it is written once. It is the
// question people ask second, right after "which one should I use".
export function SeparateStorageNote() {
  return (
    <p>
      <strong>The two do not share storage.</strong> Vectors live in the data service&apos;s SQLite,
      in the <code>vectors</code> table beside your rows. The graph lives in the RAG service&apos;s own
      folder. To have a document in both, upload it to both: you pay each one&apos;s ingest and get
      each one&apos;s kind of answer. Nothing is shared but the OpenAI key.
    </p>
  );
}

// The domain explanation lives here because it is shown from two places — the
// panel and the wizard — and two copies of a safety warning would drift apart.
export function DomainHelp() {
  return (
    <HelpNote title="Your own domain — why it matters, and how to buy one well">
      <p>
        <strong>The two modes.</strong> Right now the project answers on its IP address over plain HTTP.
        Everything works — the app, the admin panel, the data — and that is exactly the danger: it works
        for you and for anyone else who knows the address. Nothing can be locked down, because without a
        certificate there is no secure session to lock it with. Whoever has the IP can open the admin
        panel, change anything, and delete the project with no way back.
      </p>
      <p>
        <strong>Why a domain is the fix.</strong> A domain lets the server obtain a certificate; the
        certificate makes HTTPS possible; and HTTPS is what gives roles and sessions any meaning at all.
        Until then, &ldquo;secure mode&rdquo; has nothing to stand on. This is why attaching a domain is
        the first thing to do after deployment, not a finishing touch.
      </p>
      <p>
        <strong>Choosing one: price.</strong> Cost depends on the zone — <code>.com</code>,{" "}
        <code>.io</code>, <code>.shop</code> — and on the seller. The same name can differ several times
        over between registrars, so it is worth comparing before you buy.
      </p>
      <p>
        <strong>Choosing one: the renewal trap.</strong> Most people learn this one the hard way. A domain
        advertised at $1 is a <em>first-year</em> price. Sellers rarely show what year two costs, and it
        can be $50 a year. If you only want to try the service, take the $1 offer — but switch off
        auto-renewal the moment you have paid, or the charge arrives a year later without a word. The
        safer habit is to buy from registrars that publish one price for registration and renewal: a
        normal <code>.com</code> is about $10 to register and about $10 every year after.
      </p>
      <p>
        <strong>Choosing one: the name itself.</strong> Before congratulating yourself on a beautiful name,
        check two things — that it is not somebody&apos;s trademark, and that it has no past. A name once
        used for prohibited topics may already be blacklisted by search engines, and you inherit that
        history along with the name.
      </p>
      <p>
        <strong>Where the setup happens.</strong> The records shown here are entered in your
        registrar&apos;s own control panel. Nothing else is needed. You do not need Cloudflare — not unless
        you already know exactly why you want it.
      </p>
      <p>
        <strong>One server, one domain.</strong> The platform holds a hard limit: one IP address, one
        domain name. You cannot carve third-level names out of it to run several projects on one server,
        because the platform already uses third-level names for its own services — auth, admin, data. That
        space is taken by design.
      </p>
      <p>
        <strong>How long it takes.</strong> A fresh domain usually connects within minutes. If it
        previously served another server, the main names — <code>&lt;domain&gt;</code> and{" "}
        <code>www.&lt;domain&gt;</code> — can take several hours to move, occasionally up to a day. That is
        DNS caching across the internet, not something this server can hurry.
      </p>
    </HelpNote>
  );
}

// Login methods. Numbers here are counted from the code, not remembered: 15 roles
// from lib/roles.ts ALL_ROLES, 95 external sign-in services from the installed
// @auth/core provider set. If either changes, this text is wrong and must follow.
export function LoginMethodsHelp() {
  return (
    <HelpNote title="Sign-in — what it protects, who it lets in, and at what price">
      <p>
        <strong>What it wraps.</strong> Authentication is not a page — it is the layer around everything.
        The public app your visitors see, this admin panel, and the data layer where your rows, files and
        vectors live all sit behind it. A request that cannot prove who it is does not reach any of them.
        The auth service runs on its own port and is the only thing allowed to issue a session; the app
        (:3000), the admin (:3002) and the data service (:3300) trust it and nothing else.
      </p>
      <p>
        <strong>Two tiers by default, fifteen available.</strong> Out of the box the system distinguishes an
        architect — the owner — from a registered user. That is enough to run a site, and far too little to
        run a business, so the vocabulary is larger: <strong>15 roles</strong> in total, including buyer,
        VIP, three subscription levels, manager, senior manager, support, delivery, finance, content editor
        and admin. Your application decides what each of them may do; the substrate only guarantees that
        guest, user and architect are enforced at the door.
      </p>
      <p>
        <strong>The first user rule.</strong> The first account registered on a fresh server becomes the
        architect, and that pairing cannot be edited afterwards. Any later account registers as an ordinary
        user, and the current architect can raise it. The consequence is worth reading twice: if the only
        architect loses access <em>before</em> promoting someone else, nothing inside the product can
        restore it — the application has to be reinstalled, and the data goes with it. Promote a second
        architect early.
      </p>
      <p>
        <strong>Where the sign-in button appears.</strong> The public layer shows a sign-in icon in its top
        corner only when your application asks for one. A plain landing page that needs no accounts has no
        button by default — nothing to switch off, nothing to hide.
      </p>
      <p>
        <strong>The built-in method: email and password.</strong> Every new application starts with a
        sign-in system that needs no provider, no configuration and no account anywhere. It is free forever
        because there is no third party in it. Its one real weakness: a user who forgets their password
        cannot recover it themselves — there is nothing to send the reset through.
      </p>
      <p>
        <strong>The two preconfigured providers.</strong> Sign in with Google, and the magic link by email.
        These are the two people actually expect, and both start free. Like every business tool they bill
        after a volume of use — but the free tiers are generous, and the comparison that matters is this:
        on a cloud platform you would pay for Google and for email delivery <em>and</em> for the hosting
        underneath. Here the hosting is your own server, so that third bill does not exist.
      </p>
      <p>
        <strong>Everything else, on request.</strong> The authentication library underneath (Auth.js,
        formerly NextAuth) ships integrations for <strong>95 external sign-in services</strong> — among them
        GitHub, GitLab, Apple, Microsoft Entra ID, Okta, Auth0, Keycloak, Slack, Discord, LinkedIn, Facebook,
        Twitch, Notion, Salesforce, Zoom, Spotify, Reddit, Yandex, VK and Kakao, plus enterprise SAML and
        passkeys. They are not exposed here because each needs its own application registration and secret
        on the provider&apos;s side. Write to{" "}
        <a href="mailto:admin@fractera.ai" className="text-primary underline underline-offset-2">admin@fractera.ai</a>{" "}
        with the one you need and the developer will add it to your application.
      </p>
      <p>
        <strong>A note on secure mode.</strong> Google sign-in and magic links need a domain and HTTPS to
        work at all — a provider will not redirect back to a bare IP address. That is why these entries stay
        hidden until your own domain is attached.
      </p>
    </HelpNote>
  );
}
