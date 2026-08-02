import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Bookmark, Heart, Info, X } from "lucide-react";
import SpecularButton from "./SpecularButton.jsx";
import { getWatchlist, toggleWatchlist } from "./SwipeScreens";

const SWIPE_THRESHOLD = 110;

function normalizeItem(item, track, trackIndex, itemIndex) {
  return {
    ...item,
    id: item.id ?? `${track.id || track.title || trackIndex}-${itemIndex}`,
    name: item.name || item.title || "Recommended item",
    price: Number(item.price) || 0,
    source: item.brand || item.restaurant || item.merchant || track.title || "Partner",
    mcpServer: item.mcp_server || track.mcp_server || track.merchant_key || track.title || "Partner",
    image: item.image_url || item.image || "",
    detail: item.quantity || item.portion || item.delivery_time || item.cuisine || "",
  };
}

function ProductFace({ item, muted = false, onWatchlist, isWatchlisted = false }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`tinder-product-face ${muted ? "tinder-product-face--muted" : ""}`}>
      {!muted && (
        <div className="tinder-card-actions">
          <button
            type="button"
            className="tinder-info-button"
            onClick={(event) => {
              event.stopPropagation();
              setShowDetails((visible) => !visible);
            }}
            aria-label={`Show details for ${item.name}`}
            title="Product details"
          >
            <Info size={16} />
          </button>
          <button
            type="button"
            className={`tinder-watchlist-button ${isWatchlisted ? "tinder-watchlist-button--active" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onWatchlist?.(item);
            }}
            aria-label={isWatchlisted ? `Remove ${item.name} from watchlist` : `Add ${item.name} to watchlist`}
            title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark size={16} fill={isWatchlisted ? "currentColor" : "none"} />
          </button>
        </div>
      )}
      {showDetails && !muted && (
        <div className="tinder-product-details" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="tinder-product-details-close"
            onClick={() => setShowDetails(false)}
            aria-label="Close product details"
          >
            <X size={15} />
          </button>
          <span>Product details</span>
          <h3>{item.name}</h3>
          <dl>
            {Object.entries(item)
              .filter(([key, value]) => !["image", "image_url", "is_ai_recommended"].includes(key) && value !== undefined && value !== null && value !== "")
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
      <div
        className="tinder-product-image"
        style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}
      >
        {!item.image && <span>{item.emoji || "🛍️"}</span>}
      </div>
      {item.is_ai_recommended && <span className="tinder-ai-pill">AI PICK</span>}
      <span className="tinder-product-source">{item.source}</span>
      <h2>{item.name}</h2>
      <p>{item.detail || "Available from this MCP merchant"}</p>
      <strong>₹{item.price}</strong>
    </div>
  );
}

export default function TinderRecommendationPage({
  plannerResults,
  cartItems = [],
  onAddToCart,
  onRemoveFromCart,
  onDone,
  onBack,
}) {
  const tracks = useMemo(
    () => (plannerResults?.tracks || [])
      .map((track, trackIndex) => ({
        ...track,
        id: track.id || `track-${trackIndex}`,
        title: track.title || `Recommendation ${trackIndex + 1}`,
        items: (track.items || []).map((item, itemIndex) => normalizeItem(item, track, trackIndex, itemIndex)),
      }))
      .filter((track) => track.items.length > 0),
    [plannerResults],
  );
  const items = useMemo(() => tracks.flatMap((track) => track.items), [tracks]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exitDirection, setExitDirection] = useState(null);
  const [watchlistedIds, setWatchlistedIds] = useState(() => new Set(getWatchlist().map((item) => String(item.id))));
  const startRef = useRef(null);
  const lockedRef = useRef(false);

  const activeItem = items[currentIndex];
  const nextItem = items[currentIndex + 1];
  const activeTrackIndex = activeItem
    ? tracks.findIndex((track) => track.items.some((item) => String(item.id) === String(activeItem.id)))
    : -1;
  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const handleWatchlist = (item) => {
    toggleWatchlist(item);
    setWatchlistedIds((current) => {
      const next = new Set(current);
      const id = String(item.id);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finishSwipe = (direction) => {
    if (!activeItem || lockedRef.current) return;
    lockedRef.current = true;
    setExitDirection(direction);
    window.setTimeout(() => {
      if (direction === "right") onAddToCart?.(activeItem, 1);
      if (direction === "left" && cartItems.some((item) => String(item.id) === String(activeItem.id))) {
        onRemoveFromCart?.(activeItem.id);
      }
      setCurrentIndex((index) => index + 1);
      setDrag({ x: 0, active: false });
      setExitDirection(null);
      lockedRef.current = false;
    }, 220);
  };

  const startDrag = (event) => {
    if (event.target.closest("button") || lockedRef.current) return;
    startRef.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ x: 0, active: true });
  };

  const moveDrag = (event) => {
    const startX = startRef.current?.x;
    if (startX == null || lockedRef.current) return;
    setDrag((value) => ({ ...(value || { active: true }), x: event.clientX - startX }));
  };

  const endDrag = () => {
    if (!startRef.current) return;
    const distance = drag?.x ?? 0;
    startRef.current = null;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) finishSwipe(distance > 0 ? "right" : "left");
    else setDrag({ x: 0, active: false });
  };

  if (!activeItem) {
    return (
      <motion.main className="shop-route-page tinder-recommendation-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="tinder-complete-state">
          <span>✓</span>
          <h1>Recommendations reviewed</h1>
          <p>Your selected items are ready in the cart.</p>
          <div className="route-heading-actions">
            <SpecularButton size="sm" type="button" className="route-secondary-btn" onClick={onBack}>← New search</SpecularButton>
            <SpecularButton size="md" type="button" className="recommendation-done-top" onClick={onDone}>Done · Open cart →</SpecularButton>
          </div>
        </div>
      </motion.main>
    );
  }

  const dragX = drag?.x ?? 0;
  const isDragging = drag?.active ?? false;
  const cardTransform = exitDirection === "right"
    ? "translateX(760px) rotate(16deg)"
    : exitDirection === "left"
      ? "translateX(-760px) rotate(-16deg)"
      : `translateX(${dragX}px) rotate(${dragX / 18}deg)`;

  return (
    <motion.main className="shop-route-page tinder-recommendation-page" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="route-page-heading tinder-page-heading">
        <div>
          <span className="route-eyebrow">AI recommendations</span>
          <p>{plannerResults?.summary || "Swipe through your MCP recommendations."}</p>
        </div>
        <div className="route-heading-actions">
          <SpecularButton size="sm" type="button" className="route-secondary-btn" onClick={onBack}>← New search</SpecularButton>
          <SpecularButton size="md" type="button" className="recommendation-done-top" onClick={onDone}>
            Done · Open cart <span>{cartCount}</span>
          </SpecularButton>
        </div>
      </div>

      <section className="tinder-review-shell">
        <aside className="tinder-cart-panel">
          <div className="tinder-cart-heading"><span>My cart</span><strong>{cartCount}</strong></div>
          <div className="tinder-cart-list">
            {cartItems.length === 0 && <p>Swipe right on a product to add it here.</p>}
            {cartItems.map((item, index) => (
              <div className="tinder-cart-row" key={`${item.id}-${index}`}>
                <span className="tinder-cart-thumb">{item.emoji || "🛍️"}</span>
                <div><strong>{item.name}</strong><small>{item.source || "Partner"} · ₹{item.price}</small></div>
                <button type="button" onClick={() => onRemoveFromCart?.(item.id)} aria-label={`Remove ${item.name}`}>×</button>
              </div>
            ))}
          </div>
          <div className="tinder-cart-total"><span>Total</span><strong>₹{cartTotal}</strong></div>
        </aside>

        <section className="tinder-deck-panel">
          <div className="tinder-step-list">
            {tracks.map((track, index) => (
              <div className={`tinder-step ${index === activeTrackIndex ? "tinder-step--active" : ""}`} key={track.id}>
                <span>{index < activeTrackIndex ? "✓" : index + 1}</span><small>{track.title}</small>
              </div>
            ))}
          </div>
          <div className="tinder-category-heading"><h2>{tracks[activeTrackIndex]?.title || "Recommendations"}</h2><span>{currentIndex + 1} / {items.length}</span></div>
          <div className="tinder-card-stack">
            {nextItem && <ProductFace item={nextItem} muted />}
            <motion.div
              className="tinder-active-card"
              style={{ transform: cardTransform, transition: isDragging ? "none" : "transform .22s ease" }}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={() => { startRef.current = null; setDrag({ x: 0, active: false }); }}
            >
              <span className="tinder-stamp tinder-stamp--add" style={{ opacity: Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD)) }}>ADD</span>
              <span className="tinder-stamp tinder-stamp--skip" style={{ opacity: Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD)) }}>SKIP</span>
              <ProductFace item={activeItem} onWatchlist={handleWatchlist} isWatchlisted={watchlistedIds.has(String(activeItem.id))} />
            </motion.div>
          </div>
          <div className="tinder-action-row">
            <button type="button" className="tinder-action tinder-action--skip" onClick={() => finishSwipe("left")} aria-label="Skip recommendation"><X /></button>
            <button type="button" className="tinder-action tinder-action--add" onClick={() => finishSwipe("right")} aria-label="Add recommendation"><Heart /></button>
          </div>
        </section>
      </section>
    </motion.main>
  );
}
