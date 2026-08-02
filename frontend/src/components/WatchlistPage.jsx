import { useNavigate } from "react-router-dom";
import { WatchlistPanel } from "./WatchlistPanel";

const CART_STORAGE_KEY = "trigr-shop-cart";

function readCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || "[]") || [];
  } catch {
    return [];
  }
}

export default function WatchlistPage() {
  const navigate = useNavigate();

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
        <button type="button" className="watchlist-page-cart-button" onClick={() => navigate("/shop/cart")}>Open cart →</button>
      </div>
      <WatchlistPanel onAddToCart={addToCart} />
    </main>
  );
}
