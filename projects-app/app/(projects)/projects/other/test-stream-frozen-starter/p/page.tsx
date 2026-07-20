import { loadCompiledPage } from "@/lib/page-compile";

// THE RUNTIME-PAGE HOST of this automation (step 254.17). Static path, the page picked by ?name= —
// never a dynamic segment. Renders pages/<name>/page.compiled.mjs; compile via
// POST /api/projects/pages/compile {"automation":"other/test-stream-frozen-starter","page":"<name>"}.
import { join } from "node:path";

export const dynamic = "force-dynamic";

export default async function PageHost({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;
  const projectDir = join(process.cwd(), "app", "(projects)", "projects", "other", "test-stream-frozen-starter");
  const mod = name ? await loadCompiledPage(projectDir, name) : null;
  if (!mod?.default) {
    return (
      <div style={{ maxWidth: 640, margin: "4rem auto", textAlign: "center", color: "#888" }}>
        <p>No live page named “{name ?? ""}”. Author pages/&lt;name&gt;/page.tsx and compile it
        (POST /api/projects/pages/compile) — it appears here instantly, no rebuild.</p>
      </div>
    );
  }
  const Page = mod.default as unknown as () => Promise<unknown>;
  return <>{(await Page()) as import("react").ReactNode}</>;
}
