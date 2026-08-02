import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PravaSettingsPage.css";

const SETTINGS_KEY = "autocart-prava-settings";

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export default function PravaSettingsPage() {
  const navigate = useNavigate();
  const saved = readSettings();
  const [address, setAddress] = useState(saved.address || "");
  const [city, setCity] = useState(saved.city || "");
  const [state, setState] = useState(saved.state || "");
  const [postalCode, setPostalCode] = useState(saved.postalCode || "");
  const [budget, setBudget] = useState(saved.budget || "");
  const [message, setMessage] = useState("");
  const cardEnrolled = localStorage.getItem("prava-card-enrolled") === "true";

  const saveSettings = (event) => {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ address, city, state, postalCode, budget }));
    setMessage("Payment preferences saved on this device.");
  };

  const clearCardStatus = () => {
    localStorage.removeItem("prava-card-enrolled");
    setMessage("Saved-card status cleared. Prava will ask for a card during the next checkout.");
    window.location.reload();
  };

  return (
    <main className="prava-settings-page">
      <div className="prava-settings-heading">
        <div>
          <span className="route-eyebrow">AutoCart × Prava</span>
          <h1>Payment settings</h1>
          <p>Prava collects and protects your card. AutoCart stores only these checkout preferences.</p>
        </div>
        <button type="button" className="prava-settings-back" onClick={() => navigate("/shop/cart")}>Back to cart</button>
      </div>

      <form className="prava-settings-grid" onSubmit={saveSettings}>
        <section className="prava-settings-card">
          <span className="route-eyebrow">Delivery</span>
          <h2>Saved address</h2>
          <label>Address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street and house number" /></label>
          <div className="prava-settings-row"><label>City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" /></label><label>State<input value={state} onChange={(event) => setState(event.target.value)} placeholder="State" /></label></div>
          <label>Postal code<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="Postal code" inputMode="numeric" /></label>
        </section>

        <section className="prava-settings-card">
          <span className="route-eyebrow">Guardrail</span>
          <h2>Purchase budget</h2>
          <label>Maximum per checkout<input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="₹ 5,000" inputMode="numeric" /></label>
          <p className="prava-settings-help">AutoCart will stop before creating Prava merchant sessions when an order exceeds this limit.</p>
          <div className="prava-card-status"><span className={cardEnrolled ? "prava-status-dot prava-status-dot--active" : "prava-status-dot"} />{cardEnrolled ? "Prava card enrolled" : "No saved card detected"}</div>
          <p className="prava-settings-help">Card numbers, expiry, CVV, tokens, and last four digits are never stored by AutoCart.</p>
          {cardEnrolled && <button type="button" className="prava-link-button" onClick={clearCardStatus}>Use a different card next time</button>}
        </section>

        <div className="prava-settings-actions"><button type="submit" className="prava-settings-save">Save settings</button>{message && <span role="status">{message}</span>}</div>
      </form>
    </main>
  );
}
