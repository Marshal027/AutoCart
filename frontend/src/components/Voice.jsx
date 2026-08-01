import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SpeechRecognitionAPI =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export default function Voice() {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "agent",
      text: 'Say something like "buy me 1kg sugar" or "get me a blue t-shirt."',
    },
  ]);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(null);
  const recognitionRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      handleUtterance(text);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".voice-label", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from(".voice-heading", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.1,
      });
      gsap.from(".voice-layout", {
        scrollTrigger: { trigger: ".voice-layout", start: "top 85%" },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  function addMessage(from, text) {
    setMessages((m) => [...m, { from, text }]);
  }

  async function handleUtterance(text) {
    addMessage("user", text);

    const affirmative = /\b(yes|yeah|yep|buy it|confirm|go ahead)\b/i.test(
      text
    );
    const negative = /\b(no|nope|cancel|don'?t)\b/i.test(text);

    if (pending) {
      if (affirmative) {
        try {
          const result = await api.buyNow(pending.product.id);
          const reply = `Bought ${result.product.name} from ${result.product.merchant} for ₹${result.price}. It's in your trust ledger.`;
          addMessage("agent", reply);
          speak(reply);
        } catch (e) {
          addMessage("agent", "Something went wrong placing that order.");
        }
        setPending(null);
        return;
      }
      if (negative) {
        addMessage("agent", "Okay, not buying it.");
        speak("Okay, not buying it.");
        setPending(null);
        return;
      }
    }

    try {
      const { matched, product } = await api.matchVoice(text);
      if (!matched) {
        const reply =
          "I couldn't find that item in the catalog yet. Try sugar, a t-shirt, earbuds, moisturizer, or dog food.";
        addMessage("agent", reply);
        speak(reply);
        return;
      }
      const reply = `${product.name} is available from ${product.merchant} for ₹${product.basePrice}. Shall I buy it?`;
      addMessage("agent", reply);
      speak(reply);
      setPending({ product });
    } catch (e) {
      addMessage(
        "agent",
        "The backend isn't reachable right now — run the API with npm run dev inside /backend."
      );
    }
  }

  function toggleListen() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setListening(true);
      recognitionRef.current.start();
    }
  }

  function submitTyped(e) {
    e.preventDefault();
    if (!typed.trim()) return;
    handleUtterance(typed.trim());
    setTyped("");
  }

  return (
    <section className="section" id="voice" ref={sectionRef}>
      <hr className="section-divider" />
      <div className="wrap" style={{ paddingTop: 160 }}>
        <div className="section-label voice-label">Voice-to-voice</div>
        <h2 className="section-heading voice-heading">
          Say what you want.
          <br />
          <em>Confirm</em> out loud.
        </h2>
        <p className="section-desc">
          Uses your browser's built-in speech recognition and synthesis — no
          server round-trip for audio. In production, swap the keyword matcher
          for an OpenAI structured-output call.
        </p>

        <div className="voice-layout">
          <div className="voice-mic-area">
            <button
              className={`mic-btn ${listening ? "listening" : ""}`}
              onClick={toggleListen}
              disabled={!SpeechRecognitionAPI}
            >
              {listening ? "●" : "🎙"}
            </button>
            <div className="mic-caption">
              {SpeechRecognitionAPI
                ? listening
                  ? "Listening — speak now"
                  : "Tap to talk"
                : "Speech recognition not supported — use the text box."}
            </div>
          </div>

          <div className="voice-chat-area">
            <div className="voice-messages">
              {messages.map((m, i) => (
                <div
                  className={`bubble ${m.from === "user" ? "user" : "agent"}`}
                  key={i}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <form className="voice-input-row" onSubmit={submitTyped}>
              <input
                type="text"
                placeholder='"buy me a black t-shirt"'
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
