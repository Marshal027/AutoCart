import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function SpotlightCard({ children, className = "", isLiveTarget = false }: { children: React.ReactNode, className?: string, isLiveTarget?: boolean }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-xl border p-5 transition-colors duration-300 ${isLiveTarget ? 'border-accent bg-accent/10' : 'border-border-col bg-white dark:bg-black/90'} ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`,
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function ShinyText({ text, className = "" }: { text: string, className?: string }) {
  return (
    <span
      className={`inline-block animate-shine bg-[linear-gradient(120deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,1)_50%,rgba(255,255,255,0.3)_100%)] bg-[length:200%_auto] bg-clip-text text-transparent uppercase font-bold tracking-widest ${className}`}
      style={{
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shine 3s linear infinite'
      }}
    >
      <style>{`
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
      `}</style>
      {text}
    </span>
  );
}

export function SpecularButton({ children, onClick, active = false, className = "" }: { children: React.ReactNode, onClick: () => void, active?: boolean, className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg px-4 py-3 text-sm text-left transition-all duration-300 group
        ${active ? 'bg-accent text-bg shadow-[0_0_15px_rgba(255,255,255,0.3)] border-transparent' : 'bg-bg text-text border border-border-col hover:border-accent/50'}
        ${className}`}
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <span className="relative z-10 font-medium">{children}</span>
    </button>
  );
}

export function CurvedInput({ value, onChange, placeholder, className = "" }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, className?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-full border-2 border-border-col bg-bg/50 px-6 py-3 text-sm text-text outline-none backdrop-blur-sm transition-all duration-300 focus:border-accent focus:bg-bg placeholder:text-text/35 ${className}`}
    />
  );
}

type RippleGridProps = {
  enableRainbow?: boolean;
  gridColor?: string;
  rippleIntensity?: number;
  gridSize?: number;
  gridThickness?: number;
  fadeDistance?: number;
  vignetteStrength?: number;
  glowIntensity?: number;
  opacity?: number;
  gridRotation?: number;
  mouseInteraction?: boolean;
  mouseInteractionRadius?: number;
  className?: string;
};

export function RippleGrid({
  enableRainbow = false,
  gridColor = "#ffffff",
  rippleIntensity = 0.06,
  gridSize = 22,
  gridThickness = 16,
  fadeDistance = 2.4,
  vignetteStrength = 5,
  glowIntensity = 0.5,
  opacity = 1,
  gridRotation = 0,
  mouseInteraction = false,
  mouseInteractionRadius = 1,
  className = "",
}: RippleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 50, active: false });

  useEffect(() => {
    if (!mouseInteraction) return;

    const updatePointer = (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      setPointer({
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
        active: true,
      });
    };

    const handlePointerMove = (event: PointerEvent) => updatePointer(event.clientX, event.clientY);
    const handlePointerLeave = () => setPointer((current) => ({ ...current, active: false }));

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [mouseInteraction]);

  const lineThickness = Math.max(1, Math.min(gridThickness, gridSize));
  const rippleRadius = Math.max(10, mouseInteractionRadius * 22);
  const activePointer = mouseInteraction && pointer.active ? pointer : { x: 50, y: 50, active: false };

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-[#040506]" />

      <div
        className="absolute inset-[-12%]"
        style={{
          opacity,
          transform: `rotate(${gridRotation}deg) scale(1.15)`,
          transformOrigin: "center",
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              ${gridColor} 0,
              ${gridColor} ${lineThickness}px,
              transparent ${lineThickness}px,
              transparent ${gridSize}px
            ),
            repeating-linear-gradient(
              90deg,
              ${gridColor} 0,
              ${gridColor} ${lineThickness}px,
              transparent ${lineThickness}px,
              transparent ${gridSize}px
            )
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: `radial-gradient(circle at center, black ${Math.max(22, 100 - fadeDistance * 18)}%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle at center, black ${Math.max(22, 100 - fadeDistance * 18)}%, transparent 100%)`,
          filter: `drop-shadow(0 0 ${Math.max(6, glowIntensity * 18)}px rgba(255,255,255,${Math.min(0.45, glowIntensity * 0.28)}))`,
        }}
      />

      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background: enableRainbow
            ? `radial-gradient(circle at ${activePointer.x}% ${activePointer.y}%, rgba(255, 0, 122, ${rippleIntensity * 2.1}) 0%, rgba(255, 154, 0, ${rippleIntensity * 1.7}) 16%, rgba(255, 255, 0, ${rippleIntensity * 1.4}) 32%, rgba(0, 255, 156, ${rippleIntensity * 1.6}) 49%, rgba(0, 145, 255, ${rippleIntensity * 1.5}) 66%, rgba(122, 0, 255, ${rippleIntensity * 1.4}) 82%, transparent ${Math.min(100, rippleRadius * 2.2)}%)`
            : `radial-gradient(circle at ${activePointer.x}% ${activePointer.y}%, rgba(255, 255, 255, ${rippleIntensity * 2}) 0%, rgba(255, 255, 255, ${rippleIntensity}) 20%, transparent ${Math.min(100, rippleRadius * 2.2)}%)`,
          opacity: mouseInteraction && pointer.active ? 1 : 0.88,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${Math.max(20, 100 - vignetteStrength * 12)}%, rgba(0, 0, 0, ${Math.min(0.9, vignetteStrength * 0.12)}) 100%)`,
        }}
      />
    </div>
  );
}
