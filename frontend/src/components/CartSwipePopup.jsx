import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SWIPE_THRESHOLD = 100;

function normalizeItem(item, track, index) {
  return {
    ...item,
    id: item.id ?? `${track.id ?? track.title}-${index}`,
    name: item.name || item.title || "Unnamed item",
    price: Number(item.price) || 0,
    source: item.brand || item.restaurant || item.merchant || track.title || "Partner",
    mcpServer: item.mcp_server || track.mcp_server || track.merchant_key || track.title || "Partner",
    image: item.image_url || item.image || "",
    detail: item.quantity || item.portion || item.delivery_time || item.cuisine || "",
  };
}

export default function CartSwipePopup({ tracks = [], onClose, onAddToCart }) {
  const categories = useMemo(
    () => tracks
      .map((track, trackIndex) => ({
        id: track.id || `track-${trackIndex}`,
        name: track.title || `Recommendation ${trackIndex + 1}`,
        items: (track.items || []).map((item, itemIndex) => normalizeItem(item, track, itemIndex)),
      }))
      .filter((category) => category.items.length > 0),
    [tracks],
  );
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [exitDirection, setExitDirection] = useState(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const startRef = useRef({ x: 0, y: 0 });

  const currentCategory = categories[categoryIndex];
  const currentItem = currentCategory?.items[itemIndex];
  const nextItem = currentCategory?.items[itemIndex + 1];
  const finished = !currentCategory;
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const advance = useCallback((direction) => {
    if (!currentItem || exitDirection) return;
    setExitDirection(direction);
    window.setTimeout(() => {
      if (direction === "right") setCart((items) => [...items, currentItem]);
      setDrag({ x: 0, y: 0, active: false });
      setExitDirection(null);
      setItemIndex((index) => {
        if (index + 1 < currentCategory.items.length) return index + 1;
        setCategoryIndex((index) => index + 1);
        return 0;
      });
    }, 220);
  }, [currentCategory, currentItem, exitDirection]);

  useEffect(() => {
    if (!drag.active) return undefined;
    const onMove = (event) => {
      const point = event.touches ? event.touches[0] : event;
      setDrag((value) => ({ ...value, x: point.clientX - startRef.current.x, y: point.clientY - startRef.current.y }));
    };
    const onUp = () => {
      setDrag((value) => {
        if (Math.abs(value.x) >= SWIPE_THRESHOLD) advance(value.x > 0 ? "right" : "left");
        return { ...value, active: false };
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [drag.active, advance]);

  const startDrag = (event) => {
    const point = event.touches ? event.touches[0] : event;
    startRef.current = { x: point.clientX, y: point.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  const finish = () => {
    cart.forEach((item) => onAddToCart?.(item));
    onClose?.(cart);
  };

  const cardStyle = {
    transform: exitDirection === "right"
      ? "translate(760px, -40px) rotate(24deg)"
      : exitDirection === "left"
        ? "translate(-760px, -40px) rotate(-24deg)"
        : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`,
    transition: drag.active ? "none" : "transform .22s ease",
  };

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-label="Review AI recommendations">
      <div style={styles.modal}>
        <button style={styles.close} onClick={() => onClose?.(cart)} aria-label="Close recommendations">×</button>
        <div style={styles.body}>
          <aside style={styles.cartPane}>
            <div style={styles.headingRow}><strong>Your cart</strong><span style={styles.badge}>{cart.length}</span></div>
            <div style={styles.cartList}>
              {cart.length === 0 && <p style={styles.muted}>Swipe right to add an MCP recommendation.</p>}
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} style={styles.cartRow}>
                  <div style={styles.thumb}>{item.emoji || "🛍️"}</div>
                  <div style={{ minWidth: 0, flex: 1 }}><strong style={styles.itemName}>{item.name}</strong><small style={styles.muted}>₹{item.price}</small></div>
                  <button style={styles.remove} onClick={() => setCart((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item.name}`}>×</button>
                </div>
              ))}
            </div>
            <div style={styles.total}><span>Total</span><strong>₹{total}</strong></div>
          </aside>

          <section style={styles.deck}>
            <div style={styles.steps}>
              {categories.map((category, index) => <span key={category.id} style={{ ...styles.step, ...(index === categoryIndex ? styles.activeStep : {}) }}>{index < categoryIndex ? "✓" : category.name}</span>)}
            </div>
            {finished ? (
              <div style={styles.done}><div style={styles.doneIcon}>✓</div><h2>Plan reviewed</h2><p style={styles.muted}>You selected {cart.length} MCP recommendation{cart.length === 1 ? "" : "s"}.</p></div>
            ) : (
              <>
                <div style={styles.titleRow}><h2>{currentCategory.name}</h2><span style={styles.muted}>{itemIndex + 1} / {currentCategory.items.length}</span></div>
                <div style={styles.stack}>
                  {nextItem && <ProductCard item={nextItem} muted />}
                  <div style={{ ...styles.card, ...cardStyle }} onMouseDown={startDrag} onTouchStart={startDrag}>
                    <ProductCard item={currentItem} />
                    <span style={{ ...styles.stamp, ...styles.addStamp, opacity: Math.min(1, Math.max(0, drag.x / 100)) }}>ADD</span>
                    <span style={{ ...styles.stamp, ...styles.skipStamp, opacity: Math.min(1, Math.max(0, -drag.x / 100)) }}>SKIP</span>
                  </div>
                </div>
                <div style={styles.actions}><button style={{ ...styles.action, color: "#d94c5a" }} onClick={() => advance("left")} aria-label="Skip recommendation">×</button><button style={{ ...styles.action, color: "#24966b" }} onClick={() => advance("right")} aria-label="Add recommendation">✓</button></div>
              </>
            )}
          </section>
        </div>
        <div style={styles.footer}><span style={styles.muted}>{finished ? "Ready to continue" : `${categories.length - categoryIndex} MCP result group${categories.length - categoryIndex === 1 ? "" : "s"} left`}</span><button style={styles.doneButton} onClick={finish}>Done</button></div>
      </div>
    </div>
  );
}

function ProductCard({ item, muted = false }) {
  return <div style={{ ...styles.product, opacity: muted ? 0.55 : 1 }}>
    <div style={{ ...styles.image, backgroundImage: item.image ? `url(${item.image})` : undefined }}>{!item.image && <span style={styles.emoji}>{item.emoji || "🛍️"}</span>}</div>
    {item.is_ai_recommended && <span style={styles.tag}>AI PICK</span>}
    <strong style={styles.productName}>{item.name}</strong>
    <span style={styles.muted}>{item.source}{item.detail ? ` · ${item.detail}` : ""}</span>
    <strong style={styles.price}>₹{item.price}</strong>
  </div>;
}

const styles = {
  backdrop: { position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(18, 14, 32, .72)", backdropFilter: "blur(10px)" },
  modal: { position: "relative", width: "min(900px, 100%)", maxHeight: "calc(100vh - 40px)", overflow: "auto", padding: 28, borderRadius: 24, background: "#fff", color: "#1c1730", boxShadow: "0 30px 80px rgba(0,0,0,.3)", fontFamily: "Inter, system-ui, sans-serif" },
  close: { position: "absolute", top: 16, right: 18, width: 36, height: 36, border: "1px solid #e9e5f2", borderRadius: "50%", background: "#faf9fd", color: "#655f78", fontSize: 24, cursor: "pointer" },
  body: { display: "flex", gap: 24, minHeight: 460 },
  cartPane: { width: 245, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #eeeaf6", paddingRight: 20 },
  headingRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 4, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 13 },
  badge: { padding: "3px 9px", borderRadius: 99, background: "#eeebfc", color: "#5b4fe0", fontSize: 12 },
  cartList: { flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" },
  cartRow: { display: "flex", alignItems: "center", gap: 9, padding: 8, border: "1px solid #f0edf7", borderRadius: 12, background: "#fbfafe" },
  thumb: { width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: "#eeebfc", flexShrink: 0 },
  itemName: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 },
  muted: { color: "#9892aa", fontSize: 12 },
  remove: { border: 0, background: "#f3f1fa", borderRadius: "50%", color: "#a19cb2", cursor: "pointer" },
  total: { display: "flex", justifyContent: "space-between", borderTop: "1px solid #eeeaf6", marginTop: 12, paddingTop: 14, color: "#9892aa", fontSize: 12 },
  deck: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" },
  steps: { display: "flex", gap: 6, width: "100%", flexWrap: "wrap", marginBottom: 18 },
  step: { padding: "6px 9px", borderRadius: 99, background: "#f1eff9", color: "#9892aa", fontSize: 10, fontWeight: 700 },
  activeStep: { background: "#5b4fe0", color: "#fff" },
  titleRow: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 },
  stack: { position: "relative", width: 270, height: 315, marginBottom: 18 },
  card: { position: "absolute", inset: 0, cursor: "grab", touchAction: "none", userSelect: "none" },
  product: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, padding: 18, border: "1px solid #eeeaf6", borderRadius: 20, background: "#fbfafe", boxShadow: "0 18px 40px rgba(28,23,48,.12)" },
  image: { width: 125, height: 125, display: "grid", placeItems: "center", borderRadius: 18, backgroundColor: "#eeebfc", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" },
  emoji: { fontSize: 48 },
  tag: { padding: "3px 9px", borderRadius: 99, background: "#eeebfc", color: "#5b4fe0", fontSize: 10, fontWeight: 700 },
  productName: { textAlign: "center", fontSize: 17 },
  price: { fontSize: 17 },
  stamp: { position: "absolute", top: 20, zIndex: 2, padding: "4px 10px", border: "3px solid", borderRadius: 8, fontWeight: 800, fontSize: 19, pointerEvents: "none" },
  addStamp: { left: 14, color: "#24966b", borderColor: "#24966b", transform: "rotate(-14deg)" },
  skipStamp: { right: 14, color: "#d94c5a", borderColor: "#d94c5a", transform: "rotate(14deg)" },
  actions: { display: "flex", gap: 20 },
  action: { width: 52, height: 52, border: 0, borderRadius: "50%", background: "#f4f1fa", fontSize: 25, fontWeight: 700, cursor: "pointer" },
  done: { flex: 1, display: "grid", placeItems: "center", alignContent: "center", textAlign: "center" },
  doneIcon: { width: 58, height: 58, display: "grid", placeItems: "center", borderRadius: "50%", background: "#eeebfc", color: "#5b4fe0", fontSize: 25 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eeeaf6", marginTop: 18, paddingTop: 18 },
  doneButton: { border: 0, borderRadius: 12, padding: "12px 28px", background: "#5b4fe0", color: "#fff", fontWeight: 700, cursor: "pointer" },
};