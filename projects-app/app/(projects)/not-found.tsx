import Link from "next/link";
import { Button } from "@/components/ui/button";

// 404 ЗОНЫ ПРОЕКТОВ (шаг 301). Раньше здесь показывался ГОЛЫЙ дефолт Next («This page could not be
// found») — у projects-app не было своей страницы 404, а корневой layout сквозной (без <html>). Эта
// страница рендерится ВНУТРИ layout зоны (`(projects)/layout.tsx` даёт <html>, шапку и подвал), и ведёт
// ДОМОЙ = на главную проектов (`/projects`), а не на корень сайта.
//
// Частая причина 404 здесь — только что созданная автоматизация, страница которой ещё СОБИРАЕТСЯ
// (пересборка ~1-2 мин): маршрута ещё нет в `.next`. Подсказка об этом ниже, чтобы владелец не решил,
// что создание провалилось.
export default function ProjectsNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-6xl font-bold tracking-tight text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">This page could not be found</h1>
      <p className="text-sm text-muted-foreground">
        The automation or page you are looking for doesn&apos;t exist. If you just created an automation,
        its page may still be building — give it a minute and open it again.
      </p>
      <Button asChild>
        <Link href="/projects">Back to Projects</Link>
      </Button>
    </main>
  );
}
