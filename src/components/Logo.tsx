/**
 * SYNTRA mark: a minimal geometric symbol combining a protected boundary
 * (rounded square outline), a directional attack path (diagonal chevrons)
 * and an "S" abstraction (the two chevrons interlock into an S-curve).
 * Pure SVG so it renders crisply at favicon and sidebar sizes.
 */

export function SyntraMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Protected boundary */}
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" stroke="var(--syntra-orange)" strokeWidth="2" />
      {/* Attack-path chevrons forming the S abstraction */}
      <path d="M21 8.5 L11 8.5 L11 15 L21 15" stroke="var(--foreground)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 23.5 L21 23.5 L21 17 L11 17" stroke="var(--syntra-orange)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SyntraLogo({
  size = 28,
  withSubtitle = false,
}: {
  size?: number;
  withSubtitle?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <SyntraMark size={size} />
      <span className="inline-flex flex-col leading-none">
        <span className="text-foreground font-semibold tracking-[0.18em] text-[15px]">
          SYNTRA
        </span>
        {withSubtitle && (
          <span className="mt-1 text-[8px] font-medium tracking-[0.22em] text-muted-foreground">
            OFFENSIVE CYBER ATTACK RAG
          </span>
        )}
      </span>
    </span>
  );
}
