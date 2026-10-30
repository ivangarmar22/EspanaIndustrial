import { absoluteUrl } from "@/config/site";

export interface Crumb {
  href?: string;
  label: string;
}

/** Breadcrumb trail for search engines only (schema.org BreadcrumbList); nothing is shown on the page. */
export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <header className="mx-auto max-w-[1440px] px-4 pt-10 pb-10 sm:px-6 lg:px-8">
      {crumbs ? <BreadcrumbJsonLd items={crumbs} /> : null}
      {eyebrow ? <p className="signage text-rust">{eyebrow}</p> : null}
      <h1 className="mt-3 max-w-4xl font-display text-[length:var(--text-headline)] leading-[1.05] font-medium tracking-tight text-balance">
        {title}
      </h1>
      {lead ? <div className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">{lead}</div> : null}
      {children}
    </header>
  );
}
