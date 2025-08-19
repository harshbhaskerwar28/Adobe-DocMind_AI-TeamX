"use client";

import React, { useRef, useCallback, useEffect } from "react";

interface GlowingEffectProps {
  blur?: number;
  borderWidth?: number;
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
}

export function GlowingEffect({
  blur = 0,
  borderWidth = 1,
  spread = 80,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.01,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      containerRef.current.style.setProperty("--mouse-x", `${x}px`);
      containerRef.current.style.setProperty("--mouse-y", `${y}px`);
    },
    [disabled]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (disabled || !container) return;

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove, disabled]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 rounded-inherit"
      style={{
        "--blur": `${blur}px`,
        "--border-width": `${borderWidth}px`,
        "--spread": `${spread}px`,
        "--proximity": `${proximity}px`,
        "--inactive-zone": inactiveZone,
        background: glow
          ? `radial-gradient(var(--spread) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--primary) / 0.2), transparent 70%)`
          : "none",
        filter: glow ? `blur(var(--blur))` : "none",
      } as React.CSSProperties}
    />
  );
}