"use client";
import React, { useId, useEffect, useState } from "react";
import { motion } from "motion/react";

interface SparklesProps {
  id?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  className?: string;
  particleColor?: string;
}

export const SparklesCore = (props: SparklesProps) => {
  const {
    id,
    background = "transparent",
    minSize = 0.4,
    maxSize = 1.0,
    particleDensity = 120,
    className = "",
    particleColor = "#FFF",
  } = props;
  const [init, setInit] = useState(false);
  const [, setParticlesArray] = useState<any[]>([]);

  const particlesId = useId();

  useEffect(() => {
    setInit(true);
  }, []);

  const generateParticles = (quantity: number) => {
    const particles = [];
    for (let i = 0; i < quantity; i++) {
      const particle = {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (maxSize - minSize) + minSize,
        delay: Math.random() * 3,
        duration: Math.random() * 3 + 2,
      };
      particles.push(particle);
    }
    return particles;
  };

  const particles = generateParticles(particleDensity);

  return (
    <div
      className={className}
      style={{
        background,
      }}
    >
      {init && (
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particleColor,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};