import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeToViewport(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

/**
 * Tracks whether the viewport is below the mobile breakpoint.
 * Uses useSyncExternalStore so the media-query subscription is the single
 * source of truth (no synchronous setState in an effect).
 */
export function useIsMobile() {
  const isMobile = React.useSyncExternalStore(
    subscribeToViewport,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false, // SSR snapshot
  )
  return isMobile
}
