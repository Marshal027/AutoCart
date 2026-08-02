import { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
} from "framer-motion";
import { X, Heart, Loader2, ShoppingCart } from "lucide-react";

interface TinderSwipeProps {
  products: any[];
  onSwipeRight: (product: any) => void;
  onSwipeLeft: (product: any) => void;
  onComplete: () => void;
}

// ── Isolated top-card with its own hooks ─────────────────────────────────────
function SwipeCard({
  product,
  isTop,
  onDragEnd,
  dragControls,
}: {
  product: any;
  isTop: boolean;
  onDragEnd: (e: any, info: PanInfo) => void;
  dragControls: any;
}) {
  // All hooks called unconditionally at top level of this component
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-28, 28]);
  const cartOpacity = useTransform(x, [20, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-130, -20], [1, 0]);
  const bgGreen = useTransform(x, [0, 130], ["rgba(16,185,129,0)", "rgba(16,185,129,0.15)"]);
  const bgRed = useTransform(x, [-130, 0], ["rgba(239,68,68,0.15)", "rgba(239,68,68,0)"]);

  const emoji = product.emoji || (product.restaurant ? "🍛" : product.brand ? "📦" : "🛍️");
  const sourceName = product.brand || product.restaurant || product.merchant || "Partner";

  return (
    <motion.div
      className="absolute w-full h-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: isTop ? 10 : 1,
        scale: isTop ? 1 : 0.94,
        y: isTop ? 0 : 18,
        boxShadow: "0 25px 60px -10px rgba(0,0,0,0.5)",
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={isTop ? onDragEnd : undefined}
      animate={isTop ? dragControls : undefined}
      whileTap={isTop ? { cursor: "grabbing" } : {}}
    >
      {/* Card body — solid white so nothing bleeds through */}
      <div className="w-full h-full flex flex-col bg-white" style={{ userSelect: "none" }}>

        {/* ── Image / Emoji area ─────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
          {/* Colour wash overlay when dragging */}
          {isTop && (
            <>
              <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundColor: bgGreen }} />
              <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundColor: bgRed }} />
            </>
          )}

          {product.image_url || product.image ? (
            <img
              src={product.image_url || product.image}
              alt={product.name}
              className="w-full h-full object-cover opacity-90"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 select-none">
              <span className="text-8xl drop-shadow-2xl">{emoji}</span>
              <span className="text-white/30 font-mono text-xs uppercase tracking-widest">No image available</span>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-20" />

          {/* Product info overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-5">
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400 mb-1 opacity-90">
              {sourceName}
            </div>
            <h3 className="text-white font-extrabold text-xl leading-tight line-clamp-2 uppercase tracking-wide drop-shadow">
              {product.name}
            </h3>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                ₹{product.price}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-white/50 line-through text-base font-mono">
                  ₹{product.original_price}
                </span>
              )}
            </div>
          </div>

          {/* CART stamp */}
          {isTop && (
            <motion.div
              className="absolute top-6 right-5 z-40 px-4 py-2 rounded-xl border-4 border-emerald-400 text-emerald-400 font-black text-2xl uppercase tracking-widest select-none"
              style={{ opacity: cartOpacity, rotate: 12, background: "rgba(0,0,0,0.55)" }}
            >
              CART ❤️
            </motion.div>
          )}

          {/* NOPE stamp */}
          {isTop && (
            <motion.div
              className="absolute top-6 left-5 z-40 px-4 py-2 rounded-xl border-4 border-red-400 text-red-400 font-black text-2xl uppercase tracking-widest select-none"
              style={{ opacity: nopeOpacity, rotate: -12, background: "rgba(0,0,0,0.55)" }}
            >
              NOPE ✕
            </motion.div>
          )}
        </div>

        {/* ── Details strip ─────────────────────────────────────────────── */}
        <div className="bg-white px-5 py-4 border-t-2 border-slate-100 flex-shrink-0">
          <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
            {product.description || "AI-curated pick tailored to your preferences."}
          </p>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            {product.rating && (
              <span className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                ★ {product.rating}<span className="text-slate-400 font-normal">/5</span>
              </span>
            )}
            {product.delivery_time && (
              <span className="text-slate-500 text-xs font-mono">⚡ {product.delivery_time}</span>
            )}
            {product.quantity && (
              <span className="text-slate-500 text-xs font-mono">📦 {product.quantity}</span>
            )}
            {product.cuisine && (
              <span className="text-slate-500 text-xs font-mono">🍲 {product.cuisine}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component — no hooks inside conditionals ─────────────────────────────
export function TinderSwipe({ products, onSwipeRight, onSwipeLeft, onComplete }: TinderSwipeProps) {
  const [currentIndex, setCurrentIndex] = useState(products.length - 1);
  const dragControls = useAnimation();

  useEffect(() => {
    if (currentIndex < 0) {
      const t = setTimeout(() => onComplete(), 500);
      return () => clearTimeout(t);
    }
  }, [currentIndex, onComplete]);

  const swipe = (direction: "left" | "right") => {
    if (currentIndex < 0) return;
    const product = products[currentIndex];

    if (direction === "right") {
      onSwipeRight(product);
      dragControls.start({ x: 560, opacity: 0, transition: { duration: 0.32 } }).then(() => {
        setCurrentIndex((p) => p - 1);
      });
    } else {
      onSwipeLeft(product);
      dragControls.start({ x: -560, opacity: 0, transition: { duration: 0.32 } }).then(() => {
        setCurrentIndex((p) => p - 1);
      });
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > 100 || velocity.x > 500) {
      swipe("right");
    } else if (offset.x < -100 || velocity.x < -500) {
      swipe("left");
    } else {
      dragControls.start({ x: 0, transition: { type: "spring", stiffness: 320, damping: 22 } });
    }
  };

  // ── Empty / done states ────────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
        <p className="text-white/60 font-mono text-sm uppercase tracking-widest">Loading products...</p>
      </div>
    );
  }

  if (currentIndex < 0) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-3 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="text-3xl font-black text-white uppercase tracking-wide">Done!</h2>
        <p className="text-white/50 font-mono text-sm">Preparing your cart summary...</p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center w-full pb-6 select-none">
      {/* Hint row */}
      <div className="flex items-center gap-8 mb-4 text-xs font-mono uppercase tracking-widest">
        <span className="text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> Skip</span>
        <span className="text-white/30">— drag or tap —</span>
        <span className="text-emerald-400 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Add to Cart</span>
      </div>

      {/* Card stack */}
      <div className="relative w-[340px] h-[480px] sm:w-[390px] sm:h-[530px]">
        {products.map((product, index) => {
          if (index < currentIndex - 1) return null;
          return (
            <SwipeCard
              key={product.id ?? index}
              product={product}
              isTop={index === currentIndex}
              onDragEnd={handleDragEnd}
              dragControls={dragControls}
            />
          );
        })}
      </div>

      {/* Progress pills */}
      <div className="flex gap-2 mt-5">
        {products.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i > currentIndex
                ? "w-6 bg-emerald-500"
                : i === currentIndex
                ? "w-8 bg-yellow-400"
                : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-8 mt-6 z-20">
        <button
          onClick={() => swipe("left")}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/60 bg-white/5 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)] transition-all hover:bg-red-500/15 hover:scale-110 active:scale-95 backdrop-blur-sm"
          title="Skip"
        >
          <X className="h-7 w-7 stroke-[2.5]" />
        </button>
        <button
          onClick={() => swipe("right")}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-white/5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500/15 hover:scale-110 active:scale-95 backdrop-blur-sm"
          title="Add to Cart"
        >
          <Heart className="h-7 w-7 fill-current stroke-[2]" />
        </button>
      </div>
    </div>
  );
}
