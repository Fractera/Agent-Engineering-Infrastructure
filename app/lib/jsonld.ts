import type { AppConfig } from "@/config/app-config.defaults";
import { socialUrls } from "@/config/app-config.defaults";

// JSON-LD schema builders driven by the live site config. Pure functions — the caller
// (a server component) injects the returned object into a <script type="application/ld+json">.
// Ported from the 22slots metadata toolkit. Reusable for the owner's own product pages.

type Schema = Record<string, unknown>;

function absUrl(path: string, base: string): string {
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

export function buildOrganizationSchema(cfg: AppConfig): Schema {
  const sameAs = socialUrls(cfg.seo.social);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: cfg.name,
    url: cfg.url,
    ...(cfg.logo ? { logo: absUrl(cfg.logo, cfg.url) } : {}),
    description: cfg.description,
    ...(cfg.mailSupport ? { email: cfg.mailSupport } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: cfg.mailSupport,
    },
  };
}

export function buildWebSiteSchema(cfg: AppConfig): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: cfg.name,
    url: cfg.url,
    description: cfg.description,
    inLanguage: cfg.lang,
  };
}

export function buildLocalBusinessSchema(cfg: AppConfig): Schema | null {
  const g = cfg.geo;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: cfg.name,
    url: cfg.url,
    description: cfg.description,
    ...(cfg.mailSupport ? { email: cfg.mailSupport } : {}),
    ...(g.phone ? { telephone: g.phone } : {}),
    ...(g.address && g.city && g.country
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: g.address,
            addressLocality: g.city,
            addressCountry: g.country,
            ...(g.postalCode ? { postalCode: g.postalCode } : {}),
          },
        }
      : {}),
    ...(g.latitude && g.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: parseFloat(g.latitude), longitude: parseFloat(g.longitude) } }
      : {}),
    ...(g.hours ? { openingHours: g.hours } : {}),
  };
}

export function buildFAQSchema(faqs: Array<{ question: string; answer: string }>): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function buildBreadcrumbSchema(cfg: AppConfig, items: Array<{ name: string; url: string }>): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.url, cfg.url),
    })),
  };
}

export function buildProductSchema(p: {
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  brand?: string;
  url?: string;
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.url ? { url: p.url } : {}),
    ...(p.image ? { image: p.image } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    offers: {
      "@type": "Offer",
      price: p.price.toFixed(2),
      priceCurrency: p.currency,
      availability: "https://schema.org/InStock",
      ...(p.url ? { url: p.url } : {}),
    },
  };
}
