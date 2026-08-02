import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWatchlist } from "./SwipeScreens";
import { WatchlistPanel } from "./WatchlistPanel";

const CART_STORAGE_KEY = "trigr-shop-cart";
const LINQ_MESSAGE_URL = "http://127.0.0.1:8000/api/linq/send-message/";
const REMINDER_OPTIONS = [
  { label: "30 seconds", value: 30 * 1000 },
  { label: "1 minute", value: 60 * 1000 },
  { label: "5 minutes", value: 5 * 60 * 1000 },
  { label: "24 hours", value: 24 * 60 * 60 * 1000 },
];

function readCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || "[]") || [];
  } catch {
    return [];
  }
}

export default function WatchlistPage() {
  const navigate = useNavigate();
  const watchlistItems = useWatchlist();
  const reminderTimerRef = useRef(null);
  const [reminderDelay, setReminderDelay] = useState(REMINDER_OPTIONS[0].value);
  const [reminderActive, setReminderActive] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  useEffect(() => () => {
    if (reminderTimerRef.current) window.clearInterval(reminderTimerRef.current);
  }, []);

  const applyReminder = () => {
    if (watchlistItems.length === 0) {
      setReminderStatus("Add an item to your watchlist before setting a reminder.");
      return;
    }

    if (reminderTimerRef.current) window.clearInterval(reminderTimerRef.current);
    const selectedOption = REMINDER_OPTIONS.find((option) => option.value === reminderDelay);
    setReminderActive(true);
    setReminderStatus(`Reminder will repeat every ${selectedOption?.label || "selected interval"}.`);

    const sendReminder = async () => {
      const productLines = watchlistItems.map((item) => `- ${item.name} — ₹${item.price ?? "Price unavailable"}`);
      try {
        const response = await fetch(LINQ_MESSAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Your Watch List:\n${productLines.join("\n")}`,
          }),
        });
        if (!response.ok) throw new Error("LINQ notification failed");
        setReminderStatus("Reminder sent to LINQ with your watchlist prices.");
      } catch (error) {
        console.error(error);
        setReminderStatus("Reminder could not be sent.");
      }
    };

    reminderTimerRef.current = window.setInterval(sendReminder, reminderDelay);
  };

  const stopReminder = () => {
    if (reminderTimerRef.current) window.clearInterval(reminderTimerRef.current);
    reminderTimerRef.current = null;
    setReminderActive(false);
    setReminderStatus("Reminder stopped.");
  };

  const addToCart = (id, name, price, quantity = 1, source = "Watchlist", url) => {
    const cart = readCart();
    const existing = cart.find((item) => String(item.id) === String(id));
    const next = existing
      ? cart.map((item) => String(item.id) === String(id) ? { ...item, quantity: item.quantity + quantity } : item)
      : [...cart, { id, name, price, quantity, source, url }];
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <main className="shop-route-page watchlist-page-template">
      <div className="route-page-heading">
        <div>
          <span className="route-eyebrow">Saved products</span>
          <h1>Your watchlist</h1>
          <p>Products you bookmarked from your MCP recommendations.</p>
        </div>
        <div className="watchlist-page-actions">
          <button type="button" className="watchlist-page-cart-button" onClick={() => navigate("/shop/cart")}>Open cart →</button>
        </div>
      </div>
      <section className="watchlist-reminder" aria-label="Watchlist reminder">
        <div>
          <span className="route-eyebrow">LINQ reminder</span>
          <p>Keep sending your watchlist and current prices to LINQ at a set interval.</p>
        </div>
        <div className="watchlist-reminder-controls">
          <label htmlFor="watchlist-reminder-delay">Remind me in</label>
          <select
            id="watchlist-reminder-delay"
            value={reminderDelay}
            onChange={(event) => setReminderDelay(Number(event.target.value))}
          >
            {REMINDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={applyReminder}>Apply</button>
          <button
            type="button"
            className="watchlist-reminder-stop"
            onClick={stopReminder}
            disabled={!reminderActive}
          >
            Stop
          </button>
        </div>
        {reminderStatus && <p className="watchlist-reminder-status">{reminderStatus}</p>}
      </section>
      <WatchlistPanel onAddToCart={addToCart} />
    </main>
  );
}
