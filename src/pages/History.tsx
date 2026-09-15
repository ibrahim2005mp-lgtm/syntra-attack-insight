import { History as HistoryIcon, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspacePage } from "@/components/WorkspacePage";
import { StatusBadge } from "@/components/StatusBadge";
import { getHistory } from "@/services/api";
import type { HistoryItem } from "@/types/investigation";

function formatTimestamp(ms: number): string {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

/**
 * Minimal history: question, timestamp, evidence status. Selecting an item
 * restores the investigation in the workspace. No admin dashboard.
 */
export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHistory().then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRestore = (id: string) => {
    window.dispatchEvent(new CustomEvent("syntra:restore", { detail: id }));
  };

  return (
    <WorkspacePage title="History" scope="Previous investigations">
      {items === null ? (
        <div className="syn-card syn-sweep h-20" aria-busy="true" />
      ) : items.length === 0 ? (
        <div className="syn-card flex flex-col items-center gap-3 p-10 text-center">
          <HistoryIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No investigations yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Run your first investigation to build history. Every investigation is stored
            with its evidence status so you can return to it later.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleRestore(item.id)}
                className="syn-card syn-card-interactive flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 p-3.5 text-left"
              >
                <Radar className="size-4 shrink-0 text-[var(--syntra-orange)]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.question}</span>
                <span className="syn-mono shrink-0 text-[11px] text-muted-foreground">
                  {formatTimestamp(item.createdAt)}
                </span>
                <StatusBadge status={item.evidenceStatus} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </WorkspacePage>
  );
}
