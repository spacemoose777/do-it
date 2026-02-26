"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";

const navIcons: Record<string, (active: boolean) => JSX.Element> = {
  sun: (active) => (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  star: (active) => (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  calendar: (active) => (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  inbox: (active) => (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  ),
  clock: (active) => (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const NAV_HREFS = NAV_ITEMS.map((i) => i.href);

function loadNavOrder(): string[] {
  if (typeof window === "undefined") return [...NAV_HREFS];
  try {
    const saved = localStorage.getItem("doit-nav-order");
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      const validSet = new Set(NAV_HREFS);
      if (
        Array.isArray(parsed) &&
        parsed.length === NAV_HREFS.length &&
        parsed.every((h): h is string => typeof h === "string" && validSet.has(h))
      ) {
        return parsed;
      }
    }
  } catch {}
  return [...NAV_HREFS];
}

export default function BottomNav() {
  const pathname = usePathname();
  const [navOrder, setNavOrder] = useState<string[]>(loadNavOrder);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const pointerStartPos = useRef({ x: 0, y: 0 });

  const isDragging = dragFrom !== null;

  const orderedItems = navOrder.map((href) => NAV_ITEMS.find((i) => i.href === href)!);

  const previewItems = (() => {
    if (!isDragging || dragTo === null) return orderedItems;
    const arr = [...orderedItems];
    const [item] = arr.splice(dragFrom, 1);
    arr.splice(dragTo, 0, item);
    return arr;
  })();

  const draggedItemHref = isDragging ? orderedItems[dragFrom]?.href : null;

  const getSlotIndex = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      const children = Array.from(containerRef.current.children).slice(
        0,
        orderedItems.length
      ) as HTMLElement[];
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) return i;
      }
      return orderedItems.length - 1;
    },
    [orderedItems.length]
  );

  const handleItemPointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      if (isDragging) return;
      pointerStartPos.current = { x: e.clientX, y: e.clientY };
      const el = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;
      longPressTimer.current = setTimeout(() => {
        try {
          el.setPointerCapture(pointerId);
        } catch {
          return;
        }
        setDragFrom(index);
        setDragTo(index);
        navigator.vibrate?.(50);
      }, 500);
    },
    [isDragging]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) {
        const dx = Math.abs(e.clientX - pointerStartPos.current.x);
        const dy = Math.abs(e.clientY - pointerStartPos.current.y);
        if (dx > 8 || dy > 8) {
          clearTimeout(longPressTimer.current);
        }
        return;
      }
      const slot = getSlotIndex(e.clientX);
      setDragTo(slot);
    },
    [isDragging, getSlotIndex]
  );

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (isDragging && dragFrom !== null && dragTo !== null && dragFrom !== dragTo) {
      const newOrder = [...navOrder];
      const [item] = newOrder.splice(dragFrom, 1);
      newOrder.splice(dragTo, 0, item);
      setNavOrder(newOrder);
      localStorage.setItem("doit-nav-order", JSON.stringify(newOrder));
    }
    setDragFrom(null);
    setDragTo(null);
  }, [isDragging, dragFrom, dragTo, navOrder]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-secondary border-t border-border z-40">
      <div
        ref={containerRef}
        className="flex items-center justify-around h-16 px-2"
        style={{ touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {previewItems.map((item) => {
          const isActive = pathname === item.href;
          const isDraggedItem = item.href === draggedItemHref;
          const originalIndex = orderedItems.findIndex((i) => i.href === item.href);
          return (
            <div
              key={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-1 rounded-xl select-none transition-transform duration-150",
                isDraggedItem && isDragging && "scale-110 opacity-60"
              )}
              onPointerDown={(e) => handleItemPointerDown(e, originalIndex)}
            >
              {isDragging ? (
                <div
                  className={cn(
                    "flex flex-col items-center gap-1",
                    isActive ? "text-accent" : "text-text-secondary"
                  )}
                >
                  {navIcons[item.icon](isActive)}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1",
                    isActive ? "text-accent" : "text-text-secondary"
                  )}
                >
                  {navIcons[item.icon](isActive)}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
        <Link
          href="/lists/manage"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 px-1 py-1 rounded-xl transition-colors",
            pathname.startsWith("/lists") ? "text-accent" : "text-text-secondary"
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-[10px] font-medium">Lists</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 px-1 py-1 rounded-xl transition-colors",
            pathname === "/settings" ? "text-accent" : "text-text-secondary"
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
