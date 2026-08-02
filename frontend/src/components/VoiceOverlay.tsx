import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { PlannerBridge } from "../voice/PlannerBridge";

export function VoiceOverlay({ bridge }: { bridge: PlannerBridge }) {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [mode, setMode] = useState<"ptt">("ptt");

  useEffect(() => {
    // Attach UI callbacks to the bridge
    bridge.onStateChange = (state: any) => setVoiceState(state);
    bridge.onTranscript = (text: string, isFinal: boolean) => {
      setTranscript(text);
      if (isFinal) {
         // Auto-clear transcript after 4 seconds of idle
         setTimeout(() => setTranscript(""), 4000);
      }
    };
    bridge.onAIResponse = (text: string) => {
      setAiText(text);
    };

    return () => {
      bridge.onStateChange = () => {};
      bridge.onTranscript = () => {};
      bridge.onAIResponse = () => {};
    };
  }, [bridge]);

  const handleMicClick = () => {
    if (!isOpen) {
      bridge.init();
      bridge.setMode("ptt");
      bridge.startPTT();
      setIsOpen(true);
    } else {
      if (voiceState === "idle") {
        bridge.startPTT();
      } else if (voiceState === "listening") {
        bridge.stopPTT();
      } else if (voiceState === "speaking") {
        // We can't stop speaking easily without adding a bridge method, but we can stop PTT
        bridge.stopPTT();
      }
    }
  };

  const handleClose = () => {
    bridge.stopPTT();
    setIsOpen(false);
  };

  // Waveform dots
  const renderWaveform = () => (
    <div className="flex items-center gap-1 h-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={{
            height: voiceState === "speaking" || voiceState === "listening" 
              ? ["20%", "100%", "20%"] 
              : "20%"
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
          className={`w-1 rounded-full ${voiceState === 'listening' ? 'bg-red-400' : 'bg-accent'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      
      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="pointer-events-auto w-80 rounded-2xl border border-border-col/50 bg-black/60 p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-colors duration-500 
              ${voiceState === 'listening' ? 'bg-red-500' : 
                voiceState === 'thinking' ? 'bg-purple-500' : 
                voiceState === 'speaking' ? 'bg-accent' : 'bg-white/10'}`} 
            />

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-['Oswald'] text-sm tracking-widest uppercase text-text/80">Voice Assistant</span>
              </div>
              <button onClick={handleClose} className="text-text/40 hover:text-text transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-3 h-8 mb-4">
              {voiceState === 'idle' && <span className="text-xs text-text/50 font-['Space_Mono'] tracking-widest uppercase">Ready • Tap Mic to Speak</span>}
              {voiceState === 'listening' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400 font-['Space_Mono'] font-bold tracking-widest uppercase">Listening</span>
                  {renderWaveform()}
                </>
              )}
              {voiceState === 'thinking' && (
                <>
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-xs text-purple-400 font-['Space_Mono'] font-bold tracking-widest uppercase">Thinking</span>
                </>
              )}
              {voiceState === 'speaking' && (
                <>
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <span className="text-xs text-accent font-['Space_Mono'] font-bold tracking-widest uppercase">Speaking</span>
                  {renderWaveform()}
                </>
              )}
            </div>

            {/* Transcript & AI Response Area */}
            <div className="space-y-3 min-h-[60px]">
              <AnimatePresence mode="popLayout">
                {transcript && (
                  <motion.div
                    key="transcript"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm text-text/90 italic border-l-2 border-red-500/50 pl-2"
                  >
                    "{transcript}"
                  </motion.div>
                )}
                {aiText && voiceState !== 'idle' && (
                  <motion.div
                    key="aitext"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium text-accent border-l-2 border-accent/50 pl-2 mt-2"
                  >
                    {aiText}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="mt-4 pt-4 border-t border-border-col/30 flex justify-center items-center">
              <span className="text-[10px] font-['Space_Mono'] uppercase tracking-widest text-text/40">
                {voiceState === 'listening' ? 'Listening...' : 'Tap Mic to Send'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Mic Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleMicClick}
        className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-colors duration-300
          ${isOpen 
            ? voiceState === 'listening' ? 'bg-red-500/20 border border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            : voiceState === 'speaking' ? 'bg-accent/20 border border-accent text-accent shadow-[0_0_20px_var(--theme-accent)]'
            : 'bg-black border border-border-col text-text hover:border-accent'
            : 'bg-accent text-bg hover:bg-accent/90 shadow-[0_0_15px_var(--theme-accent)]'
          }`}
      >
        <div className="relative">
          {isOpen && voiceState === 'listening' ? <Mic className="h-6 w-6" /> : isOpen ? <Mic className="h-6 w-6 text-text/50" /> : <MicOff className="h-6 w-6" />}
          {isOpen && voiceState === 'listening' && (
            <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-50" />
          )}
        </div>
      </motion.button>
    </div>
  );
}
