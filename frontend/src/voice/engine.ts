export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface ISpeechEngine {
  init(): void;
  startListening(onResult: (res: TranscriptionResult) => void, onError: (err: any) => void): void;
  stopListening(): void;
  speak(text: string, onStart?: () => void, onEnd?: () => void): void;
  stopSpeaking(): void;
  destroy(): void;
}

export class WebSpeechEngine implements ISpeechEngine {
  private recognition: any = null;
  private synth: SpeechSynthesis = window.speechSynthesis;
  private isListening = false;
  private _onResult: ((res: TranscriptionResult) => void) | null = null;
  private _onError: ((err: any) => void) | null = null;
  
  // To handle the auto-stop behavior of Web Speech API
  private shouldKeepListening = false;

  init() {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US"; // Universal English

    this.recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          confidence = event.results[i][0].confidence;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      const isFinal = finalTranscript.length > 0;

      if (this._onResult && text.trim().length > 0) {
        this._onResult({ text: text.trim(), isFinal, confidence });
      }
    };

    this.recognition.onerror = (event: any) => {
      // Ignore 'no-speech' errors as they are expected during silence
      if (event.error === 'no-speech') return;
      if (this._onError) this._onError(event.error);
    };

    this.recognition.onend = () => {
      // Auto-restart if we are supposed to be listening continuously
      if (this.shouldKeepListening && this.recognition) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (e) {
          this.isListening = false;
        }
      } else {
        this.isListening = false;
      }
    };
    
    // Initialize voices
    this.synth.getVoices();
  }

  startListening(onResult: (res: TranscriptionResult) => void, onError: (err: any) => void) {
    if (!this.recognition) return;
    this._onResult = onResult;
    this._onError = onError;
    this.shouldKeepListening = true;
    
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      // If it throws, it's likely already started. We assume it is listening.
      this.isListening = true;
    }
  }

  stopListening() {
    this.shouldKeepListening = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) { }
      this.isListening = false;
    }
  }

  speak(text: string, onStart?: () => void, onEnd?: () => void) {
    if (!this.synth) return;
    
    // Stop any current speech
    this.stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 2. Enumerate all available speechSynthesis voices
    const voices = this.synth.getVoices();
    
    // 6. Log all available voices to the console during development
    if (process.env.NODE_ENV === "development" || true) {
      console.log("[Voice Engine] Available voices:", voices.map(v => `${v.name} (${v.lang})`));
    }
    
    // 3. Automatically select the most natural voice available (Preferred order)
    let selectedVoice = 
      voices.find(v => v.name.includes("Microsoft Aria")) ||
      voices.find(v => v.name.includes("Microsoft Jenny")) ||
      voices.find(v => v.name.includes("Microsoft Sonia")) ||
      voices.find(v => v.name.includes("Google UK English Female")) ||
      voices.find(v => v.name.includes("Google US English")) ||
      voices.find(v => v.name.includes("Neural") && v.lang.startsWith("en")) ||
      voices.find(v => v.lang.startsWith("en") && v.name.includes("Female")) ||
      voices.find(v => v.lang.startsWith("en"));
      
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log("[Voice Engine] Selected voice:", selectedVoice.name);
    }
    
    // 4. Configure natural settings
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.volume = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => {
      // Interrupted speech causes an error which is normal
      if (e.error !== 'interrupted') {
        onEnd?.();
      }
    };

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.recognition = null;
  }
}
