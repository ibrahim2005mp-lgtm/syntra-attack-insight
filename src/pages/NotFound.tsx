import { Radar } from "lucide-react";
import { SyntraLogo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <SyntraLogo size={28} />
      <h1 className="syn-mono text-4xl font-semibold text-[var(--syntra-orange)]">404</h1>
      <p className="text-sm text-foreground">This route returned no evidence.</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        The page you requested does not exist in this workspace.
      </p>
      <a
        href="/"
        className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--syntra-orange)] px-4 text-sm font-semibold text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)] transition-colors hover:bg-[color-mix(in_oklab,var(--syntra-orange)_88%,white)]"
      >
        <Radar className="size-4" aria-hidden="true" />
        Back to SYNTRA
      </a>
    </div>
  );
}
