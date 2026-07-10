// A.1 placeholder root page (step 197). Proves the standalone process comes up and binds :3003
// before the real /projects zone moves here (197.4). The zone lives at /projects (a route group
// (projects) that owns its own <html>), so this root "/" is just a liveness marker — a browser
// hitting the bare projects host is nudged to /projects once the zone exists.
export const dynamic = "force-static";

export default function ProjectsRootPlaceholder() {
  return (
    <main style={{ padding: "3rem", maxWidth: "40rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Fractera — Projects service</h1>
      <p style={{ marginTop: "1rem", opacity: 0.75 }}>
        This is the dedicated Projects process (step 197). The automations layer lives at{" "}
        <code>/projects</code>. Content moves here in phase B.
      </p>
    </main>
  );
}
