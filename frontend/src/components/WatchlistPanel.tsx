import { TrendingDown } from "lucide-react";
import { useWatchlist, toggleWatchlist } from "./SwipeScreens";

type WatchlistPanelProps = {
  onAddToCart: (
    id: string | number,
    name: string,
    price: number,
    quantity: number,
    source: string,
    url?: string,
  ) => void;
};

export function WatchlistPanel({ onAddToCart }: WatchlistPanelProps) {
  const watchlistItems = useWatchlist();

  return (
    <section className="watchlist-section max-w-none min-w-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-wide text-text flex items-center gap-3">
          My Watchlist{" "}
          <span className="bg-accent/20 text-accent text-lg px-3 py-1 rounded-full">
            {watchlistItems.length}
          </span>
        </h2>
      </div>

      {watchlistItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border-col/50 rounded-lg">
          <span className="text-4xl">💔</span>
          <p className="mt-4 text-text/60 font-['Space_Mono']">
            Your watchlist is empty.
          </p>
          <p className="text-text/40 text-sm mt-2">
            Heart products in the Swipe Planner to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {watchlistItems.map((item: any, idx: number) => {
            let hash = 0;
            const str = String(item.id || item.name);
            for (let i = 0; i < str.length; i++) {
              hash = (hash << 5) - hash + str.charCodeAt(i);
              hash = hash & hash;
            }
            const rand = Math.abs(hash) % 100;
            const hasPriceDrop = rand < 30;
            const dropPercent = hasPriceDrop ? 10 + (Math.abs(hash) % 15) : 0;
            const currentPrice = hasPriceDrop
              ? Math.floor(item.price * (1 - dropPercent / 100))
              : item.price;

            return (
              <div
                key={`${item.id}-${idx}`}
                className="swiggy-card relative border border-border-col bg-card-bg group"
              >
                <button
                  onClick={() => toggleWatchlist(item)}
                  className="absolute top-2 right-2 z-10 bg-bg/80 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-500"
                  title="Remove from watchlist"
                >
                  ✕
                </button>

                <div
                  className="swiggy-card-top-bar"
                  style={{ minHeight: "36px" }}
                >
                  {hasPriceDrop ? (
                    <span className="swiggy-delivery-badge flex items-center gap-1 !bg-green-500/20 !text-green-500 !border-green-500/30">
                      <TrendingDown className="h-3 w-3" />
                      Price Dropped by {dropPercent}%!
                    </span>
                  ) : (
                    <span className="swiggy-delivery-badge">
                      Watching Price 👀
                    </span>
                  )}
                </div>

                <div className="swiggy-card-image-container h-48">
                  {item.image || item.image_url ? (
                    <img
                      src={item.image || item.image_url}
                      alt={item.name}
                      className="swiggy-card-img"
                    />
                  ) : (
                    <div className="swiggy-card-emoji-fallback">
                      {item.emoji || "🎁"}
                    </div>
                  )}
                </div>

                <div className="swiggy-card-body">
                  <span className="swiggy-brand">
                    {item.brand || item.restaurant || "Product"}
                  </span>
                  <h4
                    className="swiggy-prod-name line-clamp-2"
                    title={item.name}
                  >
                    {item.name}
                  </h4>

                  <div className="swiggy-footer mt-4 flex flex-col gap-3">
                    <div className="swiggy-price-wrap flex items-end gap-2">
                      <span className="swiggy-price text-xl text-text font-bold">
                        ₹{currentPrice}
                      </span>
                      {hasPriceDrop && (
                        <span className="text-text/40 line-through text-xs mb-1">
                          ₹{item.price}
                        </span>
                      )}
                    </div>

                    <button
                      className="swiggy-add-btn w-full"
                      onClick={() =>
                        onAddToCart(
                          item.id,
                          item.name,
                          currentPrice,
                          1,
                          "Watchlist",
                          item.url,
                        )
                      }
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
