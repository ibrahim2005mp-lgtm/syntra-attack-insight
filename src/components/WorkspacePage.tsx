import type { ReactNode } from "react";

/**
 * Common frame for workspace views: compact header + scrollable content
 * column. The mobile menu button signals the app shell to open the drawer.
 */
export function WorkspacePage({
  title,
  scope,
  actions,
  children,
}: {
  title: string;
  scope?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const openNav = () => {
    window.dispatchEvent(new CustomEvent("syntra:open-nav"));
  };

  return (
    <div className="syn-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 md:px-6">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Open navigation"
          onClick={openNav}
        >
          <MenuIcon />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-semibold tracking-wide text-foreground">{title}</h1>
          {scope && <span className="truncate text-[11px] text-muted-foreground">{scope}</span>}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
