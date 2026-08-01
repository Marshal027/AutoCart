import {
  type ReactElement,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  X,
  Heart,
  Zap,
  Hand,
  Sliders,
  Settings,
  Star,
  Bookmark,
  Bell,
} from "lucide-react";
import type { CartItem, CategoryTrack, Item } from "../mockData";
import { cx } from "../utils/cx";
import { SpotlightCard, ShinyText, SpecularButton, CurvedInput } from "./ReactBits";
import { formatINR } from "../mockData";
import { Background3D } from "./Background3D";
import { SmartSavings } from "./SmartSavings";
import { TextScramble, AgentOrb, AnimatedPrice } from "./RehanUI";
import { ErrorBoundary } from "./ErrorBoundary";
import { VoiceOverlay } from "./VoiceOverlay";
import { PlannerBridge } from "../voice/PlannerBridge";
import { AIAnalysisCard } from "./AIAnalysisCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const AI_REQUEST_TIMEOUT_MS = 60000;

// ΓöÇΓöÇΓöÇ Watchlist Store ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const watchlistBus = new EventTarget();
export const getWatchlist = (): any[] => {
  try { return JSON.parse(localStorage.getItem("watchlist") || "[]"); } catch { return []; }
};
export const toggleWatchlist = (item: any) => {
  let list = getWatchlist();
  if (list.find(i => i.id === item.id)) {
    list = list.filter(i => i.id !== item.id);
  } else {
    list.push(item);
  }
  localStorage.setItem("watchlist", JSON.stringify(list));
  watchlistBus.dispatchEvent(new Event("updated"));
};
export function useWatchlist() {
  const [list, setList] = useState<any[]>(getWatchlist());
  useEffect(() => {
    const handler = () => setList(getWatchlist());
    watchlistBus.addEventListener("updated", handler);
    return () => watchlistBus.removeEventListener("updated", handler);
  }, []);
  return list;
}

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

type QuestionType =
  | "text" | "textarea" | "number" | "slider" | "single_choice"
  | "multi_choice" | "multi_select" | "date" | "time" | "location"
  | "yes_no" | "dropdown" | "color" | "rating";

type Question = {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

type AnalysisResponse = {
  intent?: string;
  confidence?: number;
  enough_information: boolean;
  questions?: Question[];
  reasoning_summary?: string;
};

type FinalizeResponse = {
  summary: string;
  categories: CategoryTrack[];
};

type CategoryProductsResponse = {
  items: Item[];
  ai_pick_index: number;
  ai_pick_reason: string;
  mcp_mode?: string;
};

type ConversationEntry = {
  role: "user" | "assistant";
  content: string;
};

type Answers = Record<string, string | number | string[] | boolean>;

type RendererProps = {
  question: Question;
  value: Answers[string];
  onChange: (value: Answers[string]) => void;
};

type SwipeMode = null | "manual" | "ai";

// Per-category selection state
type CategorySelection = {
  categoryId: string;
  categoryTitle: string;
  categoryIcon: string;
  selectedItems: Item[];
  aiPickIndex: number;
  aiPickReason: string;
  products: Item[];
};

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function formatConfidence(value?: number) {
  if (typeof value !== "number") return "0%";
  return `${Math.round(value * 100)}%`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();
    const data = contentType.includes("application/json")
      ? JSON.parse(rawBody)
      : { error: `Server returned ${response.status} instead of JSON.` };
    if (!response.ok) throw new Error(data.error ?? "QuikSwipe could not reach the AI concierge.");
    if (!contentType.includes("application/json")) throw new Error(data.error);
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The AI is taking too long. Try again.", { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

type GeminiUsageData = {
  api_key_configured: boolean;
  masked_key: string;
  model: string;
  status: string;
  daily_limit_rpd: number;
  rpm_limit: number;
  calls_this_session: number;
  successful_calls: number;
  failed_calls: number;
  estimated_remaining_today: number;
  percentage_remaining: number;
  last_call_time: string | null;
  ai_studio_url: string;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error("Failed to fetch data");
  return (await response.json()) as T;
}

// ΓöÇΓöÇΓöÇ Concierge Components ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function ConversationBubble({ entry }: { entry: ConversationEntry }) {
  const isUser = entry.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cx("max-w-[84%] border px-4 py-3 text-sm leading-relaxed",
        isUser ? "border-accent bg-accent text-bg" : "border-border-col bg-card-bg text-text")}>
        {entry.content}
      </div>
    </motion.div>
  );
}

function AIThinking({ label, goal }: { label: string; goal: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [label]);

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center justify-center py-12 px-6">
      <AgentOrb isThinking={true} />
      <h2 className="mt-8 font-['Oswald'] text-2xl font-bold uppercase tracking-widest text-text">
        <TextScramble text={label} />
      </h2>
      <div className="mt-3 font-['Space_Mono'] text-xs tracking-widest text-text/40 flex flex-col items-center gap-1.5">
        <p>INITIALIZING AI AGENT</p>
        <p className="text-accent text-[10px]">
          {goal ? `GOAL: ${goal.toUpperCase()}` : "ANALYZING REQUEST"}
        </p>
      </div>
      <div className="mt-8 flex w-48 h-1 overflow-hidden bg-border-col">
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="h-full w-1/3 bg-accent"
        />
      </div>
    </div>
  );
}

