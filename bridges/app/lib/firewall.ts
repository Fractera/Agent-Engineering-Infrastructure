import { execSync } from "child_process";

// Host firewall (ufw) management, tied to the insecure/secure mode switch.
//
// INSECURE / IP mode: every service port (3000-3006, 3300, 9118, 9119, 9621) must
// stay reachable on the public IP — that's how zero-DNS onboarding works. :9118 is
// the bridge reverse proxy to the Hermes dashboard (:9119 binds 127.0.0.1 only —
// step 207.15); the browser reaches Brain via :9118, not :9119, in IP mode.
//
// SECURE mode (custom domain): the only intended public entrypoint is nginx on
// 443 (+ 80 for the HTTP->HTTPS redirect and ACME/Let's Encrypt renewals).
// Every other port should be reachable ONLY via nginx, over loopback. Without
// this, a raw request to http://<IP>:9119 (Brain/Hermes), :9621 (Memory/
// LightRAG) or :3300 (data) bypasses nginx's `auth_request` gate entirely —
// those services are gated by nginx, not by themselves (Hermes runs
// `--insecure`). The Next.js apps (3000/3001/3002) still enforce auth via
// proxy.ts, but locking the ports closes the gap uniformly and drops the
// no-TLS cleartext path too.
//
// We use ufw. Loopback traffic (nginx -> 127.0.0.1:<app port>) is allowed by
// ufw's defaults, so denying inbound on the public interface does NOT break the
// reverse proxy.
//
// SAFETY: port 22 (SSH) is allowed BEFORE `enable`, and we use `--force` to stay
// non-interactive, so activation can never strand the operator out of SSH.

function ufwAvailable(): boolean {
  try {
    execSync("command -v ufw", { timeout: 3000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Secure mode: only 22/80/443 reachable from the internet, everything else denied.
export function lockdownFirewall(): { ok: boolean; detail: string } {
  if (!ufwAvailable()) return { ok: false, detail: "ufw not installed" };
  try {
    // Order matters: open SSH first so `enable` can never lock us out.
    execSync("ufw allow 22/tcp", { timeout: 8000, stdio: "ignore" });
    execSync("ufw allow 80/tcp", { timeout: 8000, stdio: "ignore" });
    execSync("ufw allow 443/tcp", { timeout: 8000, stdio: "ignore" });
    execSync("ufw default deny incoming", { timeout: 8000, stdio: "ignore" });
    execSync("ufw default allow outgoing", { timeout: 8000, stdio: "ignore" });
    execSync("ufw --force enable", { timeout: 8000, stdio: "ignore" });
    return { ok: true, detail: "ufw enabled — public ports limited to 22/80/443" };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

// Back to IP mode: drop the firewall so every service port is reachable again.
export function openFirewall(): { ok: boolean; detail: string } {
  if (!ufwAvailable()) return { ok: false, detail: "ufw not installed" };
  try {
    execSync("ufw --force disable", { timeout: 8000, stdio: "ignore" });
    return { ok: true, detail: "ufw disabled — all ports open (IP mode)" };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}
