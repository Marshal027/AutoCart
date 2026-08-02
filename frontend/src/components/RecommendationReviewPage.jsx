import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import SpecularButton from "./SpecularButton.jsx";
import { AnimateNumber } from "motion-plus/react";

const SWIPE_THRESHOLD = 110;
const SWIPE_EXIT_DISTANCE = 760;

function normalizeItem(item, track, trackIndex, itemIndex) {
  return {
    ...item,
    id: item.id ?? `${track.id || track.title || trackIndex}-${itemIndex}`,
    name: item.name || item.title || "Recommended item",
    price: Number(item.price) || 0,
    source:
      item.brand ||
      item.restaurant ||
      item.merchant ||
      track.title ||
      "Partner",
    mcpServer:
      item.mcp_server ||
      track.mcp_server ||
      track.merchant_key ||
      track.title ||
      "Partner",
    image: item.image_url || item.image || "",
    detail:
      item.quantity || item.portion || item.delivery_time || item.cuisine || "",
  };
}

function ProductArtwork({ item, large = false }) {
  return (
    <div
      className={`recommendation-artwork ${large ? "recommendation-artwork--large" : ""}`}
      style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}
    >
      {!item.image && <span>{item.emoji || "🛍️"}</span>}
    </div>
  );
}

function QuantityControl({ value, onChange, compact = false }) {
  return (
    <div
      className={`recommendation-quantity ${compact ? "recommendation-quantity--compact" : ""}`}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <strong>
        <AnimateNumber>{value}</AnimateNumber>
      </strong>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export default function RecommendationReviewPage({
  plannerResults,
  cartItems = [],
  onAddToCart,
  onRemoveFromCart,
  onDone,
  onBack,
}) {
  const tracks = useMemo(
    () =>
      (plannerResults?.tracks || [])
        .map((track, trackIndex) => ({
          ...track,
          id: track.id || `track-${trackIndex}`,
          title: track.title || `Recommendation ${trackIndex + 1}`,
          items: (track.items || []).map((item, itemIndex) =>
            normalizeItem(item, track, trackIndex, itemIndex),
          ),
        }))
        .filter((track) => track.items.length > 0),
    [plannerResults],
  );
  const allItems = useMemo(
    () => tracks.flatMap((track) => track.items),
    [tracks],
  );
  const [activeItemId, setActiveItemId] = useState(
    () => allItems[0]?.id ?? null,
  );
  const [quantities, setQuantities] = useState({});
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [dragX, setDragX] = useState(0);
  const [swipeExit, setSwipeExit] = useState(null);
  const swipeStart = useRef(null);
  const swipeLocked = useRef(false);

  const availableItems = allItems.filter(
    (item) => !dismissedIds.has(String(item.id)),
  );
  const activeItem =
    availableItems.find((item) => String(item.id) === String(activeItemId)) ||
    availableItems[0];
  const activeQuantity = activeItem ? quantities[activeItem.id] || 1 : 1;
  const cartCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
  const cartTotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const setQuantity = (item, quantity) => {
    setQuantities((current) => ({ ...current, [item.id]: quantity }));
  };

  const addItem = (item, quantity) => {
    onAddToCart?.(item, quantity);
    setQuantities((current) => ({ ...current, [item.id]: 1 }));
  };

  const selectItem = (item) => {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.delete(String(item.id));
      return next;
    });
    setActiveItemId(item.id);
  };

  const finishSwipe = (direction) => {
    if (!activeItem || swipeLocked.current) return;
    swipeLocked.current = true;
    setSwipeExit(direction);

    window.setTimeout(() => {
      if (direction === "right") {
        addItem(activeItem, activeQuantity);
      } else {
        const existing = cartItems.find(
          (item) => String(item.id) === String(activeItem.id),
        );
        if (existing) onRemoveFromCart?.(activeItem.id);
      }

      const currentIndex = availableItems.findIndex(
        (item) => String(item.id) === String(activeItem.id),
      );
      const nextItem = availableItems[currentIndex + 1] || availableItems[0];
      setDismissedIds((current) => {
        const next = new Set(current);
        next.add(String(activeItem.id));
        return next;
      });
      setActiveItemId(
        nextItem && String(nextItem.id) !== String(activeItem.id)
          ? nextItem.id
          : null,
      );
      setDragX(0);
      setSwipeExit(null);
      swipeLocked.current = false;
    }, 220);
  };

  const handlePointerDown = (event) => {
    if (event.target.closest("button")) return;
    if (swipeLocked.current) return;
    swipeStart.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!swipeStart.current || swipeLocked.current) return;
    const nextX = event.clientX - swipeStart.current.x;
    setDragX(nextX);
  };

  const handlePointerUp = (event) => {
    if (!swipeStart.current) return;
    const distance = event.clientX - swipeStart.current.x;
    swipeStart.current = null;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) {
      finishSwipe(distance > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };

  if (!activeItem) {
    return (
      <motion.main
        className="shop-route-page recommendation-page recommendation-page--empty"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="route-page-heading">
          <div>
            <span className="route-eyebrow">Plan reviewed</span>
            <h1>All recommendations reviewed</h1>
            <p>
              Swipe right to add items, or swipe left to skip them. Your cart is
              ready.
            </p>
          </div>
          <div className="route-heading-actions">
            <SpecularButton
              size="sm"
              type="button"
              className="route-secondary-btn"
              onClick={onBack}
            >
              ← New search
            </SpecularButton>
            <SpecularButton
              size="md"
              type="button"
              className="recommendation-done-top"
              onClick={onDone}
            >
              Done · Open cart →
            </SpecularButton>
          </div>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="shop-route-page recommendation-page"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="route-page-heading">
        <div>
          <p>
            {plannerResults?.summary ||
              "Choose the products you want, set quantities, and continue to your cart."}
          </p>
        </div>
        <div className="route-heading-actions">
          <SpecularButton
            size="sm"
            type="button"
            className="route-secondary-btn"
            onClick={onBack}
          >
            ← New search
          </SpecularButton>
          <SpecularButton
            size="md"
            type="button"
            className="recommendation-done-top"
            onClick={onDone}
          >
            Done · Open cart →{" "}
            <span>
              <AnimateNumber>{cartCount}</AnimateNumber>
            </span>
          </SpecularButton>
        </div>
      </div>

      <motion.section
        className="recommendation-feature-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={`recommendation-feature-card ${swipeExit ? `recommendation-feature-card--exit-${swipeExit}` : ""}`}
          style={{
            transform: swipeExit
              ? `translateX(${swipeExit === "right" ? SWIPE_EXIT_DISTANCE : -SWIPE_EXIT_DISTANCE}px) rotate(${swipeExit === "right" ? 14 : -14}deg)`
              : `translateX(${dragX}px) rotate(${dragX / 22}deg)`,
            transition: swipeStart.current ? "none" : "transform 220ms ease",
            touchAction: "pan-y",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            swipeStart.current = null;
            setDragX(0);
          }}
        >
          <span
            className="recommendation-swipe-stamp recommendation-swipe-stamp--add"
            style={{
              opacity: Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD)),
            }}
          >
            ADD →
          </span>
          <span
            className="recommendation-swipe-stamp recommendation-swipe-stamp--skip"
            style={{
              opacity: Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD)),
            }}
          >
            ← SKIP
          </span>
          <div className="recommendation-feature-media">
            <ProductArtwork item={activeItem} large />
            {activeItem.is_ai_recommended && (
              <span className="recommendation-ai-pill">AI PICK</span>
            )}
          </div>
          <div className="recommendation-feature-copy">
            <span className="recommendation-source">{activeItem.source}</span>
            <h2>{activeItem.name}</h2>
            <p>
              {activeItem.detail ||
                "Selected by Trigr from the available merchant results."}
            </p>
            <div className="recommendation-feature-footer">
              <div>
                <span className="recommendation-price">
                  ₹{activeItem.price}
                </span>
                {activeItem.original_price > activeItem.price && (
                  <span className="recommendation-original-price">
                    ₹{activeItem.original_price}
                  </span>
                )}
              </div>
              <QuantityControl
                value={activeQuantity}
                onChange={(value) => setQuantity(activeItem, value)}
              />
            </div>
            <SpecularButton
              size="md"
              type="button"
              className="recommendation-add-btn"
              onClick={() => addItem(activeItem, activeQuantity)}
            >
              Add {activeQuantity} to cart{" "}
              <span>
                <AnimateNumber prefix="₹">
                  {activeItem.price * activeQuantity}
                </AnimateNumber>
              </span>
            </SpecularButton>
            <small className="recommendation-in-cart">
              {cartItems.find(
                (item) => String(item.id) === String(activeItem.id),
              )
                ? `${cartItems.find((item) => String(item.id) === String(activeItem.id)).quantity} already in cart`
                : "Not in cart yet"}
            </small>
          </div>
        </div>

        <aside className="recommendation-plan-summary">
          <div className="recommendation-summary-head">
            <div>
              <span className="route-eyebrow">Your plan</span>
              <h2>
                {tracks.length}{" "}
                {tracks.length === 1 ? "item group" : "item groups"}
              </h2>
            </div>
            <span className="recommendation-summary-count">
              <AnimateNumber>{cartCount}</AnimateNumber> in cart
            </span>
          </div>
          <div className="recommendation-track-list">
            {tracks.map((track) => {
              const selected = track.items.some(
                (item) => String(item.id) === String(activeItem.id),
              );
              return (
                <SpecularButton
                  size="sm"
                  type="button"
                  className={`recommendation-track ${selected ? "recommendation-track--active" : ""}`}
                  key={track.id}
                  onClick={() => selectItem(track.items[0])}
                >
                  <span className="recommendation-track-icon">
                    {track.icon || "✨"}
                  </span>
                  <span>
                    <strong>{track.title}</strong>
                    <small>{track.items.length} options available</small>
                  </span>
                  <span>›</span>
                </SpecularButton>
              );
            })}
          </div>
          <div className="recommendation-summary-total">
            <span>Current cart value</span>
            <strong>
              <AnimateNumber prefix="₹">{cartTotal}</AnimateNumber>
            </strong>
          </div>
        </aside>
      </motion.section>

      <motion.section
        className="recommendation-catalog"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="recommendation-catalog-heading">
          <div>
            <span className="route-eyebrow">More choices</span>
            <h2>All</h2>
          </div>
          <span>{allItems.length} options</span>
        </div>
        <div className="recommendation-catalog-grid">
          {allItems.map((item, index) => {
            const quantity = quantities[item.id] || 1;
            const inCart = cartItems.find(
              (cartItem) => String(cartItem.id) === String(item.id),
            );
            return (
              <motion.article
                className={`recommendation-option-card ${String(item.id) === String(activeItem.id) ? "recommendation-option-card--active" : ""}`}
                key={item.id}
                onClick={() => selectItem(item)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 + index * 0.045, duration: 0.35 }}
                whileHover={{ y: -3 }}
              >
                <div className="recommendation-option-media">
                  <ProductArtwork item={item} />
                  {item.is_ai_recommended && (
                    <span className="recommendation-ai-pill">AI PICK</span>
                  )}
                </div>
                <div className="recommendation-option-content">
                  <span className="recommendation-source">{item.source}</span>
                  <h3 title={item.name}>{item.name}</h3>
                  <div className="recommendation-option-meta">
                    <strong>₹{item.price}</strong>
                    <span>{item.detail || "Available now"}</span>
                  </div>
                  <div
                    className="recommendation-option-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <QuantityControl
                      compact
                      value={quantity}
                      onChange={(value) => setQuantity(item, value)}
                    />
                    <SpecularButton
                      size="sm"
                      type="button"
                      onClick={() => addItem(item, quantity)}
                    >
                      Add
                    </SpecularButton>
                  </div>
                  {inCart && (
                    <small className="recommendation-in-cart">
                      <AnimateNumber>{inCart.quantity}</AnimateNumber> in cart
                    </small>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.section>
    </motion.main>
  );
}
