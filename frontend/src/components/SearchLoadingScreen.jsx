import { useEffect, useState } from "react";
import { motion } from "motion/react";
import SplitText from "./SplitText.jsx";

const SEARCH_STAGES = [
  "Reading your intent",
  "Consulting merchant networks",
  "Comparing live matches",
  "Curating the best options",
];

export default function SearchLoadingScreen({
  query = "",
  finalizing = false,
}) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    setStageIndex(finalizing ? 1 : 0);
    const interval = window.setInterval(
      () => {
        setStageIndex((current) => (current + 1) % SEARCH_STAGES.length);
      },
      finalizing ? 850 : 1100,
    );
    return () => window.clearInterval(interval);
  }, [finalizing, query]);

  const message = finalizing
    ? SEARCH_STAGES[Math.max(1, stageIndex)]
    : SEARCH_STAGES[stageIndex];

  return (
    <motion.div
      className="search-loading-screen"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="search-loading-orbit search-loading-orbit--one" />
      <div className="search-loading-orbit search-loading-orbit--two" />
      <div className="search-loading-panel">
        <div className="search-loading-kicker">
          <span className="search-loading-dot" />
          Trigr intelligence layer
        </div>
        <SplitText
          key={finalizing ? "finalizing" : "searching"}
          tag="h1"
          text={
            finalizing
              ? "Building your shortlist"
              : "Finding your next favorite"
          }
          className="search-loading-title"
          textAlign="left"
          delay={32}
          duration={0.7}
          ease="power3.out"
          from={{ opacity: 0, y: 34, rotateX: -45 }}
          to={{ opacity: 1, y: 0, rotateX: 0 }}
          threshold={0}
          rootMargin="0px"
        />
        <p className="search-loading-query">“{query || "your request"}”</p>
        <div className="search-loading-stage" key={message}>
          <span className="search-loading-stage-index">0{stageIndex + 1}</span>
          <SplitText
            tag="p"
            text={message}
            className="search-loading-message"
            textAlign="left"
            delay={20}
            duration={0.45}
            ease="power2.out"
            from={{ opacity: 0, y: 18 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0}
            rootMargin="0px"
          />
        </div>
        <div className="search-loading-progress" aria-hidden="true">
          <motion.span
            initial={{ scaleX: 0.08 }}
            animate={{ scaleX: [0.08, 0.72, 0.34, 0.9] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
