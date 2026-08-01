import React, { useRef, useState } from 'react';
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
      className={`relative overflow-hidden rounded-xl border p-5 transition-colors duration-300 ${isLiveTarget ? 'border-accent bg-accent/5' : 'border-border-col bg-card-bg'} ${className}`}
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
