import { useMemo } from "react";
import { motion } from "motion/react";
import SpecularButton from "./SpecularButton.jsx";
import { AnimateNumber } from "motion-plus/react";

export default function CartPage({
  cartItems = [],
  subtotal = 0,
  deliveryFee = 0,
  taxesAndFees = 0,
  grandTotal = 0,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onContinueShopping,
  isProcessingPayment = false,
}) {
  const totalItems = useMemo(
    () =>
      cartItems.reduce((total, item) => total + Number(item.quantity || 0), 0),
    [cartItems],
  );

  return (
    <motion.main
      className="shop-route-page cart-page"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="route-page-heading cart-page-heading">
        <div>
          <span className="route-eyebrow">Ready when you are</span>
          <h1>Your cart</h1>
          <p>
            {totalItems ? (
              <>
                <AnimateNumber>{totalItems}</AnimateNumber> item
                {totalItems === 1 ? "" : "s"} from your selected merchants
              </>
            ) : (
              "Your cart is waiting for your next selection."
            )}
          </p>
        </div>
        <SpecularButton
          size="sm"
          type="button"
          className="route-secondary-btn"
          onClick={onContinueShopping}
        >
          ← Continue shopping
        </SpecularButton>
      </div>

      {cartItems.length === 0 ? (
        <section className="route-empty-card cart-empty-page-card">
          <span className="route-empty-icon">🛒</span>
          <h2>Your cart is empty</h2>
          <p>
            Add recommendations from the product page and they will appear here.
          </p>
          <SpecularButton
            size="md"
            type="button"
            className="recommendation-done-btn"
            onClick={onContinueShopping}
          >
            Browse recommendations
          </SpecularButton>
        </section>
      ) : (
        <div className="cart-page-layout">
          <section className="cart-page-items">
            <div className="cart-page-section-heading">
              <h2>Selected items</h2>
              <SpecularButton
                size="sm"
                type="button"
                className="cart-page-clear"
                onClick={onClearCart}
              >
                Clear cart
              </SpecularButton>
            </div>
            <div className="cart-page-list">
              {cartItems.map((item, index) => (
                <motion.article
                  className="cart-page-item"
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + index * 0.06, duration: 0.35 }}
                >
                  <div className="cart-page-item-art">{item.emoji || "🛍️"}</div>
                  <div className="cart-page-item-copy">
                    <span className="cart-page-item-source">
                      {item.source || "Partner"}
                    </span>
                    <h3>{item.name}</h3>
                    <p>₹{item.price} each</p>
                  </div>
                  <div className="cart-page-item-controls">
                    <div className="cart-page-quantity">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        aria-label={`Decrease ${item.name}`}
                      >
                        −
                      </button>
                      <strong>
                        <AnimateNumber>{item.quantity}</AnimateNumber>
                      </strong>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                    <strong className="cart-page-item-total">
                      <AnimateNumber prefix="₹">
                        {item.price * item.quantity}
                      </AnimateNumber>
                    </strong>
                    <button
                      type="button"
                      className="cart-page-item-remove"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <aside className="cart-page-summary">
            <div className="cart-page-summary-top">
              <span className="route-eyebrow">Order summary</span>
              <h2>Payment total</h2>
            </div>
            <div className="cart-page-summary-rows">
              <div>
                <span>Items subtotal</span>
                <strong>
                  <AnimateNumber prefix="₹">{subtotal}</AnimateNumber>
                </strong>
              </div>
              <div>
                <span>Delivery charges</span>
                <strong>
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </strong>
              </div>
              <div>
                <span>Taxes & packaging</span>
                <strong>
                  <AnimateNumber prefix="₹">{taxesAndFees}</AnimateNumber>
                </strong>
              </div>
            </div>
            <div className="cart-page-grand-total">
              <span>Grand total</span>
              <strong>
                <AnimateNumber prefix="₹">{grandTotal}</AnimateNumber>
              </strong>
            </div>
            <SpecularButton
              size="lg"
              type="button"
              className="cart-page-checkout"
              onClick={onCheckout}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                "Preparing secure payment…"
              ) : (
                <>
                  Proceed to pay{" "}
                  <span>
                    <AnimateNumber prefix="₹">{grandTotal}</AnimateNumber> →
                  </span>
                </>
              )}
            </SpecularButton>
            <p className="cart-page-secure-note">
              🔒 Secure card verification by Prava. Your card details never
              reach Autocart.
            </p>
          </aside>
        </div>
      )}
    </motion.main>
  );
}
