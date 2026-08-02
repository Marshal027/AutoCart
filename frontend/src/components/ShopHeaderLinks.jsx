import { Bookmark, ShoppingCart, Tag } from "lucide-react";
import { Link } from "react-router-dom";

export default function ShopHeaderLinks({ cartCount = 0, showCart = true }) {
  return (
    <div className="shop-header-links">
      <Link className="top-route-link" to="/shop/watchlist">
        <span className="top-route-icon" aria-hidden="true"><Bookmark size={15} strokeWidth={2.4} /></span>
        <span>Watchlist</span>
      </Link>
      <Link className="top-route-link" to="/shop/deals">
        <span className="top-route-icon" aria-hidden="true"><Tag size={15} strokeWidth={2.4} /></span>
        <span>LiveDeals</span>
      </Link>
      {showCart && (
        <Link className="top-route-link" to="/shop/cart">
          <span className="top-route-icon top-route-icon--cart" aria-hidden="true"><ShoppingCart size={15} strokeWidth={2.4} /></span>
          <span>Cart</span>
          <span className="top-route-count">{cartCount}</span>
        </Link>
      )}
    </div>
  );
}
