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

  callbacksRef.current = { onReady, onSuccess, onError };

  useEffect(() => {
    if (!containerRef.current || hasStarted.current) return undefined;
    hasStarted.current = true;

    if (!PUBLISHABLE_KEY) {
      const message = "VITE_PRAVA_PUBLISHABLE_KEY is missing from the frontend environment.";
      setStatus(message);
      callbacksRef.current.onError?.(message);
      hasStarted.current = false;
      return undefined;
    }

    let cancelled = false;
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
        callbacksRef.current.onError?.(message);
      },
    }).catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : "Prava secure verification failed.";
      setStatus(message);
      callbacksRef.current.onError?.(message);
    });

    return () => {
      cancelled = true;
      sdkRef.current?.destroy();
      sdkRef.current = null;
      hasStarted.current = false;
    };
  }, [session.session_id, session.session_token, session.iframe_url]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 10 }}>{status}</div>
      <div
        ref={containerRef}
        style={{ minHeight: 430, width: "100%", overflow: "hidden", borderRadius: 12, background: "#fff" }}
      />
    </div>
  );
}
