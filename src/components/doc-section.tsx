/**
 * Long-form pages (Colabora, Metodología, legal texts): from lg the section title sits in
 * a sticky left column and the content runs beside it, so the page uses the full width
 * while paragraphs keep a comfortable reading measure (.prose-ei).
 */
export function DocBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">{children}</div>;
}

export function DocSection({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  /** Lucide icon shown on the brand's cast-iron plate. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-t`}
      className="grid scroll-mt-20 gap-x-12 gap-y-5 border-t border-ink py-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-14 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-x-20"
    >
      <h2
        id={`${id}-t`}
        className="flex items-center gap-4 font-display text-[1.75rem] leading-tight text-ink lg:sticky lg:top-24 lg:flex-col lg:items-start lg:self-start lg:text-3xl"
      >
        {icon ? (
          <span
            className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(160deg,#c25d2d,#9e4320_55%,#7a3216)] text-[#fdf6ec] shadow-[inset_0_1px_0_rgba(255,236,220,0.45),inset_0_-2px_0_rgba(59,23,9,0.35),0_6px_14px_-6px_rgba(122,50,22,0.6)] ring-1 ring-[#5c240e]/50 [&_svg]:drop-shadow-[0_1px_0_rgba(59,23,9,0.55)]"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
