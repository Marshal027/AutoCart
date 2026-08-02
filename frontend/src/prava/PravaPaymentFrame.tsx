import type { PravaSessionGroup } from "./api";

type PravaPaymentFrameProps = {
  session: PravaSessionGroup;
};

export default function PravaPaymentFrame({ session }: PravaPaymentFrameProps) {
  return (
    <div className="prava-payment-frame">
      <div className="prava-payment-frame-status">Secure Prava checkout is ready.</div>
      {session.iframe_url ? (
        <a
          className="prava-hosted-checkout-button"
          href={session.iframe_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open secure Prava checkout ↗
        </a>
      ) : (
        <div className="prava-payment-frame-status">Prava did not return a checkout URL.</div>
      )}
      <p className="prava-hosted-checkout-note">
        Complete card entry and passkey approval in Prava&apos;s secure page. This window will update when the merchant payment finishes.
      </p>
    </div>
  );
}
