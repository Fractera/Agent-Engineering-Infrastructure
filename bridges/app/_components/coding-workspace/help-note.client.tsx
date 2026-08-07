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

// Communication channels. Deliberately about the TAB, not about Telegram: the
// next channel should slot in without this text needing a rewrite.
export function ChannelsHelp() {
  return (
    <HelpNote title="Communication channels — letting people reach your project where they already are">
      <p>
        <strong>What this is.</strong> A channel is a place your customers already sit — a messenger, a
        mailbox, a widget — connected to your project so they can ask it something without ever opening
        your site. Telegram is the first one. More will appear here as they are needed; the tab is named
        for the idea, not for the messenger.
      </p>
      <p>
        <strong>What you have to do.</strong> Three steps, and only the first involves anyone else. Create
        a bot in Telegram by writing to <strong>@BotFather</strong> — it takes under a minute and gives you
        a token. Paste that token here and save. Then press <strong>Connect</strong>: Telegram opens on the
        bot with a START button, you press it, and the connection is done.
      </p>
      <p>
        <strong>Why the START press is unavoidable.</strong> Telegram forbids a bot from writing to someone
        who has never written to it first. So one contact must happen — the design here reduces it to a
        single tap. The button carries a one-time code, and the message that code arrives in also carries
        your chat id, so the system reads the id from the same message. No copying numbers, no third-party
        bots to look them up, nothing to get wrong.
      </p>
      <p>
        <strong>What the bot can do.</strong> Out of the box it answers questions from your knowledge base —
        the one Agentic RAG builds from the documents you loaded. That is the bonus for connecting the
        channel: no code to write, no configuration beyond the token. Anything asked in the chat is put to
        the graph, and the answer comes back in the chat. If the base is empty or the service is switched
        off, the bot says exactly that rather than making something up. Developers can extend what it does
        later; this is the floor, not the ceiling.
      </p>
      <p>
        <strong>What it costs.</strong> The channel itself is free: Telegram charges nothing for bots, and
        the connection runs on your own server. Money only appears where the model does. Loading documents
        into the knowledge base costs a model pass over every chunk — that is the real expense, paid once.
        Answering costs too, but far less: each question is one short call to compose a reply from the
        pieces already retrieved. A chat that asks a hundred questions costs a fraction of what building
        the base cost. Nothing is charged for messages that never reach the model — a <code>/start</code>,
        a greeting, an unreachable base.
      </p>
      <p>
        <strong>A channel you do not see here.</strong> If the tool your business actually lives in is
        missing — WhatsApp, a web widget, a mailbox, something internal — write to{" "}
        <a href="mailto:admin@fractera.ai" className="text-primary underline underline-offset-2">admin@fractera.ai</a>{" "}
        and the developer will add it for your project.
      </p>
    </HelpNote>
  );
}

export function ExportHelp() {
  return (
    <HelpNote title="Export — why you would take a copy, and what a copy really is">
      <p>
        <strong>What it is for.</strong> Everything on this server lives on this server. That is the whole
        point of the product — and it means nobody else is keeping a copy for you. A VPS can be deleted by
        a billing mistake, a wrong command or a provider incident, and there is no support desk holding a
        spare. An archive is the only thing standing between that and starting over.
      </p>
      <p>
        <strong>Three moments worth taking one.</strong> Before attaching a domain or changing anything
        structural. Before loading a large corpus into the knowledge base, so a bad load can be undone.
        And on a rhythm you can keep — a copy taken monthly is worth more than a perfect one you never take.
      </p>
      <p>
        <strong>Moving, not just insurance.</strong> The same archive carries this server to another
        machine. Deploy a fresh one, restore, enter the OpenAI key, and it is the same project — same rows,
        same files, same knowledge, same branding.
      </p>
      <p>
        <strong>What is actually inside.</strong> Each part is listed with its real size, because the sizes
        differ by orders of magnitude and the expensive one is not the obvious one. The knowledge graph is
        small on disk and costly to rebuild: it was written by the model reading every document, and
        restoring it from an archive is free while rebuilding it is not.
      </p>
      <p>
        <strong>What is never inside.</strong> The OpenAI key — you enter it again after restoring. And the
        map region: over a gigabyte of OpenStreetMap data that the map panel re-downloads on demand, which
        would make every backup a hundred times larger to save a step that takes minutes.
      </p>
      <p>
        <strong>Handle the secret parts carefully.</strong> Channels and the environment file carry
        credentials. They are unticked by default on purpose: with them included, the archive is no longer
        just data — anyone holding it can speak as your bot or reach your services. Take them when you are
        moving servers; leave them out of copies you keep in ordinary places.
      </p>
    </HelpNote>
  );
}

