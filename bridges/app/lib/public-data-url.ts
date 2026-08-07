import Database from "better-sqlite3";
import { readServerIp } from "@/lib/server-ip";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// The address of the data layer AS SEEN FROM OUTSIDE this server. (step 500)
//
// This exists because of a defect that silently broke local development: the env
// export handed developers `REMOTE_DATA_URL=http://localhost:3300`, copied from
// NEXT_PUBLIC_MEDIA_URL. On the server that value is correct — the app and the
// data service share a machine. On a developer's laptop it points at their own
// laptop, so a cloned project talked to nothing and looked simply broken.
//
// The rule: a value handed to another machine must be resolved from THAT
// machine's point of view, never copied from the server's own configuration.
export function publicDataUrl(): { url: string; mode: "domain" | "ip"; reason?: string } {
  // Secure mode: the data service is published as its own subdomain behind the
  // certificate, so no port is involved.
  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db
      .prepare("SELECT custom_domain, domain_status FROM site_settings WHERE id = 1")
      .get() as { custom_domain?: string | null; domain_status?: string } | undefined;
    db.close();
    if (row?.domain_status === "active" && row.custom_domain) {
      return { url: `https://data.${row.custom_domain}`, mode: "domain" };
    }
  } catch {
    // No settings table yet — a server that has never seen the domain wizard.
  }

  // IP mode: the data service listens on every interface, so the server's own
  // address plus its port is what a laptop can actually reach.
  const ip = readServerIp();
  if (ip) return { url: `http://${ip}:3300`, mode: "ip" };

  return {
    url: "",
    mode: "ip",
    reason: "The server could not determine its own public address. Attach a domain, or set REMOTE_DATA_URL by hand.",
  };
}
