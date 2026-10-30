import { SiteHeader } from "@/components/site-header";

/** Full-viewport layout for the map explorer: header, then the map fills the rest. */
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SiteHeader />
      <main id="contenido" className="relative min-h-0 flex-1">
        {children}
      </main>
    </div>
  );
}
