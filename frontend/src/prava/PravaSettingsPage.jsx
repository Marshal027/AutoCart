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
  const [budget, setBudget] = useState(saved.budget || "");
  const [message, setMessage] = useState("");

  const saveSettings = (event) => {
    event.preventDefault();
    const parsedBudget = Number(budget);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setMessage("Enter a maximum checkout budget greater than ₹0.");
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ budget: parsedBudget }));
    setMessage("Payment preferences saved on this device.");
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
          <span className="route-eyebrow">Guardrail</span>
          <h2>Purchase budget</h2>
          <label>Maximum per checkout<input type="number" min="1" step="1" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="₹ 5,000" inputMode="numeric" required /></label>
          <p className="prava-settings-help">AutoCart will stop before creating Prava merchant sessions when an order exceeds this limit.</p>
          <p className="prava-settings-help">Prava stores the card securely. AutoCart never receives card numbers, expiry, CVV, tokens, or last four digits.</p>
        </section>

        <div className="prava-settings-actions"><button type="submit" className="prava-settings-save">Save settings</button>{message && <span role="status">{message}</span>}</div>
      </form>
    </main>
  );
}