export function ImportHelp() {
  return (
    <HelpNote title="Import — what restoring changes, and what it cannot undo">
      <p>
        <strong>What it is for.</strong> Putting an archive back: after a mistake, onto a fresh server, or
        to move a project between machines. Choose the file and its contents are read and listed before
        anything at all is written.
      </p>
      <p>
        <strong>Two different behaviours, and the difference matters.</strong> Databases and files are
        ADDED to: existing rows keep their values, and a file you already have is left alone — so restoring
        twice is harmless. The knowledge graph and the application settings are REPLACED whole. That is not
        a shortcut: two graphs built from different documents contradict each other, and two settings files
        cannot both be the truth. One of them has to win, and the archive does.
      </p>
      <p>
        <strong>What that means in practice.</strong> Restoring the graph discards the graph you have now.
        If the current one holds documents the archive does not, export first and keep both copies.
      </p>
      <p>
        <strong>Secrets are unticked by default.</strong> The environment file and the channel credentials
        replace what this server uses right now. On a fresh machine that is exactly what you want; on a
        running one it can point services at the wrong place or hand your bot to an older token. Tick them
        deliberately, not by habit.
      </p>
      <p>
        <strong>After restoring.</strong> The knowledge service is restarted so it reads the graph from
        disk again — it holds one in memory otherwise. The OpenAI key is not in the archive, so enter it in
        OpenAI settings before asking anything.
      </p>
    </HelpNote>
  );
}

export function EnvHelp() {
  return (
    <HelpNote title="Environment variables — the settings a running service reads once">
      <p>
        <strong>What they are.</strong> A short list of name-and-value lines that the application reads
        when it starts: where the database is, which secret proves one service to another, which languages
        the site is built with. Not content, not data — the wiring that tells the code where it is running
        and what it is allowed to reach.
      </p>
      <p>
        <strong>Why they sit next to export and import.</strong> All three are about what this server
        carries in and out of itself. An archive moves the data; this file moves the configuration. Take a
        project to a new machine and you need both — which is also why the same file appears as a ticked
        box in Export, marked as a secret.
      </p>
      <p>
        <strong>The rule that surprises people.</strong> A service reads its environment ONCE, at start.
        Changing a value here does not reach a process that is already running, and some values are baked
        into the built application rather than read at all — those need a rebuild, not a restart. That is
        why saving here can be followed by a rebuild: it is not caution, it is the only way the new value
        becomes real.
      </p>
      <p>
        <strong>Locked entries.</strong> Some variables are shown but cannot be edited. They are the ones
        the platform itself depends on — service addresses and the secrets that let the parts trust each
        other. Changing them by hand would not customise the server, it would disconnect it from itself.
      </p>
      <p>
        <strong>The download button is the missing half of GitHub.</strong> A repository carries code and
        never this file — that is deliberate, secrets do not belong in a repository. So a freshly cloned
        project on a laptop has no configuration at all and cannot start. Downloading this file and
        dropping it into the project root is what completes the clone.
      </p>
      <p>
        <strong>And it does more than unlock the app.</strong> The downloaded copy is not the server&apos;s
        file verbatim: the data address in it is rewritten to one your machine can actually reach, so the
        local application reads THIS server&apos;s rows, files, vector memory and knowledge base instead of
        an empty database of its own. No copying data down, no two versions drifting apart.
      </p>
      <p>
        <strong>Treat this file as a credential.</strong> It holds the secrets services use between
        themselves, and one key that opens the data layer from anywhere. Useful on your own machine; an
        exported copy left anywhere else is a key to the project.
      </p>
      <p>
        <strong>When you actually need it.</strong> Rarely. Almost everything worth changing has a proper
        screen — languages and theme in Platform, branding in App Settings, the OpenAI key in its own
        panel. Come here when a value has no screen yet, or when a developer asks you to add one for
        something new.
      </p>
    </HelpNote>
  );
}

