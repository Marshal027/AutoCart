import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const badgeClass = {
  watching: "badge-watching",
  triggered: "badge-triggered",
  bought: "badge-bought",
  cancelled: "badge-cancelled",
};

const badgeLabel = {
  watching: "Watching",
  triggered: "Buying — cancel window",
  bought: "Bought",
  cancelled: "Cancelled",
};

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [ceiling, setCeiling] = useState("");
  const [condition, setCondition] = useState("price_drop");
  const [watches, setWatches] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [error, setError] = useState("");
  const sectionRef = useRef(null);

  useEffect(() => {
    api
      .getProducts()
      .then((d) => {
        setProducts(d.products);
        if (d.products[0]) {
          setProductId(d.products[0].id);
          setCeiling(Math.round(d.products[0].basePrice * 0.9));
        }
      })
      .catch(() =>
        setError("Backend not reachable — run `npm run dev` inside /backend.")
      );
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      api
        .listWatches()
        .then((d) => setWatches(d.watches))
        .catch(() => {});
      api
        .getLedger()
        .then((d) => setLedger(d.ledger))
        .catch(() => {});
    }, 900);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".demo-label", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from(".demo-heading", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.1,
      });
      gsap.from(".demo-layout", {
        scrollTrigger: { trigger: ".demo-layout", start: "top 85%" },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const selectedProduct = products.find((p) => p.id === productId);

  async function startWatch() {
    setError("");
    try {
      await api.createWatch(productId, Number(ceiling), condition);
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancel(id) {
    try {
      await api.cancelWatch(id);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="section" id="demo" ref={sectionRef}>
      <hr className="section-divider" />
      <div className="wrap" style={{ paddingTop: 160 }}>
        <div className="section-label demo-label">Live demo</div>
        <h2 className="section-heading demo-heading">
          Watch a real flow, <em>end to end</em>.
        </h2>
        <p className="section-desc">
          Prices here drift on a simulated feed so the trigger fires within
          seconds instead of days — the logic is the same shape as production.
        </p>

        <div className="demo-layout">
          {/* Setup Panel */}
          <div className="demo-panel">
            <h4>Set a watch</h4>

            <div className="field">
              <label>Item</label>
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setCeiling(Math.round(p.basePrice * 0.9));
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.image} {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="field">
                <label>Merchant</label>
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    padding: "10px 0",
                  }}
                >
                  {selectedProduct.merchant} · current ₹
                  {selectedProduct.basePrice}
                </div>
              </div>
            )}

            <div className="field">
              <label>Condition</label>
              <div className="radio-row">
                <div
                  className={`radio-chip ${
                    condition === "price_drop" ? "active" : ""
                  }`}
                  onClick={() => setCondition("price_drop")}
                >
                  Price drop
                </div>
                <div
                  className={`radio-chip ${
                    condition === "restock" ? "active" : ""
                  }`}
                  onClick={() => setCondition("restock")}
                >
                  Restock
                </div>
              </div>
            </div>

            <div className="field">
              <label>Ceiling (₹)</label>
              <input
                type="number"
                value={ceiling}
                onChange={(e) => setCeiling(e.target.value)}
              />
            </div>

            <button
              className="btn btn-accent"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={startWatch}
            >
              Approve & start watching
            </button>
            {error && (
              <p
                style={{
                  color: "var(--red)",
                  fontSize: 12,
                  marginTop: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Active watches panel */}
          <div className="demo-panel">
            <h4>Active watches</h4>
            {watches.length === 0 && (
              <div className="empty-hint">
                No watches yet — set one on the left.
              </div>
            )}
            {watches.map((w) => (
              <div className="watch-card" key={w.id}>
                <div className="watch-emoji">
                  {products.find((p) => p.id === w.productId)?.image || "🛒"}
                </div>
                <div className="watch-info">
                  <div className="name">{w.productName}</div>
                  <div className="meta">
                    {w.merchant} · {w.condition.replace("_", " ")}
                  </div>
                </div>
                <div className="watch-price">
                  <div className="now">₹{w.currentPrice}</div>
                  <div className="ceil">ceiling ₹{w.ceiling}</div>
                </div>
                <span className={`badge ${badgeClass[w.status]}`}>
                  {badgeLabel[w.status]}
                </span>
                {w.status === "triggered" && (
                  <button className="cancel-btn" onClick={() => cancel(w.id)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}

            {ledger.length > 0 && (
              <>
                <h4 style={{ marginTop: 28 }}>Trust ledger</h4>
                <div className="ledger">
                  {ledger.slice(0, 6).map((l) => (
                    <div className="ledger-item" key={l.id}>
                      <span className="t">
                        {new Date(l.time).toLocaleTimeString()}
                      </span>
                      {l.message}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
