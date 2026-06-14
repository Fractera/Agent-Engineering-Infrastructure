// Route entry component for the my-telegram-reminder project page. Server, fully
// static — a real, visible route (the project layer forbids dynamic routes,
// §3.12). This is the seed template an agent later grows into the real feature.
export default function MyTelegramReminderEntry() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-amber-600">
          project · my-telegram-reminder
        </p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          This is a page template for project my Telegram reminder
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          A real, statically-rendered route. An agent grows this project from here —
          ingesting Telegram messages into a vector store so you can later ask, in
          plain language, what you had planned.
        </p>
      </div>
    </main>
  )
}
