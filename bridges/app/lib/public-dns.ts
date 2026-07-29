import { promises as dns } from "dns";

// The domain wizard must verify a custom domain against what GLOBAL / authoritative
// DNS returns — NOT what the server's own recursive resolver returns.
//
// Why (root cause, observed on a fresh timeweb VPS, 2026-07-29):
//   Hosting providers push their own resolvers to the NIC via DHCP (e.g. timeweb
//   pushes 85.193.93.193/.194 onto eth0). systemd-resolved PREFERS those
//   link-scoped servers over any global DNS. Those provider resolvers can hold a
//   stale / parking answer for a freshly-pointed domain: kimmeriya.art + www
//   kept resolving to a parking IP (155.212.220.215) on the box long after the
//   real records (→ the server's IP) had fully propagated on 1.1.1.1 / 8.8.8.8.
//   The wizard's step-1 check `resolved.includes(serverIp)` therefore failed
//   forever, even though the domain was correctly configured. Flushing
//   systemd-resolved did NOT help — the upstream provider resolver is the liar.
//
// Fix: resolve against public resolvers directly, bypassing /etc/resolv.conf.
// This is also MORE correct: Let's Encrypt / certbot validate via authoritative
// DNS, so what a public resolver sees is exactly what cert issuance will see.
const PUBLIC_DNS = ["1.1.1.1", "8.8.8.8", "9.9.9.9", "1.0.0.1"];

let resolver: InstanceType<typeof dns.Resolver> | null = null;
function getResolver(): InstanceType<typeof dns.Resolver> {
  if (!resolver) {
    resolver = new dns.Resolver();
    resolver.setServers(PUBLIC_DNS);
  }
  return resolver;
}

// resolve4 against public resolvers only — never the box's DHCP-pushed,
// possibly-stale, link-scoped provider resolver. Same signature/throw behavior
// as dns.promises.resolve4 (rejects with an ENOTFOUND/etc. code on failure).
export function resolve4Public(host: string): Promise<string[]> {
  return getResolver().resolve4(host);
}
