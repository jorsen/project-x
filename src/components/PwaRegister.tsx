"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Dev mode only: unregister any leftover service worker so a browser
    // that visited this app before this fix keeps working locally.
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      return;
    }

    // Turbopack/webpack dev mode recompiles and reshuffles chunks under the
    // same `/_next/static/` URLs constantly, which breaks the service
    // worker's cache-first assumption that those URLs are immutable — only
    // true for a real production build. Only register there.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/offline support is a nice-to-have — a failed
        // registration shouldn't be user-visible or block anything.
      });
    }
  }, []);

  return null;
}
