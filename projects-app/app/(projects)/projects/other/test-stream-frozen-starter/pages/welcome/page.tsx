// Runtime page "welcome" (the dependency contract, ROUTE-V3 law 7): SELF-CONTAINED — no imports;
// an async server component; data via this automation's own api door; inline styles.
export default async function Page() {
  let rows: { values: Record<string, unknown> }[] = [];
  try {
    const r = await fetch("http://localhost:3003/projects/other/test-stream-frozen-starter/api/rows?table=history&limit=5", { cache: "no-store" });
    if (r.ok) rows = ((await r.json()) as { rows?: { values: Record<string, unknown> }[] }).rows ?? [];
  } catch { /* the table renders empty */ }
  return (
    <div style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1rem", fontFamily: "inherit" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, textAlign: "center" }}>"Тест стрим Frozen стартер"</h1>
      <p style={{ textAlign: "center", opacity: 0.7 }}>A runtime page — live without any rebuild.</p>
      <table style={{ width: "100%", marginTop: "2rem", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #8883" }}>
              {Object.entries(r.values).slice(0, 4).map(([k, v]) => (
                <td key={k} style={{ padding: "6px 8px" }}>{String(v ?? "")}</td>
              ))}
            </tr>
          ))}
          {!rows.length && <tr><td style={{ padding: "6px 8px", opacity: 0.6 }}>No records yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
