import {
  Activity,
  ChevronLeft,
  CircleUserRound,
  FlaskConical,
  History,
  Info,
  Menu,
  Network,
  Radar,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getHistory } from "@/services/api";
import type { HistoryItem } from "@/types/investigation";
import { SyntraLogo, SyntraMark } from "./Logo";

export type SyntraView = "investigate" | "history" | "about" | "technical";

interface SidebarProps {
  active: SyntraView;
  onNavigate: (view: SyntraView) => void;
  /** Mobile drawer visibility. */
  open: boolean;
  onClose: () => void;
  /** Current fake-API mode (drives the testing toggle). */
  fakeApi: boolean;
  /** Toggle fake-API mode (fires a toast, page reloads are not needed). */
  onToggleFakeApi: (enabled: boolean) => void;
  apiOnline: boolean;
  /** Restore a stored investigation by id (Recent list click). */
  onRestoreInvestigation: (id: string) => void;
  /** Id of the investigation currently open in the workspace. */
  activeInvestigationId: string | null;
}

const STORAGE_KEY = "syntra.sidebar.collapsed";

/** How many recent investigation titles to show in the sidebar. */
const RECENT_LIMIT = 12;

/** Inner nav used by both the desktop sidebar and the mobile drawer. */
function SidebarContent({
  active,
  onNavigate,
  collapsed,
  fakeApi,
  onToggleFakeApi,
  apiOnline,
  onToggleCollapse,
  onNavigateAway,
  onRestoreInvestigation,
  activeInvestigationId,
}: {
  active: SyntraView;
  onNavigate: (view: SyntraView) => void;
  collapsed: boolean;
  fakeApi: boolean;
  onToggleFakeApi: (enabled: boolean) => void;
  apiOnline: boolean;
  onToggleCollapse?: () => void;
  onNavigateAway: () => void;
  onRestoreInvestigation: (id: string) => void;
  activeInvestigationId: string | null;
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [recent, setRecent] = useState<HistoryItem[] | null>(null);

  // Load once, then refresh whenever a new investigation completes. The
  // workspace dispatches `syntra:history-updated` on completion.
  const refreshRecent = useCallback(() => {
    let cancelled = false;
    getHistory().then((rows) => {
      if (!cancelled) setRecent(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(refreshRecent, [refreshRecent]);

  useEffect(() => {
    const onHistoryUpdated = () => refreshRecent();
    window.addEventListener("syntra:history-updated", onHistoryUpdated);
    return () => window.removeEventListener("syntra:history-updated", onHistoryUpdated);
  }, [refreshRecent]);

  const go = (view: SyntraView) => {
    onNavigate(view);
    onNavigateAway();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      // Sign-out failures are non-actionable in the UI.
    }
  };

  return (
    <>
      {/* Brand */}
      <div className={cn("flex items-center gap-2.5 px-4 pb-2 pt-5", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <SyntraMark size={26} />
        ) : (
          <SyntraLogo size={26} />
        )}
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Collapse sidebar"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Primary navigation */}
      <nav className="mt-2 flex flex-col gap-1 px-2.5" aria-label="Primary">
        <button type="button" className={cn("syn-nav-item", active === "investigate" && "active")} onClick={() => go("investigate")} title="Investigate">
          <Radar className="size-4 shrink-0" />
          {!collapsed && <span>Investigate</span>}
        </button>
        <button type="button" className={cn("syn-nav-item", active === "history" && "active")} onClick={() => go("history")} title="History">
          <History className="size-4 shrink-0" />
          {!collapsed && <span>History</span>}
        </button>
        <button type="button" className={cn("syn-nav-item", active === "about" && "active")} onClick={() => go("about")} title="About">
          <Info className="size-4 shrink-0" />
          {!collapsed && <span>About</span>}
        </button>
      </nav>

      <hr className="syn-nav-divider" />

      <nav className="flex flex-col gap-1 px-2.5" aria-label="Technical">
        <button type="button" className={cn("syn-nav-item", active === "technical" && "active")} onClick={() => go("technical")} title="Technical View">
          <Network className="size-4 shrink-0" />
          {!collapsed && <span>Technical View</span>}
        </button>
      </nav>

      {/* Recent investigations — chat-title style; hidden while collapsed */}
      {!collapsed && (
        <>
          <hr className="syn-nav-divider" />
          <p className="syn-section-title px-4 pb-1.5 pt-1">Recent</p>
          {recent === null ? (
            <div className="syn-recent-list px-1.5 pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="syn-sweep h-6 rounded-md" aria-hidden="true" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="px-4 pb-2 text-[11px] leading-relaxed text-muted-foreground">
              Investigations you run appear here so you can reopen them.
            </p>
          ) : (
            <div className="syn-recent-list" role="list" aria-label="Recent investigations">
              {recent.slice(0, RECENT_LIMIT).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  className={cn(
                    "syn-recent-item",
                    item.id === activeInvestigationId && "active",
                  )}
                  title={item.question}
                  aria-current={item.id === activeInvestigationId ? "true" : undefined}
                  onClick={() => {
                    onRestoreInvestigation(item.id);
                    onNavigateAway();
                  }}
                >
                  <Radar className="syn-recent-dot size-3 shrink-0" aria-hidden="true" />
                  <span className="syn-recent-title">{item.question}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Status + account */}
      <div className="flex flex-col gap-1 px-2.5 pb-4">
        <hr className="syn-nav-divider mt-0 mb-1" />
        <div className={cn("syn-nav-item", "pointer-events-none")} title="Security Status">
          <ShieldCheck className="size-4 shrink-0 text-[var(--syntra-success)]" />
          {!collapsed && <span>Security Status</span>}
          {!collapsed && <span className="ml-auto text-[10px] tracking-wide text-[var(--syntra-success)]">OK</span>}
        </div>
        <div className="syn-nav-item pointer-events-none" title="API Status">
          <Activity
            className={cn("size-4 shrink-0", apiOnline ? "text-[var(--syntra-success)]" : "text-[var(--syntra-danger)]")}
          />
          {!collapsed && <span>API Status</span>}
          {!collapsed && (
            <span className={cn("ml-auto text-[10px] tracking-wide", apiOnline ? "text-[var(--syntra-success)]" : "text-[var(--syntra-danger)]")}>
              {apiOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>
        {user?.email && !collapsed && (
          <div className="syn-nav-item pointer-events-none truncate" title={user.email}>
            <CircleUserRound className="size-4 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            className="syn-nav-item w-full"
            onClick={() => onToggleFakeApi(!fakeApi)}
            aria-pressed={fakeApi}
            title="Serve investigations from the in-browser fake API with simulated latency and failure triggers"
          >
            <FlaskConical
              className={cn(
                "size-4 shrink-0",
                fakeApi ? "text-[var(--syntra-amber)]" : "text-muted-foreground",
              )}
            />
            <span>Fake API</span>
            <span
              className={cn(
                "ml-auto text-[10px] font-semibold tracking-wide",
                fakeApi ? "text-[var(--syntra-amber)]" : "text-muted-foreground",
              )}
            >
              {fakeApi ? "ON" : "OFF"}
            </span>
          </button>
        )}
        {!collapsed && (
          <button type="button" className="syn-nav-item" onClick={handleSignOut}>
            <X className="size-4 shrink-0" />
            <span>Sign out</span>
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button
          type="button"
          className="mx-auto mb-4 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Expand sidebar"
          onClick={onToggleCollapse}
        >
          <Menu className="size-4" />
        </button>
      )}
    </>
  );
}

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
  fakeApi,
  onToggleFakeApi,
  apiOnline,
  onRestoreInvestigation,
  activeInvestigationId,
}: SidebarProps) {
  // Read the persisted preference lazily so no effect-driven setState is needed.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures; UI state only.
      }
      return next;
    });
  }, []);

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        className={cn("syn-sidebar hidden md:flex", collapsed && "collapsed")}
        aria-label="SYNTRA navigation"
      >
        <SidebarContent
          active={active}
          onNavigate={onNavigate}
          collapsed={collapsed}
          fakeApi={fakeApi}
          onToggleFakeApi={onToggleFakeApi}
          apiOnline={apiOnline}
          onToggleCollapse={toggleCollapsed}
          onNavigateAway={() => undefined}
          onRestoreInvestigation={onRestoreInvestigation}
          activeInvestigationId={activeInvestigationId}
        />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="SYNTRA navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <div className="syn-sidebar absolute inset-y-0 left-0 w-64 shadow-2xl">
            <SidebarContent
              active={active}
              onNavigate={onNavigate}
              collapsed={false}
              fakeApi={fakeApi}
              onToggleFakeApi={onToggleFakeApi}
              apiOnline={apiOnline}
              onNavigateAway={onClose}
              onRestoreInvestigation={onRestoreInvestigation}
              activeInvestigationId={activeInvestigationId}
            />
          </div>
        </div>
      )}
    </>
  );
}
