import { WebSpeechEngine } from "./engine";
import type { ISpeechEngine, TranscriptionResult } from "./engine";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";
export type VoiceMode = "continuous" | "ptt"; // ptt = Push-to-Talk

export interface VoiceManagerOptions {
  onStateChange: (state: VoiceState) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onAIResponse: (text: string) => void;
  onCommand: (command: string) => Promise<void>;
  mode?: VoiceMode;
}

export class VoiceManager {
  private engine: ISpeechEngine;
  private state: VoiceState = "idle";
  private mode: VoiceMode;
  
  // Callbacks
  private onStateChange: (state: VoiceState) => void;
  private onTranscript: (text: string, isFinal: boolean) => void;
  private onAIResponse: (text: string) => void;
  private onCommand: (command: string) => Promise<void>;
  
  // State
  private expectsFollowUp = false;
  private currentTranscript = "";
  private wakePhrase = "hey quikswipe";
  
  // Latency metrics
  private lastInputTime = 0;
  private lastThinkingStartTime = 0;
  private silenceTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: VoiceManagerOptions) {
    this.onStateChange = options.onStateChange;
    this.onTranscript = options.onTranscript;
    this.onAIResponse = options.onAIResponse;
    this.onCommand = options.onCommand;
    this.mode = options.mode || "continuous";
    
    this.engine = new WebSpeechEngine();
  }

  init() {
    this.engine.init();
    if (this.mode === "continuous") {
      this.startBackgroundListening();
    }
  }
  
  setMode(mode: VoiceMode) {
    this.mode = mode;
    if (mode === "continuous" && this.state === "idle") {
      this.startBackgroundListening();
    } else if (mode === "ptt" && this.state === "idle") {
      this.engine.stopListening();
    }
  }

  private setState(newState: VoiceState) {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange(newState);
  }

  public getState(): VoiceState {
    return this.state;
  }

  private startBackgroundListening() {
    this.setState("idle");
    this.engine.startListening(
      this.handleTranscription.bind(this),
      (err) => console.error("Voice Error:", err)
    );
  }

  // Used for Push-to-Talk
  public startActiveListening() {
    this.expectsFollowUp = true; // Force active context
    this.engine.startListening(
      this.handleTranscription.bind(this),
      (err) => {
        console.error("Voice Error:", err);
        if (this.state === "listening") {
          this.setState("idle");
          this.onTranscript("", false);
        }
      }
    );
    this.setState("listening");
    this.onAIResponse(""); // Clear previous AI text when starting a new command
    this.onTranscript("Listening...", false);
  }

  public stopActiveListening() {
    if (this.mode === "ptt") {
      this.engine.stopListening();
      
      if (this.state === "listening" && this.currentTranscript.trim().length > 0) {
        this.lastInputTime = Date.now();
        this.executeCommand(this.currentTranscript);
      } else {
        this.setState("idle");
        this.onTranscript("", false);
      }
    }
  }

  private handleTranscription(res: TranscriptionResult) {
    const textLower = res.text.toLowerCase();
    
    // 1. Interrupt Handling
    if (this.state === "speaking") {
      const interruptWords = ["stop", "cancel", "shut up"];
      if (interruptWords.some(w => textLower.includes(w))) {
        console.log("[Voice] User interrupted AI speech.");
        this.engine.stopSpeaking();
        this.setState("idle");
        this.expectsFollowUp = false;
        return;
      }
    }

    let commandText = res.text;
    
    // 2. Command Capture (No Wake Word Required)
    if (this.state === "listening" || this.state === "idle") {
      if (this.state === "idle" && commandText.trim().length > 0) {
         this.setState("listening");
      }
      
      this.currentTranscript = commandText;
      this.onTranscript(commandText, res.isFinal);
      
      if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
      
      if (res.isFinal && commandText.trim().length > 0) {
        this.lastInputTime = Date.now();
        this.executeCommand(commandText);
      } else if (commandText.trim().length > 0) {
        // Debounce: If they stop talking for 2 seconds but isFinal never fired
        this.silenceTimeout = setTimeout(() => {
          if (this.state === "listening" && this.currentTranscript === commandText) {
            this.lastInputTime = Date.now();
            this.executeCommand(commandText);
          }
        }, 2000);
      }
    }
  }

  private async executeCommand(command: string) {
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
    this.setState("thinking");
    this.engine.stopListening(); // Pause listening while thinking
    this.currentTranscript = "";
    
    this.lastThinkingStartTime = Date.now();
    const recognitionLatency = this.lastThinkingStartTime - this.lastInputTime;
    console.log(`[Latency] Recognition: ${recognitionLatency}ms`);

    try {
      await this.onCommand(command);
    } catch (e) {
      console.error(e);
      this.speak("Sorry, I ran into an error.");
    }
  }

  // To be called by PlannerBridge when the backend returns a response
  public speak(text: string, expectsFollowUp: boolean = false) {
    const planningLatency = Date.now() - this.lastThinkingStartTime;
    console.log(`[Latency] Planning: ${planningLatency}ms`);
    
    this.expectsFollowUp = expectsFollowUp;
    this.onAIResponse(text);
    
    const speechStartTime = Date.now();
    
    this.setState("speaking");
    this.engine.speak(text, 
      () => {
         const speechLatency = Date.now() - speechStartTime;
         console.log(`[Latency] Speech synthesis startup: ${speechLatency}ms`);
         console.log(`[Latency] End-to-End: ${planningLatency + speechLatency + (this.lastThinkingStartTime - this.lastInputTime)}ms`);
      },
      () => {
        // When speech finishes
        if (this.expectsFollowUp) {
          this.startActiveListening();
        } else if (this.mode === "continuous") {
          this.startBackgroundListening();
        } else {
          this.setState("idle");
        }
      }
    );
  }

  private playWakeSound() {
    try {
      // Small 0.1s oscillator ding
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }
  
  public destroy() {
    this.engine.destroy();
  }
}
