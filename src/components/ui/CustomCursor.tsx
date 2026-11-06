"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCursor } from "@/context/CursorContext";

export default function CustomCursor() {
  const { cursorType, cursorText } = useCursor();
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for cursor followers
  const springConfig = { damping: 24, stiffness: 220, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Check if device is touch-enabled
    if (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) {
      queueMicrotask(() => setIsTouch(true));
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (isTouch || cursorType === "hidden" || !isVisible) {
    return null;
  }

  // Determine size and style based on cursor state
  const isActionState = ["view", "drag", "rotate"].includes(cursorType);
  const isHovered = cursorType === "hover";

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Inner precise dot */}
      <motion.div
        className="fixed top-0 left-0 h-2 w-2 rounded-full bg-[#c5a46d] mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isHovered || isActionState ? 0 : 1,
          opacity: isActionState ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Outer fluid trailing ring with optional label */}
      <motion.div
        className="fixed top-0 left-0 flex items-center justify-center rounded-full border border-[#c5a46d]/60 backdrop-blur-[2px]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isActionState ? 84 : isHovered ? 48 : 32,
          height: isActionState ? 84 : isHovered ? 48 : 32,
          backgroundColor: isActionState
            ? "rgba(197, 164, 109, 0.18)"
            : isHovered
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.15)",
          borderColor: isActionState
            ? "#c5a46d"
            : isHovered
            ? "rgba(255, 255, 255, 0.6)"
            : "rgba(197, 164, 109, 0.4)",
        }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
      >
        {isActionState && cursorText && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-bold tracking-[0.2em] text-[#c5a46d] uppercase select-none text-center px-1"
          >
            {cursorText}
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
