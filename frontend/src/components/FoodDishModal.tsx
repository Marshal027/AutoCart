import React from "react";
import { SwiggyFoodDish } from "../SwipixApp";
import SpecularButton from "./SpecularButton.jsx";

interface FoodDishModalProps {
  dish: SwiggyFoodDish;
  onClose: () => void;
  onAddToCart: (
    id: string | number,
    name: string,
    price: number,
    qty: number,
    provider: string,
    url: string,
  ) => void;
  modalItemQty: number;
  setModalItemQty: React.Dispatch<React.SetStateAction<number>>;
}

export const FoodDishModal: React.FC<FoodDishModalProps> = ({
  dish,
  onClose,
  onAddToCart,
  modalItemQty,
  setModalItemQty,
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content modal-content--full-details"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close details"
        >
          ✕
        </button>

        <div className="modal-details-container">
          <div className="modal-header-section">
            <div className="modal-badge-group">
              <span className="modal-brand-tag">{dish.restaurant}</span>
              <span className="modal-delivery-tag">
                ⚡ {dish.delivery_time}
              </span>
              <span className="modal-mcp-badge">Swiggy Food Verified</span>
            </div>
            <h2 className="modal-title">{dish.name}</h2>
          </div>

          <div className="modal-price-box">
            <div className="modal-price-main">
              <span className="modal-current-price">₹{dish.price}</span>
              {dish.original_price && dish.original_price > dish.price && (
                <>
                  <span className="modal-original-price">
                    ₹{dish.original_price}
                  </span>
                  <span className="modal-discount-tag">
                    {Math.round(
                      ((dish.original_price - dish.price) /
                        dish.original_price) *
                        100,
                    )}
                    % OFF
                  </span>
                  <span className="modal-save-amount">
                    Save ₹{dish.original_price - dish.price}
                  </span>
                </>
              )}
            </div>
            <p className="modal-tax-note">
              Includes all food preparation & packaging charges
            </p>
          </div>

          <div className="modal-spec-grid">
            <div className="spec-item">
              <span className="spec-label">🍽️ Portion / Serving</span>
              <span className="spec-value">
                {dish.portion || "Standard Portion (Serves 1-2)"}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">🍲 Cuisine Type</span>
              <span className="spec-value">
                {dish.cuisine || "Multi-Cuisine"}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">🌱 Dietary Badge</span>
              <span className="spec-value">
                {dish.is_veg !== false ? "🟢 Pure Veg Dish" : "🔴 Non-Veg Dish"}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">⭐ Restaurant Rating</span>
              <span className="spec-value">
                {dish.rating || 4.5} / 5.0 (Swiggy Verified)
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">⚡ Delivery Time</span>
              <span className="spec-value">{dish.delivery_time}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">🏢 Provider Endpoint</span>
              <span className="spec-value">mcp.swiggy.com/food</span>
            </div>
          </div>

          <div className="modal-highlights">
            <h4 className="modal-highlights-title">
              Swiggy Food Freshness & Quality Assurance
            </h4>
            <ul className="modal-highlights-list">
              <li>
                🔥 Prepared fresh on order receipt in hygienic restaurant
                kitchens
              </li>
              <li>
                📦 Spill-proof, eco-friendly insulated hot delivery container
              </li>
              <li>⚡ Live GPS courier tracking straight to your doorstep</li>
            </ul>
          </div>

          <div className="modal-actions">
            <div className="modal-qty-selector">
              <button
                className="modal-qty-btn"
                onClick={() => setModalItemQty((q) => Math.max(1, q - 1))}
              >
                -
              </button>
              <span className="modal-qty-num">{modalItemQty}</span>
              <button
                className="modal-qty-btn"
                onClick={() => setModalItemQty((q) => q + 1)}
              >
                +
              </button>
            </div>

            <SpecularButton
              size="md"
              className="modal-add-cart-btn"
              onClick={() => {
                onAddToCart(
                  dish.id,
                  dish.name,
                  dish.price,
                  modalItemQty,
                  "Swiggy Food",
                  dish.url,
                );
                onClose();
              }}
            >
              Add {modalItemQty} Dish to Food Cart • ₹
              {dish.price * modalItemQty}
            </SpecularButton>
          </div>
        </div>
      </div>
    </div>
  );
};
