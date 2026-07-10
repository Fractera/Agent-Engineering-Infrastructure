"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectsManifest } from "@/app/(projects)/projects/_shared/projects-manifest";

// Projects section of the account drawer (step 177, P4): an accordion inside an
// accordion. Outer item = the localized "Projects" header; inner accordion = the
// four PERMANENT categories, always listed even when empty (§3.12). A project
// button opens /projects/<category>/<slug> in the main space (no lang prefix —
// the Projects zone is a monolingual service root). The manifest is baked at
// build by the server TopMenu (fs-scan; folder = registry) and arrives as a
// prop — no request at render. Rendered ONLY for architect/manager (gate in
// account-drawer); the type import above must stay type-only (server file).
export function AccountProjects({ label, manifest }: {
  label: string;
  manifest: ProjectsManifest;
}) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="projects" className="border-b-0">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex items-center gap-2">
            <FolderKanban className="size-4 text-muted-foreground" aria-hidden />
            {label}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-2">
          <Accordion type="multiple" className="pl-2">
            {manifest.map((category) => (
              <AccordionItem key={category.slug} value={category.slug}>
                <AccordionTrigger className="py-2.5 text-muted-foreground hover:text-foreground hover:no-underline">
                  {category.title}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  {category.projects.length === 0 ? (
                    <p className="px-2 text-xs text-muted-foreground">—</p>
                  ) : (
                    <ul className="flex flex-col">
                      {category.projects.map((slug) => (
                        <li key={slug}>
                          <Link
                            href={`/projects/${category.slug}/${slug}`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "w-full justify-start font-normal",
                            )}
                          >
                            {slug}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