function ProgressTimeline({ analysis, hasPlan, hasProducts }: {
  analysis: AnalysisResponse | null; hasPlan: boolean; hasProducts: boolean;
}) {
  const confidence = analysis?.confidence ?? 0;
  const steps = [
    { label: "Goal", active: Boolean(analysis) || hasPlan },
    { label: "Preferences", active: confidence >= 0.95 || hasPlan },
    { label: "Plan", active: hasPlan },
    { label: "Products", active: hasProducts },
  ];
  return (
    <div className="border border-border-col bg-card-bg p-5">
      <div className="flex items-center justify-between">
        <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest text-accent">Progress</span>
        <span className="font-['Space_Mono'] text-xs text-text/60">{formatConfidence(confidence)}</span>
      </div>
      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <div className={cx("flex h-8 w-8 items-center justify-center border text-xs font-bold",
              step.active ? "border-accent bg-accent text-bg" : "border-border-col bg-bg text-text/45")}>
              {step.active ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className="text-sm font-bold uppercase tracking-wide text-text/75">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Question Components ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const textInputClass = "w-full border border-border-col bg-bg px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text/35 focus:border-accent";

const questionRenderers: Record<QuestionType, (props: RendererProps) => ReactElement> = {
  text: ({ value, onChange }) => (
    <input className={textInputClass} value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)} placeholder="Type your answer" />
  ),
  textarea: ({ value, onChange }) => (
    <textarea className={`${textInputClass} min-h-28 resize-y`} value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)} placeholder="Add details" />
  ),
  number: ({ value, onChange }) => (
    <input className={textInputClass} type="number" value={String(value ?? "")}
      onChange={(e) => onChange(e.target.valueAsNumber || e.target.value)} placeholder="Enter a number" />
  ),
  slider: ({ question, value, onChange }) => {
    const min = question.min ?? 0; const max = question.max ?? 100; const current = Number(value ?? min);
    return (
      <div>
        <input className="w-full accent-[var(--theme-accent)]" type="range" min={min} max={max}
          step={question.step ?? 1} value={current} onChange={(e) => onChange(Number(e.target.value))} />
        <div className="mt-2 flex justify-between font-['Space_Mono'] text-xs text-text/60">
          <span>{min}</span><span className="text-accent">{current}</span><span>{max}</span>
        </div>
      </div>
    );
  },
  single_choice: ({ question, value, onChange }) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {(question.options ?? []).map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)}
          className={cx(optionButtonClass, value === option
            ? "border-accent bg-accent text-bg" : "border-border-col bg-bg text-text hover:border-accent")}>
          {option}
        </button>
      ))}
    </div>
  ),
  multi_choice: ({ question, value, onChange }) => {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {(question.options ?? []).map((option) => {
          const isSel = selected.includes(option);
          return (
            <button key={option} type="button"
              onClick={() => onChange(isSel ? selected.filter((i) => i !== option) : [...selected, option])}
              className={cx(optionButtonClass, isSel
                ? "border-accent bg-accent text-bg" : "border-border-col bg-bg text-text hover:border-accent")}>
              {option}
            </button>
          );
        })}
      </div>
    );
  },
  multi_select: (props) => questionRenderers.multi_choice(props),
  date: ({ value, onChange }) => (
    <input className={textInputClass} type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
  ),
  time: ({ value, onChange }) => (
    <input className={textInputClass} type="time" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
  ),
  location: ({ value, onChange }) => (
    <input className={textInputClass} value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)} placeholder="City, area, or delivery location" />
  ),
  yes_no: ({ value, onChange }) => (
    <div className="grid grid-cols-2 gap-2">
      {[true, false].map((option) => (
        <button key={String(option)} type="button" onClick={() => onChange(option)}
          className={cx(optionButtonClass, value === option
            ? "border-accent bg-accent text-bg" : "border-border-col bg-bg text-text hover:border-accent")}>
          {option ? "Yes" : "No"}
        </button>
      ))}
    </div>
  ),
  dropdown: ({ question, value, onChange }) => (
    <select className={textInputClass} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select an option</option>
      {(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  ),
  color: ({ value, onChange }) => (
    <div className="flex items-center gap-3">
      <input className="h-11 w-14 border border-border-col bg-bg p-1" type="color"
        value={String(value ?? "#ddc655")} onChange={(e) => onChange(e.target.value)} />
      <input className={textInputClass} value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)} placeholder="Color preference" />
    </div>
  ),
  rating: ({ question, value, onChange }) => {
    const max = question.max ?? 5;
    return (
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((r) => (
          <button key={r} type="button" onClick={() => onChange(r)}
            className={cx("h-11 border text-sm font-bold", value === r
              ? "border-accent bg-accent text-bg" : "border-border-col bg-bg text-text hover:border-accent")}>
            {r}
          </button>
        ))}
      </div>
    );
  },
};

function QuestionRenderer(props: RendererProps) {
  const render = questionRenderers[props.question.type] ?? questionRenderers.text;
  return render(props);
}

function QuestionCard({ question, value, onChange, isLiveTarget, liveVoiceText }: {
  question: Question; value: Answers[string]; onChange: (value: Answers[string]) => void;
  isLiveTarget: boolean; liveVoiceText: string;
}) {
  const customValue = isLiveTarget && liveVoiceText ? liveVoiceText : (typeof value === "string" ? value : "");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLiveTarget && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isLiveTarget]);
  
  return (
    <motion.div ref={cardRef} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="mb-4"
    >
      <SpotlightCard isLiveTarget={isLiveTarget}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {isLiveTarget && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            <h3 className="text-base font-bold text-text">
              <ShinyText text={question.question} />
            </h3>
          </div>
          <span className="shrink-0 border border-border-col px-2 py-1 font-['Space_Mono'] text-[9px] uppercase tracking-widest text-text/40">
            Optional
          </span>
        </div>
        
        {/* Native Renderers */}
        {question.type !== "text" && (
          <div className="mb-3">
            <QuestionRenderer question={question} value={value} onChange={onChange} />
          </div>
        )}
        
        {/* Custom Answer / Voice Textbox */}
        <CurvedInput 
          value={customValue}
          onChange={(e) => onChange(e.target.value)} 
          placeholder={question.type === "text" ? "Type or speak your answer..." : "Or type/speak a custom answer..."} 
        />
      </SpotlightCard>
    </motion.div>
  );
}

