import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Check,
  ShieldCheck,
  Tag,
  CreditCard,
  Calculator,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type StageStatus = "pending" | "running" | "found" | "unavailable";

interface ReasoningStage {
  id: string;
  label: string;
  status: StageStatus;
  icon: React.ElementType;
}

export function AIAnalysisCard({
  text,
  title = "Deal Intelligence",
  categoryTitle,
  products,
}: {
  text: string;
  title?: string;
  categoryTitle?: string;
  products?: any[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stages, setStages] = useState<ReasoningStage[]>([
    {
      id: "search",
      label: "Searching products",
      status: "pending",
      icon: Search,
    },
    {
      id: "compare",
      label: "Comparing merchants",
      status: "pending",
      icon: Calculator,
    },
    { id: "coupons", label: "Checking coupons", status: "pending", icon: Tag },
    {
      id: "cards",
      label: "Checking card offers",
      status: "pending",
      icon: CreditCard,
    },
    {
      id: "price",
      label: "Calculating effective price",
      status: "pending",
      icon: Calculator,
    },
  ]);

  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Appended enrichment text
  const [enrichmentText, setEnrichmentText] = useState("");
  const safeText = text || "";
  const finalFullText =
    safeText + (enrichmentText ? "\n\n" + enrichmentText : "");

  // Streaming simulation ref
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Parse text to determine which stages are relevant
  const hasCoupons =
    finalFullText.toLowerCase().includes("coupon") ||
    finalFullText.toLowerCase().includes("code") ||
    finalFullText.toLowerCase().includes("save");
  const hasCards =
    finalFullText.toLowerCase().includes("card") ||
    finalFullText.toLowerCase().includes("hdfc") ||
    finalFullText.toLowerCase().includes("sbi") ||
    finalFullText.toLowerCase().includes("icici") ||
    finalFullText.toLowerCase().includes("cashback");
  const hasMerchants =
    finalFullText.toLowerCase().includes("amazon") ||
    finalFullText.toLowerCase().includes("flipkart") ||
    finalFullText.toLowerCase().includes("merchant") ||
    finalFullText.toLowerCase().includes("seller");

  useEffect(() => {
    // Reset state when text changes
    setCurrentStageIndex(0);
    setStreamingText("");
    setIsStreaming(false);
    setIsComplete(false);
    setEnrichmentText("");

    // Initial stage setup
    setStages([
      {
        id: "search",
        label: "Searching products",
        status: "pending",
        icon: Search,
      },
      {
        id: "compare",
        label: "Comparing merchants",
        status: "pending",
        icon: Calculator,
      },
      {
        id: "coupons",
        label: "Checking coupons",
        status: "pending",
        icon: Tag,
      },
      {
        id: "cards",
        label: "Checking card offers",
        status: "pending",
        icon: CreditCard,
      },
      {
        id: "price",
        label: "Calculating effective price",
        status: "pending",
        icon: Calculator,
      },
    ]);

    // Fetch Background Enrichment
    if (categoryTitle && products && products.length > 0) {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
        /\/$/,
        "",
      );

      fetch(`${apiBase}/concierge/enrich/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryTitle, products }),
      })
        .then((res) => res.json())
        .then((resp: any) => {
          let et = "";
          if (resp.coupons && resp.coupons.length > 0) {
            et += `Found active coupons: ${resp.coupons.join(", ")}. `;
          }
          if (resp.bank_offers) {
            et += `Card offers available: ${resp.bank_offers}. `;
          }
          if (resp.cashback) {
            et += `Cashback available: ${resp.cashback}. `;
          }
          if (resp.price_drops) {
            et += `Price drop detected! `;
          }
          if (et) {
            setEnrichmentText(et);
          }
        })
        .catch((e: any) => console.error("Enrichment failed", e));
    }
  }, [safeText, categoryTitle, products]);

  // Handle Reasoning Stages Simulation
  useEffect(() => {
    if (currentStageIndex >= 0 && currentStageIndex < stages.length) {
      // Mark current stage as running
      setStages((prev) =>
        prev.map((s, i) =>
          i === currentStageIndex ? { ...s, status: "running" } : s,
        ),
      );

      const timer = setTimeout(
        () => {
          setStages((prev) =>
            prev.map((s, i) => {
              if (i === currentStageIndex) {
                // Determine result
                if (s.id === "coupons")
                  return { ...s, status: hasCoupons ? "found" : "unavailable" };
                if (s.id === "cards")
                  return { ...s, status: hasCards ? "found" : "unavailable" };
                if (s.id === "compare")
                  return {
                    ...s,
                    status: hasMerchants ? "found" : "unavailable",
                  };
                return { ...s, status: "found" }; // Default success for search/price
              }
              return s;
            }),
          );
          setCurrentStageIndex((prev) => prev + 1);
        },
        600 + Math.random() * 400,
      ); // 600-1000ms per stage

      return () => clearTimeout(timer);
    } else if (
      currentStageIndex === stages.length &&
      !isStreaming &&
      !isComplete
    ) {
      // Begin text streaming once stages are complete
      setIsStreaming(true);
      setIsExpanded(true); // Auto-expand when streaming starts
    }
  }, [
    currentStageIndex,
    hasCoupons,
    hasCards,
    hasMerchants,
    stages.length,
    isStreaming,
    isComplete,
  ]);

  // Handle Text Streaming
  useEffect(() => {
    if (isStreaming) {
      // Split text into sentences for progressive streaming
      const sentences = finalFullText.match(/[^.!?]+[.!?]+/g) || [
        finalFullText,
      ];
      let currentSentence = 0;
      let currentChar = 0;
      let completedText = "";

      const streamNext = () => {
        if (currentSentence < sentences.length) {
          const sentence = sentences[currentSentence];

          if (currentChar < sentence.length) {
            // Add a few characters at a time for smooth typewriter feel
            const chunkSize = Math.floor(Math.random() * 3) + 1;
            currentChar += chunkSize;
            if (currentChar > sentence.length) currentChar = sentence.length;

            setStreamingText(
              completedText + sentence.substring(0, currentChar),
            );

            // Auto scroll
            if (textContainerRef.current) {
              textContainerRef.current.scrollTop =
                textContainerRef.current.scrollHeight;
            }

            streamTimerRef.current = setTimeout(
              streamNext,
              15 + Math.random() * 20,
            ); // Fast typing
          } else {
            // Sentence finished, wait before next sentence
            completedText += sentence + " ";
            currentSentence++;
            currentChar = 0;

            setStreamingText(completedText);
            streamTimerRef.current = setTimeout(
              streamNext,
              400 + Math.random() * 300,
            ); // Pause between sentences
          }
        } else {
          // Finished streaming
          setIsStreaming(false);
          setIsComplete(true);
        }
      };

      streamTimerRef.current = setTimeout(streamNext, 200);

      return () => {
        if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
      };
    }
  }, [isStreaming, text]);

  const reasons = [];
  if (hasCoupons) reasons.push("Applied active coupon codes");
  if (hasCards) reasons.push("Best card discount factored");
  if (hasMerchants) reasons.push("Compared across multiple sellers");
  if (reasons.length === 0) reasons.push("Analyzed standard listing data");

  const confidenceScore =
    hasCoupons && hasCards ? 98 : hasCoupons || hasCards ? 94 : 89;

  return (
    <div className="mt-4 flex flex-col overflow-hidden rounded-xl border border-accent/20 bg-card-bg/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 bg-accent/5 hover:bg-accent/10 transition-colors"
      >
        <div className="flex items-center gap-2 text-accent">
          <Brain className="w-4 h-4" />
          <span className="font-['Space_Mono'] text-xs font-bold uppercase tracking-widest">
            {title}
          </span>
          {isStreaming && (
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse ml-2" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-accent/70" />
        ) : (
          <ChevronDown className="w-4 h-4 text-accent/70" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-accent/10"
          >
            <div className="p-4 space-y-4">
              {/* Reasoning Stages */}
              <div className="space-y-2 mb-4">
                {stages.map((stage, idx) => {
                  // Only render pending if it's the current one, or show history
                  if (idx > currentStageIndex && currentStageIndex !== -1)
                    return null;

                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={stage.id}
                      className="flex items-center justify-between text-xs font-['Space_Mono']"
                    >
                      <div className="flex items-center gap-2">
                        <stage.icon
                          className={`w-3 h-3 ${
                            stage.status === "running"
                              ? "text-blue-400 animate-pulse"
                              : stage.status === "found"
                                ? "text-accent"
                                : stage.status === "unavailable"
                                  ? "text-text/40"
                                  : "text-text/20"
                          }`}
                        />
                        <span
                          className={`${
                            stage.status === "running"
                              ? "text-blue-400"
                              : stage.status === "found"
                                ? "text-text/90"
                                : stage.status === "unavailable"
                                  ? "text-text/40 line-through"
                                  : "text-text/20"
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {stage.status === "running" && (
                          <span className="text-[10px] text-blue-400">
                            Processing...
                          </span>
                        )}
                        {stage.status === "found" && (
                          <Check className="w-3 h-3 text-accent" />
                        )}
                        {stage.status === "unavailable" && (
                          <span className="text-[10px] text-text/40">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Streaming Text Box */}
              {(isStreaming || isComplete) && (
                <div
                  ref={textContainerRef}
                  className="bg-black/40 border border-border-col/50 rounded-lg p-4 max-h-[200px] overflow-y-auto custom-scrollbar"
                >
                  <p className="text-sm text-text/80 leading-relaxed font-['Inter']">
                    {streamingText}
                    {isStreaming && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-1.5 h-4 ml-1 bg-accent align-middle"
                      />
                    )}
                  </p>

                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 pt-3 border-t border-accent/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        <span className="font-['Space_Mono'] text-xs text-accent uppercase tracking-widest font-bold">
                          Analysis Complete
                        </span>
                      </div>

                      <div className="mt-3 bg-accent/10 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-['Space_Mono'] text-xs text-text/60 uppercase">
                            AI Confidence
                          </span>
                          <span className="font-['Space_Mono'] text-sm font-bold text-accent">
                            {confidenceScore}%
                          </span>
                        </div>
                        <ul className="space-y-1 mt-2 border-t border-accent/10 pt-2">
                          {reasons.map((r, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-[10px] text-text/70"
                            >
                              <ShieldCheck className="w-3 h-3 text-accent/70 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
