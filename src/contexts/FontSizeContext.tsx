"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type FontSize = "normal" | "large" | "xl";

const STORAGE_KEY = "doit-font-size";

interface FontSizeContextValue {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: "normal",
  setFontSize: () => {},
});

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");

  // Load from localStorage on mount and apply to <html>
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as FontSize | null;
    if (saved && ["normal", "large", "xl"].includes(saved)) {
      setFontSizeState(saved);
      applyFontSize(saved);
    }
  }, []);

  function applyFontSize(size: FontSize) {
    document.documentElement.setAttribute("data-font-size", size);
  }

  function setFontSize(size: FontSize) {
    setFontSizeState(size);
    localStorage.setItem(STORAGE_KEY, size);
    applyFontSize(size);
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
