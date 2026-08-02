import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/linq/watchlist/?all=true";

export default function AdminPage() {
  const [items, setItems] = useState([]);
  const [newPrices, setNewPrices] = useState({});
  const [sendingId, setSendingId] = useState("");
  const [sentIds, setSentIds] = useState({});
  const [actionError, setActionError] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  async function sendDiscountAlert(item) {
    const newPrice = Number(newPrices[item.product_id]);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setActionError(`Enter a valid new price for ${item.name}.`);
      return;
    }

    setSendingId(item.product_id);
    setActionError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/linq/send-message/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_number: item.owner_number,
          message: `discount alert ${item.name} price dropped from ${item.price} to ${newPrice}`,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Notification failed (${response.status})`);
      }
      setSentIds((current) => ({ ...current, [item.product_id]: true }));
    } catch (requestError) {
      setActionError(requestError.message || "Could not send the discount alert.");
    } finally {
      setSendingId("");
    }
  }

  useEffect(() => {
    let active = true;

    fetch(API_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || "Could not load watchlist items.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div>
          <span className="route-eyebrow">Operations</span>
          <h1>Watchlist admin</h1>
          <p>Every item currently being tracked across LINQ owners.</p>
        </div>
        <div className="admin-page__count">{items.length} items</div>
      </header>

      {status === "loading" && <p className="admin-page__message">Loading watchlists...</p>}
      {status === "error" && <p className="admin-page__message admin-page__message--error">{error}</p>}
      {status === "ready" && items.length === 0 && (
        <p className="admin-page__message">No watchlist items have been saved yet.</p>
      )}
      {actionError && <p className="admin-page__message admin-page__message--error">{actionError}</p>}

      {status === "ready" && items.length > 0 && (
        <section className="admin-watchlist-grid" aria-label="All watchlist items">
          {items.map((item) => (
            <article className="admin-watchlist-card" key={`${item.owner_number}-${item.product_id}`}>
              <div className="admin-watchlist-card__media">
                {item.image_url ? (
                  <img src={item.image_url} alt="" />
                ) : (
                  <span aria-hidden="true">{item.name?.slice(0, 1) || "?"}</span>
                )}
              </div>
              <div className="admin-watchlist-card__body">
                <span className="admin-watchlist-card__brand">{item.brand || item.merchant || "Unbranded"}</span>
                <h2>{item.name}</h2>
                <p className="admin-watchlist-card__price">
                  {item.price == null ? "Price unavailable" : `₹${item.price}`}
                </p>
                <div className="admin-watchlist-card__alert">
                  <label htmlFor={`new-price-${item.product_id}`}>New price</label>
                  <div className="admin-watchlist-card__alert-controls">
                    <input
                      id={`new-price-${item.product_id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter price"
                      value={newPrices[item.product_id] || ""}
                      onChange={(event) => setNewPrices((current) => ({
                        ...current,
                        [item.product_id]: event.target.value,
                      }))}
                    />
                    <button
                      type="button"
                      onClick={() => sendDiscountAlert(item)}
                      disabled={sendingId === item.product_id}
                    >
                      {sendingId === item.product_id ? "Sending..." : "Save changes"}
                    </button>
                  </div>
                  {sentIds[item.product_id] && <span className="admin-watchlist-card__sent">Alert sent</span>}
                </div>
                <dl>
                  <div><dt>Owner</dt><dd>{item.owner_number}</dd></div>
                  <div><dt>Variant</dt><dd>{item.variant || "Not specified"}</dd></div>
                  <div><dt>Status</dt><dd>{item.availability || "Unknown"}</dd></div>
                </dl>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}