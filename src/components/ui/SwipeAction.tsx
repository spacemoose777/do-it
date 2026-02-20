"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeActionProps {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  rightColor?: string;
  leftColor?: string;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeAction({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Done",
  leftLabel = "Delete",
  rightColor = "bg-success",
  leftColor = "bg-danger",
}: SwipeActionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // Only allow swipe in enabled directions
    if (diff > 0 && !onSwipeRight) return;
    if (diff < 0 && !onSwipeLeft) return;

    // Limit swipe distance with resistance
    const maxSwipe = 120;
    const clampedDiff = Math.sign(diff) * Math.min(Math.abs(diff), maxSwipe);
    setOffset(clampedDiff);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
    } else if (offset < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className={cn("flex-1 flex items-center px-4", rightColor)}>
          <span className="text-white font-medium text-sm">{rightLabel}</span>
        </div>
        <div className={cn("flex-1 flex items-center justify-end px-4", leftColor)}>
          <span className="text-white font-medium text-sm">{leftLabel}</span>
        </div>
      </div>
      {/* Content */}
      <div
        ref={ref}
        className="relative bg-bg-secondary transition-transform"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