export function GitHubHelp() {
  return (
    <HelpNote title="GitHub — how development actually happens on this project">
      <p>
        <strong>What this is really for.</strong> Not a backup. Pushing to a repository is how you or your
        developers continue building this project <em>on your own computers</em> — with a proper editor, a
        debugger, and as many people as you like working at once. A copy on GitHub is a welcome side
        effect; the purpose is that the work is no longer trapped on the machine that serves it.
      </p>
      <p>
        <strong>The loop, in three moves.</strong> Push the project here. Clone it on a laptop. Take the
        environment file from <strong>Env Variables</strong> — the download button there — and put it in
        the project root. From that moment the local application is talking to <em>this server</em>.
      </p>
      <p>
        <strong>The part people expect to be hard, and is not.</strong> A clone has no data: the repository
        carries code, never rows, files or secrets. So instead of copying data down, the local application
        reads it up — the environment file points it at this server&apos;s data layer. Your rows, your
        uploaded files, your vector memory and your knowledge base are the same ones production uses.
        There are no two versions to drift apart, and nothing to re-import after every change.
      </p>
      <p>
        <strong>What a laptop can reach.</strong> Everything goes through one address and one key, both in
        that file: the database, files and media, vector memory, and the knowledge graph. The map and the
        channel services answer through the same door. Nothing else on the server is exposed, and without
        the key nothing answers at all.
      </p>
      <p>
        <strong>Public or private repository.</strong> A public one can be read by anyone and needs no
        token to pull; writing to any repository needs one. Private is the normal choice for a business
        project. Either way, secrets never travel: the environment file, installed packages, the compiled
        application and uploaded storage are excluded before anything is sent.
      </p>
      <p>
        <strong>Why this screen insists on verifying.</strong> Filled-in fields are not a connection. A
        token can be expired, scoped to the wrong account, or able to read a repository but not write to
        it — each of those used to look like success until a push failed later, at the worst moment.
        Saving here asks GitHub over the network and repeats what it actually said.
      </p>
      <p>
        <strong>If the token is refused</strong>, three causes in order of likelihood: it expired; it was
        created without the <code>repo</code> scope; or it belongs to an account that is not a
        collaborator on that repository. The message on this page names which one it was.
      </p>
    </HelpNote>
  );
}

export function AppSettingsHelp() {
  return (
    <HelpNote title="App Settings — what your visitors and search engines see">
      <p>
        <strong>What it controls.</strong> The face of the public site: its name and description, the
        social preview card, the icons a browser tab and a phone home screen show, and the details that
        make it installable as an app. Not layout, not content — identity.
      </p>
      <p>
        <strong>Why it is a screen and not code.</strong> These values used to live inside the application,
        which meant changing a title required a developer and a rebuild. They are read from a
        configuration file now, so you change them here and the site follows. It is also why they survive
        a redeploy: the file is part of what Export carries as &ldquo;application settings&rdquo;.
      </p>
      <p>
        <strong>Where search engines are concerned.</strong> The title and description are what appears in
        search results and in a link preview when somebody shares your address. Write them for a person
        reading a list of results, not for a machine counting keywords.
      </p>
      <p>
        <strong>Images have two jobs.</strong> An icon is small and must stay recognisable at sixteen
        pixels; a social preview is wide and is seen once, at full size, next to a link. The same picture
        rarely does both well.
      </p>
      <p>
        <strong>What this does not do.</strong> It will not change the language set or the theme — those
        live in Platform — and it will not touch your content. Nothing here can break the site: the worst
        outcome is a wrong name until you change it back.
      </p>
    </HelpNote>
  );
}

