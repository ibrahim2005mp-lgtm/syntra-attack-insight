import {
  Activity,
  Archive,
  ChevronLeft,
  CircleUserRound,
  FlaskConical,
  History,
  Info,
  Menu,
  MoreHorizontal,
  Network,
  Pencil,
  Pin,
  PinOff,
  Radar,
  Share,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteInvestigation,
  getHistory,
  renameInvestigation,
  setInvestigationArchived,
  setInvestigationPinned,
} from "@/services/api";
import type { HistoryItem } from "@/types/investigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/**
 * One row in the Recent list: title + pin indicator + overflow menu
 * (Share, Rename, Pin, Archive, Delete — the pattern from modern chat UIs,
 * restyled for SYNTRA).
 */
function RecentItem({
  item,
  active,
  onOpen,
  onChanged,
}: {
  item: HistoryItem;
  active: boolean;
  onOpen: (id: string) => void;
  /** Called after any successful mutation so the list refetches. */
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  const handleRename = () => {
    const input = renameInputRef.current;
    const value = input?.value ?? "";
    if (input) input.value = ""; // clear for next time
    setRenaming(false);
    if (value.trim().length === 0 || value === item.question) return;
    renameInvestigation(item.id, value)
      .then(() => {
        toast.success("Title updated", { description: "The investigation was renamed." });
        onChanged();
      })
      .catch((error: unknown) => {
        toast.error("Rename failed", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      });
  };

  const handlePin = () => {
    const next = !item.pinned;
    setInvestigationPinned(item.id, next)
      .then(() => {
        toast(next ? "Pinned" : "Unpinned", {
          description: next
            ? "This investigation now sorts to the top of Recent."
            : "This investigation returned to its normal position.",
        });
        onChanged();
      })
      .catch((error: unknown) => {
        toast.error("Could not update pin", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      });
  };

  const handleArchive = () => {
    setInvestigationArchived(item.id, true)
      .then(() => {
        toast("Investigation archived", {
          description: "It was removed from the Recent list. Find it again in History."
        });
        onChanged();
      })
      .catch((error: unknown) => {
        toast.error("Could not archive", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      });
  };

  const handleDelete = () => {
    deleteInvestigation(item.id)
      .then(() => {
        toast.success("Investigation deleted", {
          description: "The stored investigation was permanently removed.",
        });
        onChanged();
      })
      .catch((error: unknown) => {
        toast.error("Could not delete", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/investigate?id=${encodeURIComponent(item.id)}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        toast.success("Link copied", {
          description: "Anyone with this link and access can open the investigation.",
        });
      })
      .catch(() => {
        toast.error("Copy failed", { description: "Clipboard access was denied." });
      });
  };

  if (renaming) {
    return (
      <div className="syn-recent-item active" data-renaming="true">
        <Pin className="syn-recent-dot size-3 shrink-0" aria-hidden="true" />
        <input
          ref={renameInputRef}
          type="text"
          defaultValue={item.question}
          maxLength={120}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[0.8125rem] text-foreground outline-none"
          aria-label="Investigation title"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setRenaming(false);
          }}
          onBlur={handleRename}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("syn-recent-item group", active && "active")}
      data-menu-open={menuOpen ? "true" : undefined}
      aria-current={active ? "true" : undefined}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title={item.question}
        onClick={() => onOpen(item.id)}
      >
        <Pin
          className={cn(
            "syn-recent-dot size-3 shrink-0",
            item.pinned && "rotate-45 text-[var(--syntra-orange)]",
          )}
          aria-hidden="true"
        />
        <span className="syn-recent-title">{item.question}</span>
      </button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Actions for ${item.question}`}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-44">
          <DropdownMenuItem onClick={handleShare}>
            <Share className="size-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePin}>
            {item.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {item.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="size-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-[var(--syntra-danger)] focus:text-[var(--syntra-danger)]"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
      {/* Brand — the mark doubles as the expand control when collapsed */}
      <div className={cn("flex items-center gap-2.5 px-4 pb-2 pt-5", collapsed && "justify-center px-0")}>
        {collapsed ? (
          onToggleCollapse ? (
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-sidebar-accent"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={onToggleCollapse}
            >
              <SyntraMark size={26} />
            </button>
          ) : (
            <SyntraMark size={26} />
          )
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
                <div key={item.id} role="listitem">
                  <RecentItem
                    item={item}
                    active={item.id === activeInvestigationId}
                    onOpen={(id) => {
                      onRestoreInvestigation(id);
                      onNavigateAway();
                    }}
                    onChanged={refreshRecent}
                  />
                </div>
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
        {/* Keyed by collapsed state so the entrance animation replays on expand */}
        <div className="syn-sidebar-inner" key={collapsed ? "collapsed" : "expanded"}>
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
        </div>
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
