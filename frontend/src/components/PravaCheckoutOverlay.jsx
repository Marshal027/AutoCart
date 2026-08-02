import PravaPaymentFrame from "../prava/PravaPaymentFrame";
import SpecularButton from "./SpecularButton.jsx";

export default function PravaCheckoutOverlay({
  sessions = [],
  activeSessionIndex = 0,
  status,
  orderSuccess,
  paymentFailure,
  onClose,
}) {
  const session = sessions[activeSessionIndex];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-content--full-details checkout-modal-content prava-payment-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close payment">
          ✕
        </button>

        {orderSuccess ? (
          <div className="checkout-success-container">
            <span className="checkout-success-icon">🎉</span>
            <h2 className="checkout-success-title">Order placed successfully</h2>
            <p className="checkout-success-sub">Prava completed payment for all merchant sessions.</p>
            <SpecularButton size="md" className="cta-btn" onClick={onClose}>Done</SpecularButton>
          </div>
        ) : paymentFailure ? (
          <div className="checkout-success-container checkout-failure-container">
            <span className="checkout-success-icon">!</span>
            <h2 className="checkout-success-title">Payment failed</h2>
            <p className="checkout-success-sub">{paymentFailure}</p>
            <SpecularButton size="md" className="cta-btn" onClick={onClose}>Close</SpecularButton>
          </div>
        ) : session ? (
          <div className="modal-details-container prava-payment-details">
            <div className="checkout-header">
              <h2 className="checkout-title">Secure Prava payment</h2>
              <span className="cart-header__badge">{activeSessionIndex + 1} / {sessions.length} merchants</span>
            </div>
            <p className="checkout-section-title prava-payment-status">{status}</p>
            <p className="checkout-address-text">
              Prava securely collects card details on the first payment and lets returning customers choose a saved card. Approve each merchant payment on Prava&apos;s secure page.
            </p>
            {session.iframe_url ? (
              <PravaPaymentFrame session={session} />
            ) : (
              <p className="checkout-address-card">Secure Prava payment details were not returned.</p>
            )}
          </div>
        ) : (
          <div className="checkout-success-container">
            <span className="cta-btn__spinner" />
            <h2 className="checkout-success-title">Preparing secure payment</h2>
            <p className="checkout-success-sub">Creating your merchant payment sessions…</p>
          </div>
        )}
      </div>
    </div>
  );
}
