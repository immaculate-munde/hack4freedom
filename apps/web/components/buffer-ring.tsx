"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../contexts/language-context";

export interface BufferRingProps {
  /** The actual number of months of expenses saved */
  monthsCovered: number;
  /** The target number of months (defaults to 3) */
  targetMonths?: number;
}

export function BufferRing({ monthsCovered, targetMonths = 3 }: BufferRingProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // A small delay ensures the initial 0% state is painted before animating
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const safeMonths = Math.max(0, monthsCovered);
  const percentage = Math.min(100, (safeMonths / targetMonths) * 100);
  const isSafe = safeMonths >= targetMonths;
  
  // SVG Math
  const size = 120;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  
  const offset = mounted ? circumference - (percentage / 100) * circumference : circumference;

  return (
    <div 
      className="relative flex aspect-square w-full max-w-[160px] items-center justify-center" 
      role="img"
      aria-label={t("overview.bufferRing.label", {
        covered: monthsCovered,
        target: targetMonths,
      })}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90 transform"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-sand/40"
        />
        
        {/* Progress track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={isSafe ? "text-pine" : "text-brass animate-pulse"}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-serif text-3xl font-bold tracking-tight ${isSafe ? "text-pine" : "text-brass"}`}>
          {monthsCovered}
        </span>
        <span className="mt-1 text-[10px] font-semibold tracking-widest text-ink/50 uppercase">
          {t("overview.bufferRing.progress", { target: targetMonths })}
        </span>
      </div>
    </div>
  );
}
