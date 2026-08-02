import { useState, useEffect } from "react";
import { motion, animate } from "framer-motion";
export const formatINR = (amount: number) => { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount); };

export function TextScramble({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join(""),
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayText}</span>;
}

export function AgentOrb({ isThinking }: { isThinking?: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{
          scale: isThinking ? [1, 1.3, 1] : [1, 1.1, 1],
          opacity: isThinking ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: isThinking ? 0.8 : 2.5,
          ease: "easeInOut",
        }}
        className="absolute h-16 w-16 rounded-full bg-accent/30 blur-xl pointer-events-none"
      />
      <div className="h-3 w-3 rounded-full bg-accent shadow-[0_0_12px_var(--theme-accent)]" />
    </div>
  );
}

export function AnimatedPrice({ amount }: { amount: number }) {
  const [displayAmount, setDisplayAmount] = useState(amount);

  useEffect(() => {
    const controls = animate(displayAmount, amount, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (value) => {
        setDisplayAmount(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [amount, displayAmount]);

  return <span>{formatINR(displayAmount)}</span>;
}
