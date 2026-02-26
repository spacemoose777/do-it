"use client";

import { useEffect, useState } from "react";

export default function UpdatePrompt() {
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Check if we just completed an update (set before the reload)
    if (sessionStorage.getItem("sw-just-updated")) {
      sessionStorage.removeItem("sw-just-updated");
      setShowConfirmation(true);
      // Trigger fade-in on next tick
      requestAnimationFrame(() => setConfirmationVisible(true));
      // Start fade-out after 2.5 s, then unmount after transition
      const fadeOut = setTimeout(() => setConfirmationVisible(false), 2500);
      const unmount = setTimeout(() => setShowConfirmation(false), 3000);
      return () => {
        clearTimeout(fadeOut);
        clearTimeout(unmount);
      };
    }

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
    // Signal to the next page load that an update just completed
    sessionStorage.setItem("sw-just-updated", "1");
    waitingSW.postMessage("SKIP_WAITING");
    // reload is handled by the controllerchange listener above, which fires
    // only after the new SW has fully activated — avoiding a premature reload
    // that would show the banner again on the next page load
  }

  if (showConfirmation) {
    return (
      <div
        style={{ transition: "opacity 0.5s ease" }}
        className={`fixed top-4 left-4 right-4 z-[9999] flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-bg-secondary px-4 py-3 shadow-lg ${
          confirmationVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium text-green-500">Update complete</span>
      </div>
    );
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
