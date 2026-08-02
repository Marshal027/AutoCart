import React from "react";
import { SwiggyProduct } from "../SwipixApp";
import SpecularButton from "./SpecularButton.jsx";

interface ProductModalProps {
  product: SwiggyProduct;
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

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
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
              <span className="modal-brand-tag">{product.brand}</span>
              <span className="modal-delivery-tag">
                ⚡ Express Delivery ({product.delivery_time})
              </span>
              <span className="modal-mcp-badge">Swiggy Instamart Verified</span>
            </div>
            <h2 className="modal-title">{product.name}</h2>
          </div>

          <div className="modal-price-box">
            <div className="modal-price-main">
              <span className="modal-current-price">₹{product.price}</span>
              {product.original_price &&
                product.original_price > product.price && (
                  <>
                    <span className="modal-original-price">
                      ₹{product.original_price}
                    </span>
                    <span className="modal-discount-tag">
                      {Math.round(
                        ((product.original_price - product.price) /
                          product.original_price) *
                          100,
                      )}
                      % OFF
                    </span>
                    <span className="modal-save-amount">
                      Save ₹{product.original_price - product.price}
                    </span>
                  </>
                )}
            </div>
            <p className="modal-tax-note">
              Price inclusive of all taxes • Swiggy Instamart Instant Billing
            </p>
          </div>

          <div className="modal-spec-grid">
            <div className="spec-item">
              <span className="spec-label">📦 Pack Quantity</span>
              <span className="spec-value">{product.quantity}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">⚡ Delivery Speed</span>
              <span className="spec-value">{product.delivery_time}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">⭐ Rating & Reviews</span>
              <span className="spec-value">
                {product.rating || 4.8} / 5.0 (Instamart Verified)
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">🟢 Stock Availability</span>
              <span className="spec-value">
                Available at Nearest Dark Store
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">🌿 Dietary / Quality</span>
              <span className="spec-value">
                100% Vegetarian & Quality Checked
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">🏢 Provider Endpoint</span>
              <span className="spec-value">mcp.swiggy.com/im</span>
            </div>
          </div>

          <div className="modal-highlights">
            <h4 className="modal-highlights-title">
              Swiggy Instamart Assured Guarantees
            </h4>
            <ul className="modal-highlights-list">
              <li>🌿 100% Fresh & Authentic Product Sourcing</li>
              <li>
                ⚡ Delivered under 15 minutes straight from
                temperature-controlled dark stores
              </li>
              <li>📦 Hygienic, tamper-evident sealed packaging</li>
              <li>
                🔄 Instant refund / replacement guarantee if damaged or
                unsatisfied
              </li>
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
                  product.id,
                  product.name,
                  product.price,
                  modalItemQty,
                  "Swiggy Instamart",
                  product.url,
                );
                onClose();
              }}
            >
              Add {modalItemQty} to Instamart Cart • ₹
              {product.price * modalItemQty}
            </SpecularButton>
          </div>
        </div>
      </div>
    </div>
  );
};
