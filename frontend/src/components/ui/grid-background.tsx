import { cn } from "@/lib/utils";
import React from "react";

interface GridBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

export function GridBackground({ children, className }: GridBackgroundProps) {
  return (
    <div className={cn("relative w-full min-h-screen bg-background", className)}>
      {/* Fixed grid background that always covers full viewport */}
      <div
        className={cn(
          "fixed inset-0 z-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]",
        )}
      />
      {/* Fixed radial gradient overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black)]"></div>
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}