export function QuestionFlow({ questions, answers, onAnswer, activeQuestionId, liveVoiceText }: {
  questions: Question[]; answers: Answers; onAnswer: (id: string, value: Answers[string]) => void;
  activeQuestionId: string | null; liveVoiceText: string;
}) {
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} value={answers[q.id]}
            onChange={(v) => onAnswer(q.id, v)} 
            isLiveTarget={q.id === activeQuestionId}
            liveVoiceText={liveVoiceText}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function QuestionSummary({ questions, answers }: { questions: Question[]; answers: Answers }) {
  const answered = questions.filter((q) => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "";
  });
  return (
    <div className="border border-border-col bg-card-bg p-5">
      <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest text-accent">Answers</span>
      <div className="mt-4 space-y-3">
        {answered.length === 0 ? (
          <p className="text-sm text-text/50">No answers yet.</p>
        ) : (
          answered.map((q) => (
            <div key={q.id} className="border border-border-col bg-bg p-3">
              <p className="text-xs text-text/50">{q.question}</p>
              <p className="mt-1 text-sm font-bold text-text">
                {Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : String(answers[q.id])}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Mode Selection Screen ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function ModeSelectionScreen({ onSelect, summary, hasItems, onReset, voiceSelectedMode }: {
  onSelect: (mode: "manual" | "ai", budget?: number) => void;
  summary: string;
  hasItems: boolean;
  onReset: () => void;
  voiceSelectedMode?: "manual" | "ai" | null;
}) {
  const [selectedBudget, setSelectedBudget] = useState<number>(50000);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-10 max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 mb-4">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest text-accent">
            {hasItems ? "Categories Ready" : "Status"}
          </span>
        </div>
        <p className="text-lg text-text/80 leading-relaxed">{summary}</p>
      </motion.div>

      {hasItems ? (
        <>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="mb-8 font-['Oswald'] text-3xl font-bold uppercase tracking-wide text-text sm:text-4xl text-center">
            How do you want to shop?
          </motion.h2>

          <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
            {/* Manual */}
            <motion.button
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="button" onClick={() => onSelect("manual")}
              className={`group flex flex-col items-center gap-5 border-2 p-8 text-center transition-all ${voiceSelectedMode === "manual" ? "border-accent bg-accent/10 scale-105 shadow-[0_0_20px_var(--theme-accent)]" : "border-border-col bg-card-bg hover:border-accent"}`}
            >
              <div className={`flex h-16 w-16 items-center justify-center border-2 text-3xl transition-all ${voiceSelectedMode === "manual" ? "border-accent bg-accent/20" : "border-border-col bg-bg group-hover:border-accent group-hover:bg-accent/10"}`}>
                <Hand className={`h-8 w-8 transition-colors ${voiceSelectedMode === "manual" ? "text-accent" : "text-text/70 group-hover:text-accent"}`} />
              </div>
              <div>
                <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wide text-text">I'll Swipe</h3>
                <p className="mt-2 text-sm text-text/55 leading-relaxed">
                  Swipe through products in each category and pick your favourite
                </p>
              </div>
              <div className={`mt-auto flex items-center gap-2 border px-5 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest transition-colors ${voiceSelectedMode === "manual" ? "border-accent text-accent" : "border-border-col text-text/60 group-hover:border-accent group-hover:text-accent"}`}>
                Choose Manual <ArrowRight className="h-3 w-3" />
              </div>
            </motion.button>

            {/* AI */}
            <motion.div
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
              className={`flex flex-col items-center gap-4 border-2 p-6 text-center transition-all ${voiceSelectedMode === "ai" ? "border-accent bg-accent/10 scale-105 shadow-[0_0_30px_var(--theme-accent)]" : "border-accent/40 bg-card-bg hover:border-accent"}`}
            >
              <div className="flex h-14 w-14 items-center justify-center border-2 border-accent/40 bg-accent/10 text-3xl">
                <Zap className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wide text-text">AI Picks</h3>
                <p className="mt-1 text-xs text-text/55 leading-relaxed">
                  AI selects the best product per category ΓÇö you can override any pick
                </p>
              </div>

              <div className="w-full border border-accent/30 bg-accent/5 p-3 text-left my-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-['Space_Mono'] text-[10px] uppercase tracking-wider text-accent flex items-center gap-1 font-bold">
                    <Sliders className="h-3 w-3" /> AI Target Budget
                  </span>
                  <span className="font-['Space_Mono'] text-xs font-bold text-accent">
                    {formatINR(selectedBudget)}
                  </span>
                </div>
                <input
                  type="range" min={1000} max={500000} step={1000}
                  value={selectedBudget}
                  onChange={(e) => setSelectedBudget(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer h-1.5 bg-bg-surface border border-border-col/40 rounded-none"
                />
                <div className="flex justify-between text-[9px] font-['Space_Mono'] text-text/40 mt-1">
                  <span>Γé╣1,000</span><span>Γé╣5,00,000</span>
                </div>
              </div>

              <button type="button" onClick={() => onSelect("ai", selectedBudget)}
                className="w-full flex items-center justify-center gap-2 bg-accent px-5 py-3 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-bg hover:opacity-90 transition-opacity">
                Let AI Pick <Sparkles className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-4">
          <button onClick={onReset}
            className="flex items-center gap-2 border-2 border-accent bg-accent text-bg px-8 py-4 font-['Space_Mono'] text-sm font-bold uppercase tracking-widest transition-all hover:bg-accent/90">
            Try Another Search <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

function CategoryGridCard({
  item, isAIPick, aiPickReason, isSelected, onSelect, categoryTitle, categoryProducts
}: {
  item: Item;
  isAIPick: boolean;
  aiPickReason: string;
  isSelected: boolean;
  onSelect: () => void;
  categoryTitle?: string;
  categoryProducts?: any[];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flightStart, setFlightStart] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const watchlist = useWatchlist();
  const isBookmarked = !!watchlist.find(i => i.id === item.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setFlightStart({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
      setTimeout(() => setFlightStart(null), 850); // Matches animation duration
    }
    onSelect();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist(item);
  };

  const cardContent = (
    <>
      {/* Bookmark Button */}
      <button 
        type="button"
        onClick={handleBookmark}
        className="absolute top-2 right-10 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-border-col transition-colors hover:bg-black/60 hover:border-accent group/bookmark"
      >
        <Bookmark className={cx("h-3.5 w-3.5 transition-colors", isBookmarked ? "text-accent fill-accent" : "text-text/60 group-hover/bookmark:text-accent")} />
      </button>

      {/* Development Data Badge */}
      {item.is_development_data && (
        <div className="absolute top-10 right-2 z-10 flex items-center gap-1 border border-orange-500/50 bg-orange-500/10 px-2 py-1 shadow-[0_0_10px_var(--color-orange-500)] backdrop-blur-md">
          <Sliders className="h-3 w-3 text-orange-400" />
          <span className="font-['Space_Mono'] text-[8px] font-bold uppercase tracking-widest text-orange-400">Dev Data</span>
        </div>
      )}

      {/* AI Pick Badge */}
      {isAIPick && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-accent px-2 py-1 shadow-[0_0_15px_var(--theme-accent)]">
          <Star className="h-3 w-3 text-bg fill-bg" />
          <span className="font-['Space_Mono'] text-[9px] font-bold uppercase tracking-widest text-bg">AI Pick</span>
        </div>
      )}

      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 flex items-center justify-center bg-accent rounded-full h-5 w-5 shadow-[0_0_10px_var(--theme-accent)]">
          <Check className="h-3 w-3 text-bg" />
        </div>
      )}

      <div className="relative flex-1 p-4 flex items-center justify-center min-h-[160px] overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 z-0" />
        <img src={item.image} alt={item.name} className="max-h-[150px] max-w-[85%] object-contain mix-blend-screen transition-transform duration-500 group-hover:scale-110 z-10 drop-shadow-2xl" />
      </div>

      <div className="flex flex-col border-t border-border-col/30 p-4 bg-black/40 backdrop-blur-md">
        <div className="font-['Space_Mono'] text-[9px] font-bold uppercase tracking-widest text-text/40 mb-1 line-clamp-1">
          Source: <span className="text-accent/80">{item.merchant || "Unknown"}</span>
        </div>
        <h3 className="font-['Oswald'] text-sm font-bold uppercase tracking-wide text-text line-clamp-2 leading-tight group-hover:text-accent transition-colors">
          {item.name}
        </h3>
        
        <div className="mt-3 flex items-center justify-between">
          <span className="font-['Space_Mono'] text-lg font-bold text-accent drop-shadow-[0_0_8px_var(--theme-accent)]">
            <AnimatedPrice amount={item.price} />
          </span>
          <div className="flex items-center gap-1 bg-bg px-2 py-1 border border-border-col/50 rounded-full">
            <Star className="h-2.5 w-2.5 text-accent fill-accent" />
            <span className="font-['Space_Mono'] text-[9px] font-bold text-text">{item.rating || "4.5"}</span>
          </div>
        </div>
      </div>
      
      {isAIPick && aiPickReason && (
        <div className="px-3 pb-3">
          <ErrorBoundary>
            <AIAnalysisCard text={aiPickReason} categoryTitle={categoryTitle} products={categoryProducts} />
          </ErrorBoundary>
        </div>
      )}
    </>
  );

  return (
    <>
      <div
        ref={cardRef}
        className={cx(
          "relative flex flex-col overflow-hidden transition-all duration-300",
          flightStart ? "opacity-30 pointer-events-none" : "hover:-translate-y-1",
          isSelected ? "glass-modal border-accent bg-accent/5 ring-1 ring-accent" :
          isAIPick ? "border-accent shadow-[0_0_20px_var(--theme-accent)] scale-[1.05] z-20 bg-card-bg/90" : "border-border-col/50 bg-card-bg/40 backdrop-blur-sm",
          "border"
        )}
      >
        {cardContent}
        <div className="flex border-t border-border-col/30 divide-x divide-border-col/30">
          <button
            type="button"
            onClick={handleAdd}
            className={cx(
              "flex-1 py-2.5 text-center font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest transition-colors",
              isSelected ? "bg-accent/20 text-accent hover:bg-accent/30" : "bg-bg text-text hover:bg-accent hover:text-bg"
            )}
          >
            {isSelected ? "Remove" : "Add to Cart"}
          </button>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 block bg-bg py-2.5 text-center font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent hover:text-bg transition-colors"
            >
              Store ΓåÆ
            </a>
          )}
        </div>
      </div>

      <AnimatePresence>
        {flightStart && (
          <motion.div
            initial={{ 
              position: "fixed", 
              top: flightStart.y, 
              left: flightStart.x, 
              width: flightStart.w, 
              height: flightStart.h, 
              zIndex: 9999,
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
              opacity: 1,
              transformOrigin: "center center"
            }}
            animate={{ 
              x: 40 - flightStart.x, // Fly to sidebar X
              y: 80 - flightStart.y, // Fly to sidebar Y
              scale: 0.25,
              rotate: -10,
              opacity: 0.9
            }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={cx(
              "flex flex-col overflow-hidden pointer-events-none border border-accent bg-card-bg/90 shadow-[0_0_30px_var(--theme-accent)]",
              isAIPick ? "shadow-[0_0_20px_var(--theme-accent)] bg-card-bg/90" : "bg-card-bg/40 backdrop-blur-sm"
            )}
          >
            {cardContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ΓöÇΓöÇΓöÇ Prava Payment Success Overlay ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function PravaPaymentSuccessOverlay({ totalAmount, cartItems, onClose }: {
  totalAmount: number; cartItems: CartItem[]; onClose: () => void;
}) {
  const txId = useMemo(() => `PRAVA-${Math.floor(100000 + Math.random() * 900000)}`, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-5">
      <motion.div initial={{ scale: 0.75, y: 25, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.75, y: 25, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative w-full max-w-md border border-accent/40 bg-card-bg p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="flex justify-center mb-6">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(52,211,153,0.35)]">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </motion.div>
        </div>
        <div className="text-center">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="inline-block border border-accent/40 bg-accent/10 px-3 py-1 font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest text-accent mb-2">
            Prava Pay Instant Settlement Γ£ô
          </motion.span>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="font-['Oswald'] text-3xl font-bold uppercase tracking-wide text-text">
            Payment Successful!
          </motion.h2>
          <p className="mt-1 text-xs text-text/60">Order processed instantly via Prava Agentic Protocol.</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="mt-6 border border-border-col bg-bg p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text/50 uppercase font-['Space_Mono']">Transaction ID</span>
            <span className="font-['Space_Mono'] font-bold text-accent">{txId}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-text/50 uppercase font-['Space_Mono']">Payment Gateway</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1"><Zap className="h-3 w-3" /> Prava Pay</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-text/50 uppercase font-['Space_Mono']">Items Purchased</span>
            <span className="font-bold text-text">{cartItems.length} item(s)</span>
          </div>
          <div className="border-t border-border-col pt-3 flex justify-between items-center text-sm">
            <span className="font-bold uppercase tracking-wider text-text">Total Paid</span>
            <span className="font-['Space_Mono'] text-lg font-bold text-accent">{formatINR(totalAmount)}</span>
          </div>
        </motion.div>
        <motion.button initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          type="button" onClick={onClose}
          className="mt-6 w-full bg-accent py-4 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-bg hover:opacity-95 transition-opacity">
          Done / Close Receipt
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ΓöÇΓöÇΓöÇ Category Swipe Screen (the core new flow) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function CategorySwipeScreen({
  tracks, goal, answers, onReset, mode, initialBudget, bridge,
}: {
  tracks: CategoryTrack[]; goal: string; answers?: Answers; onReset: () => void; mode: "manual" | "ai"; initialBudget?: number; bridge?: PlannerBridge;
}) {
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const [categoryProducts, setCategoryProducts] = useState<Item[]>([]);
  const [aiPickIndex, setAiPickIndex] = useState(-1);
  const [aiPickReason, setAiPickReason] = useState("");
  const [currentMcpMode, setCurrentMcpMode] = useState("development");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Searching providers...");

  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;
    if (isLoadingProducts) {
      setLoadingMessage("Searching providers...");
      timer1 = setTimeout(() => setLoadingMessage("Validating matches..."), 2000);
      timer2 = setTimeout(() => setLoadingMessage("Searching for better matches..."), 5000);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoadingProducts]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [selections, setSelections] = useState<Record<string, CategorySelection>>({});

  const [allDone, setAllDone] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [aiBudget] = useState(initialBudget ?? 15000);

  // AI auto-swipe state
  const [aiAutoState, setAiAutoState] = useState<"idle" | "thinking" | "deciding" | "done">("idle");
  const [aiAutoMessage, setAiAutoMessage] = useState("");
  const [aiSwipeDir, setAiSwipeDir] = useState<"left" | "right" | null>(null);

  const activeCat = tracks[activeCatIndex];
  const totalCategories = tracks.length;

  useEffect(() => {
    if (bridge) {
      bridge["deps"].handleNext = () => {
        // Find next non-selected item
        setCurrentSwipeIndex(i => Math.min(i + 1, categoryProducts.length - 1));
      };
      bridge["deps"].handlePrev = () => {
        setCurrentSwipeIndex(i => Math.max(i - 1, 0));
      };
      bridge["deps"].handleSelect = () => {
        const item = categoryProducts[currentSwipeIndex];
        if (item) {
          setSelectedItems(prev => {
            if (!prev.find(p => p.id === item.id)) return [...prev, item];
            return prev;
          });
        }
      };
      bridge["deps"].handleCheckout = () => {
        setOrderPlaced(true);
        setShowSuccessOverlay(true);
      };
    }
  }, [bridge, categoryProducts, currentSwipeIndex]);

  const cart = useMemo(() => {
    return Object.values(selections)
      .flatMap(s => (s.selectedItems || []).map(item => ({
        ...item,
        quantity: 1,
        categoryId: s.categoryId,
        categoryTitle: s.categoryTitle,
      })));
  }, [selections]);

  const cartTotal = cart.reduce((s, c) => s + c.price, 0);

  // Fetch products when active category changes
  useEffect(() => {
    if (!activeCat) return;

    // Check if we already have products for this category
    const existing = selections[activeCat.id];
    if (existing && existing.products.length > 0) {
      setCategoryProducts(existing.products);
      setAiPickIndex(existing.aiPickIndex);
      setAiPickReason(existing.aiPickReason);
      
      let sel = existing.selectedItems;
      if ((!sel || sel.length === 0) && mode === "ai" && existing.aiPickIndex >= 0 && existing.aiPickIndex < existing.products.length) {
        sel = [existing.products[existing.aiPickIndex]];
      }
      setSelectedItems(sel || []);
      
      setIsLoadingProducts(false);
      return;
    }

    // Check if products were pre-loaded via tracks
    if (activeCat.items && activeCat.items.length > 0) {
      setCategoryProducts(activeCat.items);
      setAiPickIndex(0);
      setAiPickReason(activeCat.desc || "AI selected this based on your preferences.");
      
      let sel: Item[] = [];
      if (mode === "ai" && activeCat.items.length > 0) {
        sel = [activeCat.items[0]];
      }
      setSelectedItems(sel);
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    setCategoryProducts([]);
    setSelectedItems([]);

    const prefs: Record<string, unknown> = {};
    if (answers) {
      for (const [k, v] of Object.entries(answers)) {
        if (typeof k === "string" && k.toLowerCase().includes("budget") && typeof v === "string") {
          if (v.includes("Under")) prefs["max_price"] = parseInt(v.split(" ").pop()?.replace(",", "") ?? "0");
          else if (v.includes("-")) prefs["max_price"] = parseInt(v.split("-").pop()?.replace(",", "") ?? "0");
        }
      }
    }

    postJson<CategoryProductsResponse>("/concierge/category-products/", {
      search_queries: activeCat.search_queries || [activeCat.title],
      category_title: activeCat.title,
      preferences: prefs,
      goal,
      merchant_domain: activeCat.merchant_domain || "general",
    }).then((resp) => {
      setCategoryProducts(resp.items);
      setAiPickIndex(resp.ai_pick_index);
      setAiPickReason(resp.ai_pick_reason);
      if (resp.mcp_mode) setCurrentMcpMode(resp.mcp_mode);
      if (resp.items.length > 0) {
        if (mode === "ai" && resp.ai_pick_index >= 0 && resp.ai_pick_index < resp.items.length) {
          setSelectedItems([resp.items[resp.ai_pick_index]]);
        }
      }
      setIsLoadingProducts(false);
    }).catch(e => {
      console.error(e);
      setIsLoadingProducts(false);
    });
  }, [activeCatIndex, activeCat?.id]);

  // Pre-fetch all upcoming categories
  useEffect(() => {
    if (activeCatIndex + 1 >= tracks.length) return;

    const prefs: Record<string, unknown> = {};
    if (answers) {
      for (const [k, v] of Object.entries(answers)) {
        if (typeof k === "string" && k.toLowerCase().includes("budget") && typeof v === "string") {
          if (v.includes("Under")) prefs["max_price"] = parseInt(v.split(" ").pop()?.replace(",", "") ?? "0");
          else if (v.includes("-")) prefs["max_price"] = parseInt(v.split("-").pop()?.replace(",", "") ?? "0");
        }
      }
    }

    // Fire off fetches for all remaining categories
    for (let i = activeCatIndex + 1; i < tracks.length; i++) {
      const nextCat = tracks[i];
      
      setSelections(prev => {
        // If it's already fetching or loaded, skip
        if (prev[nextCat.id]) return prev;
        
        // If it has pre-loaded items, skip
        if (nextCat.items && nextCat.items.length > 0) return prev;
        // Initiate the fetch for this category
        postJson<CategoryProductsResponse>("/concierge/category-products/", {
          search_queries: nextCat.search_queries || [nextCat.title],
          category_title: nextCat.title,
          preferences: prefs,
          goal,
          merchant_domain: nextCat.merchant_domain || "general",
        }).then((resp) => {
          setSelections(currentPrev => ({
            ...currentPrev,
            [nextCat.id]: {
              categoryId: nextCat.id,
              categoryTitle: nextCat.title,
              categoryIcon: nextCat.icon,
              selectedItems: [],
              aiPickIndex: resp.ai_pick_index,
              aiPickReason: resp.ai_pick_reason,
              products: resp.items,
            }
          }));
        }).catch(e => console.error("Prefetch failed for", nextCat.title, e));

        // Return the skeleton placeholder so it doesn't trigger again
        return {
          ...prev,
          [nextCat.id]: {
            categoryId: nextCat.id, categoryTitle: nextCat.title, categoryIcon: nextCat.icon,
            selectedItems: [], aiPickIndex: -1, aiPickReason: "", products: []
          }
        };
      });
    }
  }, [activeCatIndex, tracks, answers, goal]);

  const handleNextCategory = () => {
    // Save current selection
    if (activeCat) {
      let sel = selectedItems;
      if (sel.length === 0 && aiPickIndex >= 0 && aiPickIndex < categoryProducts.length) {
        sel = [categoryProducts[aiPickIndex]];
      }
      setSelections(prev => ({
        ...prev,
        [activeCat.id]: {
          categoryId: activeCat.id,
          categoryTitle: activeCat.title,
          categoryIcon: activeCat.icon,
          selectedItems: sel,
          aiPickIndex,
          aiPickReason,
          products: categoryProducts,
        }
      }));
    }

    if (activeCatIndex + 1 >= totalCategories) {
      setAllDone(true);
    } else {
      setActiveCatIndex(i => i + 1);
    }
  };

  const handleGoToCategory = (index: number) => {
    // Save current before switching
    if (activeCat && categoryProducts.length > 0) {
      let sel = selectedItems;
      if (sel.length === 0 && aiPickIndex >= 0 && aiPickIndex < categoryProducts.length) {
        sel = [categoryProducts[aiPickIndex]];
      }
      setSelections(prev => ({
        ...prev,
        [activeCat.id]: {
          categoryId: activeCat.id,
          categoryTitle: activeCat.title,
          categoryIcon: activeCat.icon,
          selectedItems: sel,
          aiPickIndex,
          aiPickReason,
          products: categoryProducts,
        }
      }));
    }
    setAllDone(false);
    setActiveCatIndex(index);
  };

  const handleCheckout = () => {
    setOrderPlaced(true);
    setShowSuccessOverlay(true);
  };

  const visibleStack = categoryProducts.slice(currentSwipeIndex, currentSwipeIndex + 3);
  const categoryProgress = Math.round((currentSwipeIndex / (categoryProducts.length || 1)) * 100);

  const prevCartLength = useRef(cart.length);
  const [cartPing, setCartPing] = useState(false);

  useEffect(() => {
    if (cart.length > prevCartLength.current) {
      setCartPing(true);
      setTimeout(() => setCartPing(false), 500);
    }
    prevCartLength.current = cart.length;
  }, [cart.length]);


  // ΓöÇΓöÇΓöÇ All Done View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (allDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-12 text-center">
        <AnimatePresence>
          {showSuccessOverlay && (
            <PravaPaymentSuccessOverlay totalAmount={cartTotal} cartItems={cart} onClose={() => setShowSuccessOverlay(false)} />
          )}
        </AnimatePresence>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="inline-flex h-20 w-20 items-center justify-center border-2 border-accent bg-accent/10 mb-6">
            <ShoppingCart className="h-9 w-9 text-accent" />
          </div>
          <h2 className="font-['Oswald'] text-4xl font-bold uppercase tracking-wide text-text">All Categories Done!</h2>
          <p className="mt-3 text-text/60">
            {cart.length} item{cart.length !== 1 ? "s" : ""} selected
            {" ┬╖ "}Total: <span className="text-accent font-bold">{formatINR(cartTotal)}</span>
          </p>
        </motion.div>

        {/* Cart items */}
        <div className="mt-8 w-full max-w-md space-y-3">
          {cart.map((item) => (
            <div key={item.id}
              className="flex items-center gap-3 border border-border-col bg-card-bg p-3 text-left">
              <div className="h-12 w-12 bg-white flex items-center justify-center p-1 border border-border-col/50 shrink-0">
                <img src={item.image} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text">{item.name}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="font-['Space_Mono'] text-xs text-accent">{formatINR(item.price)}</p>
                  <span className="text-[9px] uppercase text-text/40">{item.categoryTitle}</span>
                </div>
              </div>
              <button type="button" onClick={() => handleGoToCategory(tracks.findIndex(t => t.id === item.categoryId))}
                className="text-[9px] font-['Space_Mono'] text-accent/70 hover:text-accent uppercase font-bold shrink-0">
                Change
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 max-w-xs mx-auto w-full">
          {cart.length > 0 && (
            <button type="button" onClick={handleCheckout}
              className="w-full bg-accent py-4 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-bg">
              {orderPlaced ? "Order Confirmed Γ£ô" : "Checkout ΓåÆ"}
            </button>
          )}
          <button type="button" onClick={onReset}
            className="flex w-full items-center justify-center gap-2 border border-border-col bg-card-bg py-3 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-text/60 hover:border-accent hover:text-accent">
            <RotateCcw className="h-4 w-4" /> New Goal
          </button>
        </div>
      </div>
    );
  }

  // ΓöÇΓöÇΓöÇ Main Swipe View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  return (
    <div className="flex h-screen w-full bg-bg text-text relative overflow-hidden">
      <AnimatePresence>
        {showSuccessOverlay && (
          <PravaPaymentSuccessOverlay totalAmount={cartTotal} cartItems={cart} onClose={() => setShowSuccessOverlay(false)} />
        )}
      </AnimatePresence>

      {/* Left sidebar ΓÇö Cart + Category Nav */}
      <motion.div 
        animate={cartPing ? { scale: [1, 1.05, 1], borderColor: ["var(--theme-border)", "var(--theme-accent)", "var(--theme-border)"] } : {}}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-80 border-r border-border-col bg-card-bg flex flex-col h-full shrink-0 origin-left"
      >
        <div className={cx(
          "flex items-center justify-between border-b px-5 py-4 transition-colors duration-300",
          cartPing ? "border-accent bg-accent/10" : "border-border-col"
        )}>
          <span className="font-['Oswald'] text-xl font-bold uppercase tracking-wide">Your Cart</span>
          {mode === "ai" && (
            <div className="flex items-center gap-1.5 border border-accent/30 bg-accent/10 px-2 py-1">
              <Zap className="h-3 w-3 text-accent" />
              <span className="font-['Space_Mono'] text-[9px] font-bold uppercase tracking-widest text-accent">AI Mode</span>
            </div>
          )}
        </div>

        {/* Category navigation */}
        <div className="border-b border-border-col px-4 py-3">
          <span className="font-['Space_Mono'] text-[9px] font-bold uppercase tracking-widest text-text/40 mb-2 block">Categories</span>
          <div className="space-y-1.5">
            {tracks.map((cat, idx) => {
              const sel = selections[cat.id];
              const isActive = idx === activeCatIndex;
              const hasSelection = sel?.selectedItems && sel.selectedItems.length > 0;
              return (
                <button key={cat.id} type="button" onClick={() => handleGoToCategory(idx)}
                  className={cx(
                    "flex items-center gap-2 w-full px-3 py-2 text-left text-xs transition-all",
                    isActive ? "border border-accent bg-accent/10 text-accent" : "border border-transparent hover:border-border-col text-text/60 hover:text-text",
                  )}>
                  <span className="text-base">{cat.icon}</span>
                  <span className="flex-1 truncate font-bold">{cat.title}</span>
                  {hasSelection && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-sm text-text/40 text-center mt-10">No items selected yet</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border border-border-col bg-bg p-2.5">
                <div className="h-10 w-10 bg-white flex items-center justify-center p-1 border border-border-col/50 shrink-0">
                  <img src={item.image} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-text">{item.name}</p>
                  <p className="font-['Space_Mono'] text-[10px] text-accent">{formatINR(item.price)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart total */}
        {cart.length > 0 && (
          <div className="border-t border-border-col p-4 shrink-0">
            <div className="flex justify-between mb-3">
              <span className="text-sm text-text/60">Total ({cart.length} items)</span>
              <span className="font-['Space_Mono'] font-bold text-accent">{formatINR(cartTotal)}</span>
            </div>
            {mode === "ai" && (
              <div className="flex justify-between mb-3 text-xs">
                <span className="text-text/40">Budget</span>
                <span className={cx("font-['Space_Mono'] font-bold", cartTotal > aiBudget ? "text-rose-400" : "text-emerald-400")}>
                  {formatINR(aiBudget)}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Right side ΓÇö swiping area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative" id="swipe-main-scroll">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border-col bg-card-bg px-5 py-3">
          <div className="mx-auto flex w-full items-center justify-between">
            <button type="button" onClick={onReset} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center border border-border-col bg-accent font-bold text-bg text-sm">Q</span>
              <span className="font-['Oswald'] text-lg font-bold uppercase tracking-wider">QuikSwipe</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="font-['Space_Mono'] text-[10px] text-text/40 hidden sm:block">
                Category {activeCatIndex + 1}/{totalCategories}
              </span>
              {mode === "ai" && (
                <div className="flex items-center gap-1.5 border border-accent/30 bg-accent/10 px-3 py-1.5">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest text-accent">AI Swiping</span>
                </div>
              )}
            </div>
          </div>
          {/* Category progress bar */}
          <div className="mx-auto w-full mt-2 flex gap-1">
            {tracks.map((_, idx) => (
              <div key={idx} className={cx("h-1.5 flex-1 transition-all duration-300",
                idx < activeCatIndex ? "bg-accent" : idx === activeCatIndex ? "bg-accent/50" : "bg-border-col"
              )} />
            ))}
          </div>
        </header>

        {/* Category label */}
        <div className="border-b border-accent/20 bg-accent/8 px-5 py-4">
          <div className="mx-auto w-full flex items-center gap-3">
            <span className="text-2xl">{activeCat?.icon}</span>
            <div>
              <h2 className="font-['Oswald'] text-xl font-bold uppercase tracking-wide text-text">
                {activeCat?.title}
              </h2>
              <p className="text-xs text-text/50 mt-0.5">
                <span className="text-accent font-bold">Category {activeCatIndex + 1}/{totalCategories}</span>
                {" ┬╖ "}{activeCat?.desc}
              </p>
            </div>
          </div>
          {/* Product progress within category */}
          {!isLoadingProducts && categoryProducts.length > 0 && (
            <div className="mt-3 h-0.5 w-full bg-border-col">
              <motion.div className="h-full bg-accent" animate={{ width: "100%" }} transition={{ duration: 0.3 }} />
            </div>
          )}
        </div>

        {/* Main content */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          {isLoadingProducts ? (
            <div className="flex flex-col items-center justify-center border border-border-col bg-card-bg p-8 shadow-xl max-w-sm w-full h-[520px]">
              <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
              <h3 className="font-['Oswald'] text-2xl font-bold uppercase text-text tracking-wide text-center">
                Finding {activeCat?.title}
              </h3>
              <p className="font-['Space_Mono'] text-xs text-text/60 mt-2 text-center h-4 overflow-hidden">
                <motion.span 
                  key={loadingMessage} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="block text-accent"
                >
                  {loadingMessage}
                </motion.span>
              </p>
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-border-col bg-card-bg p-8 max-w-sm w-full">
              <X className="h-10 w-10 text-text/30 mb-4" />
              <h3 className="font-['Oswald'] text-xl font-bold uppercase text-text">No Products Found</h3>
              <p className="text-sm text-text/50 mt-2 text-center">No live products found for "{activeCat?.title}"</p>
              <button type="button" onClick={handleNextCategory}
                className="mt-6 bg-accent px-6 py-3 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-bg">
                Skip to Next Category ΓåÆ
              </button>
            </div>
          ) : (
            /* Grid layout */
            <div className="w-full max-w-4xl flex flex-col gap-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categoryProducts.map((item, idx) => (
                  <ErrorBoundary key={item.id}>
                    <CategoryGridCard
                      item={item}
                      isAIPick={idx === aiPickIndex}
                      aiPickReason={aiPickReason}
                      isSelected={selectedItems.some(i => i.id === item.id)}
                      categoryTitle={activeCat?.title}
                      categoryProducts={categoryProducts}
                      onSelect={() => {
                        if (selectedItems.some(i => i.id === item.id)) {
                          setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                        } else {
                          setSelectedItems([...selectedItems, item]);
                        }
                      }}
                    />
                  </ErrorBoundary>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border-col pt-6">
                <p className="text-sm text-text/50">
                  {selectedItems.length > 0 ? `${selectedItems.length} product(s) selected.` : "Select products to continue."}
                </p>
                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={handleNextCategory}
                  className="bg-accent px-8 py-3 font-['Space_Mono'] text-sm font-bold uppercase tracking-widest text-bg disabled:opacity-50 transition-opacity"
                >
                  {activeCatIndex + 1 >= totalCategories ? "Review Cart ΓåÆ" : "Next Category ΓåÆ"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Product Swipe View (Orchestrator) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function ProductSwipeView({
  tracks, goal, summary, answers, onReset, bridge,
}: {
  tracks: CategoryTrack[]; goal: string; summary: string; answers?: Answers; onReset: () => void; bridge?: PlannerBridge;
}) {
  const [mode, setMode] = useState<SwipeMode>(null);
  const [budget, setBudget] = useState<number>(50000);
  const [voiceSelectedMode, setVoiceSelectedMode] = useState<"manual" | "ai" | null>(null);
  const hasItems = tracks.length > 0;

  const handleSelectMode = (selectedMode: "manual" | "ai", selectedBudget?: number) => {
    if (selectedBudget) setBudget(selectedBudget);
    setMode(selectedMode);
  };

  useEffect(() => {
    if (bridge) {
      bridge["deps"].handleModeSelect = (selectedMode) => {
        setVoiceSelectedMode(selectedMode);
        setTimeout(() => {
          handleSelectMode(selectedMode);
        }, 1200); // 1.2 second delay for visual feedback and speech
      };
    }
  }, [bridge]);

  if (!mode) {
    return <ModeSelectionScreen summary={summary} onSelect={handleSelectMode} hasItems={hasItems} onReset={onReset} voiceSelectedMode={voiceSelectedMode} />;
  }

  return <CategorySwipeScreen tracks={tracks} goal={goal} answers={answers} onReset={onReset} mode={mode} initialBudget={budget} bridge={bridge} />;
}

