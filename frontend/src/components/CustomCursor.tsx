// @ts-nocheck
import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [hovering, setHovering] = useState(false);
  const [textHovering, setTextHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  
  // Outer circle (delayed spring)
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  // Inner dot (instant tracking)
  const innerX = useMotionValue(-100);
  const innerY = useMotionValue(-100);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      innerX.set(e.clientX);
      innerY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const isInteractive = target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") ||
        target.closest("a") ||
        target.classList.contains("cursor-pointer");
        
      const isText = target.tagName.toLowerCase() === "p" ||
        target.tagName.toLowerCase() === "h1" ||
        target.tagName.toLowerCase() === "h2" ||
        target.tagName.toLowerCase() === "h3" ||
        target.tagName.toLowerCase() === "span" ||
        target.tagName.toLowerCase() === "label" ||
        target.closest(".bg-card-bg"); // Box hover

      if (isInteractive) {
        setHovering(true);
        setTextHovering(false);
      } else if (isText) {
        setHovering(false);
        setTextHovering(true);
      } else {
        setHovering(false);
        setTextHovering(false);
      }
    };

    const handleMouseDown = () => setClicking(true);
    const handleMouseUp = () => setClicking(false);

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [cursorX, cursorY, innerX, innerY]);

  return (
    <>
      {/* Outer Ring */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: hovering ? 64 : textHovering ? 48 : 40,
          height: hovering ? 64 : textHovering ? 48 : 40,
          translateX: "-50%",
          translateY: "-50%",
          opacity: 1, // Keep at 1 so mix-blend-difference doesn't turn grey
          scale: clicking ? 0.8 : 1
        }}
        animate={{
          backgroundColor: hovering ? "#ffffff" : textHovering ? "#a3e635" : "transparent",
          border: (hovering || textHovering) ? "none" : "1.5px solid rgba(255,255,255,0.5)",
          rotate: hovering ? 45 : textHovering ? 45 : 0,
          borderRadius: hovering ? "50% 50% 50% 0" : textHovering ? "15%" : "50%",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
      {/* Inner Dot */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] mix-blend-difference"
        style={{
          x: innerX,
          y: innerY,
          translateX: "-50%",
          translateY: "-50%",
          opacity: hovering ? 0 : 1,
        }}
        animate={{
          backgroundColor: textHovering ? "#ffffff" : "#a3e635",
          width: textHovering ? 10 : 8,
          height: textHovering ? 10 : 8,
          borderRadius: textHovering ? "2px" : "50%",
          rotate: textHovering ? 45 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
    </>
  );
}