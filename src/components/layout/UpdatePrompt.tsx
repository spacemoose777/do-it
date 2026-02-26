"use client";

import { useEffect, useState } from "react";

export default function UpdatePrompt() {
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // A new SW is already waiting (e.g. user had old tab open)
      if (reg.waiting) {
        setWaitingSW(reg.waiting);
      }

      // A new SW finishes installing and is now waiting
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingSW(newSW);
          }
        });
      });
    });

    // When SW activates after skipWaiting, reload the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  function applyUpdate() {
    if (!waitingSW) return;
    setWaitingSW(null);
    waitingSW.postMessage("SKIP_WAITING");
    // reload is handled by the controllerchange listener above, which fires
    // only after the new SW has fully activated — avoiding a premature reload
    // that would show the banner again on the next page load
  }

  if (!waitingSW) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-bg-secondary px-4 py-3 shadow-lg">
      <span className="text-sm text-text-secondary">Update available</span>
      <button
        onClick={applyUpdate}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
      >
        Refresh
      </button>
    </div>
  );
}
