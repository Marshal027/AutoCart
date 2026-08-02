import { useEffect, useRef, useState } from "react";
import { PravaSDK, type PravaError } from "@prava-sdk/core";
import type { PravaSessionGroup } from "./api";

type PravaPaymentFrameProps = {
  session: PravaSessionGroup;
  onReady?: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

const PUBLISHABLE_KEY = import.meta.env.VITE_PRAVA_PUBLISHABLE_KEY || "";

export default function PravaPaymentFrame({ session, onReady, onSuccess, onError }: PravaPaymentFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<PravaSDK | null>(null);
  const hasStarted = useRef(false);
  const callbacksRef = useRef({ onReady, onSuccess, onError });
  const [status, setStatus] = useState("Loading secure Prava payment...");
  const [sdkError, setSdkError] = useState<string | null>(null);

  callbacksRef.current = { onReady, onSuccess, onError };

  useEffect(() => {
    if (!containerRef.current || hasStarted.current) return undefined;
    hasStarted.current = true;

    if (!PUBLISHABLE_KEY) {
      const message = "VITE_PRAVA_PUBLISHABLE_KEY is missing from the frontend environment.";
      setStatus(message);
      setSdkError(message);
      hasStarted.current = false;
      return undefined;
    }

    let cancelled = false;
    const observer = new MutationObserver(() => {
      const iframe = containerRef.current?.querySelector("iframe");
      if (iframe) {
        iframe.setAttribute("scrolling", "no");
        iframe.style.overflow = "hidden";
      }
    });
    observer.observe(containerRef.current, { childList: true, subtree: true });
    const sdk = new PravaSDK({ publishableKey: PUBLISHABLE_KEY });
    sdkRef.current = sdk;

    sdk.collectPAN({
      sessionToken: session.session_token || "",
      iframeUrl: session.iframe_url || "",
      container: containerRef.current,
      onReady: () => {
        if (cancelled) return;
        setStatus("Secure payment form ready.");
        callbacksRef.current.onReady?.();
      },
      onSuccess: () => {
        if (cancelled) return;
        setStatus("Payment authorization received. Finalizing...");
        callbacksRef.current.onSuccess?.();
      },
      onError: (error: PravaError) => {
        if (cancelled) return;
        const message = error.message || "Prava secure verification failed.";
        setStatus(message);
        setSdkError(message);
      },
    }).catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : "Prava secure verification failed.";
      setStatus(message);
      setSdkError(message);
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      sdkRef.current?.destroy();
      sdkRef.current = null;
      hasStarted.current = false;
    };
  }, [session.session_id, session.session_token, session.iframe_url]);

  return (
    <div className="prava-payment-frame">
      <div className="prava-payment-frame-status">{status}</div>
      {sdkError && session.iframe_url && (
        <button
          type="button"
          onClick={() => window.open(session.iframe_url, "_blank", "noopener,noreferrer")}
          style={{ marginBottom: 12, border: 0, borderRadius: 10, padding: "10px 14px", background: "#17202b", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          Open secure Prava payment
        </button>
      )}
      <div
        ref={containerRef}
        className="prava-payment-frame-container"
      />
    </div>
  );
}
