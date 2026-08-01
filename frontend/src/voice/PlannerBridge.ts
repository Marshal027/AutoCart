import { VoiceManager } from "./VoiceManager";

export interface PlannerBridgeDeps {
  handleStart: (goal: string) => Promise<void>;
  handleAnswer: (answer: string) => Promise<void>;
  handleNext?: () => void;
  handlePrev?: () => void;
  handleSelect?: () => void;
  handleCheckout?: () => void;
  handleModeSelect?: (mode: "ai" | "manual") => void;
  
  // Expose current state context dynamically
  getCurrentStep: () => "home" | "questions" | "swiping" | "checkout";
  
  onLiveTranscript?: (text: string) => void;
}

export class PlannerBridge {
  private vm: VoiceManager;
  private deps: PlannerBridgeDeps;

  constructor(deps: PlannerBridgeDeps) {
    this.deps = deps;
    this.vm = new VoiceManager({
      mode: "ptt",
      onStateChange: (state) => this.onStateChange(state),
      onTranscript: (text, final) => {
        this.onTranscript(text, final);
        this.deps.onLiveTranscript?.(text);
      },
      onAIResponse: (text) => this.onAIResponse(text),
      onCommand: async (cmd) => await this.handleVoiceCommand(cmd)
    });
  }

  // --- Handlers for React to attach to ---
  public onStateChange: (s: string) => void = () => {};
  public onTranscript: (t: string, f: boolean) => void = () => {};
  public onAIResponse: (t: string) => void = () => {};

  public init() {
    this.vm.init();
  }
  
  public setMode(mode: "continuous" | "ptt") {
    this.vm.setMode(mode);
  }

  public startPTT() {
    this.vm.startActiveListening();
  }
  
  public stopPTT() {
    this.vm.stopActiveListening();
  }

  public destroy() {
    this.vm.destroy();
  }

  // Hook to be called by App.tsx when AI gives a text response (e.g. from analysis or finalize)
  public speakAIResponse(text: string, expectsFollowUp: boolean) {
    // Strip markdown bolding and formatting for cleaner speech synthesis
    const cleanText = text.replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();
    if (!cleanText) return;
    this.vm.speak(cleanText, expectsFollowUp);
  }

  // Process the spoken command
  private async handleVoiceCommand(command: string) {
    const cmdLower = command.toLowerCase().trim();
    const currentStep = this.deps.getCurrentStep();
    console.log("[PlannerBridge] Received command:", command);
    console.log("[PlannerBridge] Current step:", currentStep);
    
    // 1. Navigation / UI Commands (Local Intent Router)
    if (currentStep === "swiping") {
      if (cmdLower.includes("next") || cmdLower.includes("skip")) {
        this.deps.handleNext?.();
        this.vm.speak("Okay, next.");
        return;
      }
      if (cmdLower.includes("previous") || cmdLower.includes("go back")) {
        this.deps.handlePrev?.();
        this.vm.speak("Going back.");
        return;
      }
      if (cmdLower.includes("select") || cmdLower.includes("add to cart") || cmdLower.includes("yes")) {
        this.deps.handleSelect?.();
        this.vm.speak("Added to your cart.", false);
        return;
      }
      if (cmdLower.includes("checkout") || cmdLower.includes("pay")) {
        this.deps.handleCheckout?.();
        this.vm.speak("Opening checkout.", false);
        return;
      }
      if (cmdLower.includes("ai") || cmdLower.includes("pick") || cmdLower.includes("choose") || cmdLower.includes("a.i.")) {
        this.deps.handleModeSelect?.("ai");
        this.vm.speak("I'll pick the best products for you.", false);
        return;
      }
      if (cmdLower.includes("manual") || cmdLower.includes("swipe") || cmdLower.includes("i will")) {
        this.deps.handleModeSelect?.("manual");
        this.vm.speak("Swiping mode activated.", false);
        return;
      }
    }

    // 2. Answering Follow-up Questions
    if (currentStep === "questions") {
      console.log("[PlannerBridge] Executing follow up as handleAnswer...");
      try {
        await this.deps.handleAnswer(command);
      } finally {
        if (this.vm.getState() === "thinking") {
           this.vm.speak("Moving to the next question.", false);
        }
      }
      return;
    }

    // 3. Main New Request (e.g. "Order me a pizza")
    // Trigger the global planner search
    console.log("[PlannerBridge] Executing main search via handleStart:", command);
    try {
      await this.deps.handleStart(command);
    } finally {
      // If the backend threw an error without calling speakAIResponse, we must reset the state
      if (this.vm.getState() === "thinking") {
        this.vm.speak("I'm sorry, I couldn't process that request right now.", false);
      }
    }
  }
}
