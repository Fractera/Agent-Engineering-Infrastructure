// ВИТРИНА НЕПОСТРОЕННОЙ АВТОМАТИЗАЦИИ — то, что видит человек, пришедший по публичной ссылке, пока
// автоматизация остаётся замороженным шаблоном. Показывать пустую витрину было бы обещанием работы,
// которой ещё нет, поэтому вместо неё одно спокойное объяснение.
//
// ПОЧЕМУ ЭТО ЦЕЛАЯ СТРАНИЦА, А НЕ ТОСТ ВНИЗУ: пустая страница подтягивала футер под самый хедер, а
// сообщение висело в углу — это выглядело как поломка, а не как состояние. Блок занимает высоту экрана
// за вычетом хедера (h-14 = 3.5rem) и футера (h-10 = 2.5rem) и центрирует сообщение; футер при этом сам
// оказывается внизу экрана, без единой правки раскладки зоны.
//
// Серверный компонент, без JavaScript: это состояние страницы, а не событие (канон статики).
// Тексты пока ТОЛЬКО английские — решение владельца на этот шаг.
export default function NotBuiltPage() {
  return (
    <section
      data-automation-state="not-built"
      className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-4 text-center"
    >
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-dashed text-muted-foreground">
          {/* песочные часы: работа ещё впереди, ошибки не произошло */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-6">
            <path d="M7 3h10M7 21h10M8 3v4a4 4 0 0 0 8 0V3M8 21v-4a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This automation is not built yet</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Its public page appears once the automation is built and running. Open the automation&apos;s control panel,
          finish the setup, then come back to this link.
        </p>
      </div>
    </section>
  );
}
