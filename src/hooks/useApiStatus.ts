import { useEffect, useState } from "react";
import { getApiStatus, type ApiStatusInfo } from "@/services/api";

/** Poll the API status probe every 60s; reuses one lightweight query. */
export function useApiStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const status: ApiStatusInfo = await getApiStatus();
      if (!cancelled) setOnline(status.ok);
    };
    void check();
    const interval = window.setInterval(() => void check(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return online;
}
