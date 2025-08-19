"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
 
export const CompactTextHoverEffect = ({
  text,
  duration,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });
 
  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  // Calculate width based on text length - minimal for 10px text
  const textWidth = text.length * 8; // Appropriate for 10px text
  const viewBoxWidth = Math.max(textWidth, 80); // Minimum width for readability
 
  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewBoxWidth} 20`}
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className="select-none"
    >
      <defs>
        <linearGradient
          id="compactTextGradient"
          gradientUnits="userSpaceOnUse"
          cx="50%"
          cy="50%"
          r="25%"
        >
          {hovered && (
            <>
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="75%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f59e0b" />
            </>
          )}
        </linearGradient>
 
        <motion.radialGradient
          id="compactRevealMask"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="compactTextMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#compactRevealMask)"
          />
        </mask>
      </defs>
      <text
        x="0"
        y="50%"
        textAnchor="start"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-muted-foreground font-medium text-[10px]"
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>
      <motion.text
        x="0"
        y="50%"
        textAnchor="start"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-muted-foreground font-medium text-[10px]"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>
      <text
        x="0"
        y="50%"
        textAnchor="start"
        dominantBaseline="middle"
        stroke="url(#compactTextGradient)"
        strokeWidth="0.3"
        mask="url(#compactTextMask)"
        className="fill-transparent font-medium text-[10px]"
      >
        {text}
      </text>
    </svg>
  );
};