// Languages. Wording from the owner (2026-08-08); the routing claims are the ones proxy.ts actually
// implements — single-language mode 301-redirects /en/about to /about and rewrites it back inside.
export function LanguagesHelp() {
  return (
    <HelpNote title="Languages — one set, two shapes of address">
      <p>
        <strong>The pages are already built for this.</strong> Every page is prepared for multilingual
        work with the strongest search optimisation each locale can carry — the language set you choose
        here is what those pages are generated for.
      </p>
      <p>
        <strong>One language.</strong> The root of your project is your domain itself:
        <code> &lt;domain&gt;</code>. No language appears in the address, and an address that carries one
        anyway is redirected to the clean form.
      </p>
      <p>
        <strong>More than one.</strong> Your pages live under the language:
        <code> &lt;domain&gt;/&#123;lang&#125;</code>.
      </p>
      <p>
        <strong>Choose a default language.</strong> It is worth doing in every case: until translations
        into all the chosen languages have been added to your project, it is the texts in that language
        that stand on all pages.
      </p>
    </HelpNote>
  );
}

// Parallel routing. The owner will supply the final wording for this note; what stands here now is
// the mechanism as it actually is, including the part that is not built yet — a "?" that promises
// more than the product does is worse than no "?" at all.
export function ParallelRoutingHelp() {
  return (
    <HelpNote title="Parallel routing — how a page is assembled from slots">
      <p>
        <strong>What it is.</strong> A page can be put together from several named areas — a header, a
        centre column, a left or right side, a promo screen — each rendered on its own. Changing what
        fills one area does not force the rest of the page to be rebuilt.
      </p>
      <p>
        <strong>Where a project starts.</strong> With the centre only. Header and footer are always
        present; everything else stays off until you ask for it. One column is the layout that is right
        before anything is known about the content.
      </p>
      <p>
        <strong>Not yet connected.</strong> The app in the slot does not read this setting today: it has
        no parallel-route folders, so switching areas on here changes the saved configuration and
        nothing on screen. This note will say otherwise once the app supports it.
      </p>
    </HelpNote>
  );
}

export function PlatformHelp() {
  return (
    <HelpNote title="Platform — languages, theme and how pages are assembled">
      <p>
        <strong>What it controls.</strong> Three things that shape every page at once: which languages the
        site is built in, how it looks, and how its parts are composed. Change them here and they apply
        everywhere, rather than page by page.
      </p>
      <p>
        <strong>Languages are a build-time decision.</strong> This is the part that surprises people. The
        set of languages is baked into the compiled site, not read on each request — that is what lets
        pages be served as ready HTML instead of being assembled per visitor. So adding a language means a
        rebuild, and the change appears when the rebuild finishes, not the moment you save.
      </p>
      <p>
        <strong>Routing, in plain terms.</strong> A page is put together from slots — a header, a footer,
        a body — that are rendered independently. It sounds abstract and has a very practical effect:
        changing what fills one slot does not force the rest of the page to be rebuilt or re-fetched.
      </p>
      <p>
        <strong>The theme is not decoration alone.</strong> It sets the colours the whole interface derives
        from, including contrast in light and dark. A theme chosen for looks and not for legibility is
        felt by every visitor on every page.
      </p>
      <p>
        <strong>These settings travel.</strong> They live in the same configuration Export carries as
        &ldquo;application settings&rdquo;, so a restored server looks like the one you configured — not
        like a fresh install.
      </p>
    </HelpNote>
  );
}
