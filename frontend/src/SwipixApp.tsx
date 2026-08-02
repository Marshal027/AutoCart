import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Lenis from "lenis";
import Nav from "./components/Nav.jsx";
import { ProductSwipeView, QuestionFlow } from "./components/SwipeScreens";
import { ShinyText } from "./components/ReactBits";
import { Pizza, ShoppingBag, ShoppingCart, Utensils, Sparkles, Shirt } from "lucide-react";
import { TinderSwipe } from "./components/TinderSwipe";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { LiveDealsPanel } from "./components/LiveDealsPanel";
import TargetCursor from "./TargetCursor";
import Stepper, { Step } from "./Stepper";

const API_BASE = "http://127.0.0.1:8000/api";

const CATEGORIES = [
  {
    id: "food",
    label: "Food",
    icon: "🍕",
    description: "Order meals & snacks",
  },
  {
    id: "groceries",
    label: "Groceries",
    icon: "🛒",
    description: "Daily essentials & more",
  },
  {
    id: "reservation",
    label: "Table Reservation",
    icon: "🍽️",
    description: "Book a restaurant table",
  },
  {
    id: "beauty",
    label: "Beauty & Grooming",
    icon: "✨",
    description: "Skincare, grooming & beauty",
  },
  {
    id: "apparel",
    label: "Footwear & Apparel",
    icon: "👟",
    description: "Shoes, clothing & fashion",
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

interface MCQQuestion {
  id: number;
  question: string;
  options: string[];
}

interface SwiggyProduct {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  original_price?: number;
  quantity: string;
  delivery_time: string;
  rating?: number;
  in_stock?: boolean;
  is_similar?: boolean;
  image_url?: string;
  description?: string;
  emoji?: string;
  url?: string;
  is_ai_recommended?: boolean;
}

interface SwiggyFoodDish {
  id: string | number;
  name: string;
  restaurant: string;
  price: number;
  original_price?: number;
  portion?: string;
  delivery_time: string;
  rating?: number;
  is_veg?: boolean;
  cuisine?: string;
  in_stock?: boolean;
  is_similar?: boolean;
  image_url?: string;
  emoji?: string;
  url?: string;
  is_ai_recommended?: boolean;
}

interface SwiggyMCPData {
  mcp_server: string;
  is_exact_match: boolean;
  match_notice: string;
  products: SwiggyProduct[];
}

interface SwiggyFoodMCPData {
  mcp_server: string;
  is_exact_match: boolean;
  match_notice: string;
  products: SwiggyFoodDish[];
}

interface SwiggyDineoutRestaurant {
  id: string | number;
  name: string;
  location: string;
  price: number;
  original_price?: number;
  rating?: number;
  cuisine?: string;
  table_available?: boolean;
  discount?: string;
  is_similar?: boolean;
  image_url?: string;
  emoji?: string;
  url?: string;
  is_ai_recommended?: boolean;
}

interface SwiggyDineoutMCPData {
  mcp_server: string;
  is_exact_match: boolean;
  match_notice: string;
  products: SwiggyDineoutRestaurant[];
}

interface FinalProductResult {
  exact_product: string;
  summary: string;
  key_attributes?: string[];
  swiggy_mcp?: SwiggyMCPData;
  swiggy_food_mcp?: SwiggyFoodMCPData;
  beauty_mcp?: SwiggyMCPData;
  apparel_mcp?: SwiggyMCPData;
  swiggy_dineout_mcp?: SwiggyDineoutMCPData;
}

interface CartItem {
  id: string | number;
  name: string;
  price: number;
  original_price?: number;
  quantity: number;
  source: string;
  url?: string;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // MCQ questions state
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [finalResult, setFinalResult] = useState<FinalProductResult | null>(
    null,
  );
  const [plannerResults, setPlannerResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"shopping" | "watchlist" | "deals">("shopping");
  useEffect(() => {
    if (questions.length > 0) {
      const newAnswers = { ...selectedAnswers };
      let changed = false;
      questions.forEach((q, idx) => {
        const qId = q.id !== undefined ? String(q.id) : `q_${idx}`;
        if (!newAnswers[qId] && q.options && q.options.length > 0) {
          newAnswers[qId] = q.options[0];
          changed = true;
        }
      });
      if (changed) setSelectedAnswers(newAnswers);
    }
  }, [questions]);

  // Tinder Swipe & Final Confirmation State
  const [showTinderSwipe, setShowTinderSwipe] = useState(false);
  const [swipeProducts, setSwipeProducts] = useState<any[]>([]);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);

  // Expanded Product / Dish Detail Modal State
  const [activeProduct, setActiveProduct] = useState<SwiggyProduct | null>(
    null,
  );
  const [activeFoodDish, setActiveFoodDish] = useState<SwiggyFoodDish | null>(
    null,
  );
  const [modalItemQty, setModalItemQty] = useState<number>(1);

  // Cart & Checkout State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Lock body scroll when SwipeView overlay is active
  useEffect(() => {
    if (plannerResults && plannerResults.tracks) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [plannerResults]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) {
      setQuery(q);
      handleValidate(q, null);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);
  const [isCartOpenMobile, setIsCartOpenMobile] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<
    "upi" | "card" | "cod"
  >("upi");
  const [isProcessingPayment, setIsProcessingPayment] =
    useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [bannerAlert, setBannerAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isListShopping, setIsListShopping] = useState(false);
  const [listFile, setListFile] = useState<File | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const toggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      window.alert("Your browser doesn't support speech recognition.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Wait to access the latest transcript state (closure issue)
      // A safer approach: since transcript is a state, we use effect or rely on final result.
      // But for simplicity, we just use the event.results array above in onresult if we want it synchronously.
    };

    recognition.start();
  };

  // We should watch for isListening to false and submit if transcript exists
  useEffect(() => {
    if (!isListening && transcript) {
      setQuery(transcript);
      handleValidate(transcript, null);
      setTranscript(""); // Clear for next time
    }
  }, [isListening, transcript]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleValidate = async (
    forcedQuery?: string,
    forcedCategory?: string | null,
  ) => {
    const activeQuery = forcedQuery !== undefined ? forcedQuery : query;

    if (!activeQuery.trim()) return;

    setLoading(true);
    setBannerAlert(null);
    setQuestions([]);
    setSelectedAnswers({});
    setFinalResult(null);
    setPlannerResults(null);
    setActiveProduct(null);
    setActiveFoodDish(null);

    try {
      const endpoint = `${API_BASE}/planner/validate/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery.trim() }),
      });

      const data = await res.json();

      if (data.valid) {
        if (
          data.questions &&
          Array.isArray(data.questions) &&
          data.questions.length > 0
        ) {
          setBannerAlert({
            type: "success",
            message:
              data.message ||
              "Input validated! Answer clarification questions below (optional).",
          });
          setQuestions(data.questions);
        } else {
          // If no questions, directly finalize
          handleFinalizeProduct(activeQuery, null);
        }
      } else {
        setBannerAlert({
          type: "error",
          message:
            data.message ||
            "That doesn't seem to match this category. Try something else.",
        });
      }
    } catch {
      setBannerAlert({
        type: "error",
        message: "Could not reach the server. Is the backend running?",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessList = async () => {
    if (!listFile) return;

    setLoading(true);
    setBannerAlert(null);

    try {
      const text = await listFile.text();
      const res = await fetch(`${API_BASE}/process-list/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_content: text }),
      });

      const data = await res.json();

      if (res.ok && data.cart_items) {
        let addedCount = 0;
        for (const item of data.cart_items) {
          handleAddToCart(
            item.id,
            item.name,
            item.price,
            1,
            item.source,
            (item as any).url,
          );
          addedCount++;
        }
        setBannerAlert({
          type: "success",
          message: `Successfully processed list and added ${addedCount} items to cart!`,
        });
        setListFile(null); // Clear after success
      } else {
        setBannerAlert({
          type: "error",
          message: data.error || "Failed to process shopping list.",
        });
      }
    } catch (err) {
      setBannerAlert({
        type: "error",
        message: "Error connecting to the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId: string | number, option: string) => {
    const key = String(questionId);
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      if (next[key] === option) {
        delete next[key];
      } else {
        next[key] = option;
      }
      return next;
    });
  };

  const handleFinalizeProduct = async (
    overrideQuery?: string | React.MouseEvent,
    overrideCategory?: string | null,
  ) => {
    // If overrideQuery is a mouse event, ignore it.
    const q = typeof overrideQuery === "string" ? overrideQuery : query;

    if (!q.trim()) return;

    setFinalizing(true);
    setFinalResult(null);
    setPlannerResults(null);
    setBannerAlert(null);

    const formattedAnswers = questions.map((q) => ({
      question: q.question,
      answer: selectedAnswers[String(q.id)] || "Skipped (No preference)",
    }));

    setQuestions([]); // Close the overlay immediately

    try {
      const endpoint = `${API_BASE}/planner/finalize/`;
      const payload = { query: q.trim(), answers: formattedAnswers };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && (data.exact_product || data.tracks)) {
        if (data.exact_product) {
          setFinalResult(data);
          let prods: any[] = [];
          if (data.swiggy_mcp) prods = data.swiggy_mcp.products;
          else if (data.swiggy_food_mcp) prods = data.swiggy_food_mcp.products;
          else if (data.beauty_mcp) prods = data.beauty_mcp.products;
          else if (data.apparel_mcp) prods = data.apparel_mcp.products;
          else if (data.swiggy_dineout_mcp)
            prods = data.swiggy_dineout_mcp.products;
          setSwipeProducts(prods);
          setShowTinderSwipe(true);
        } else if (data.tracks) {
          setPlannerResults(data);
          navigate("/shop/products");
        }
        setBannerAlert({
          type: "success",
          message:
            "AI product specification complete! Details logged to console.",
        });
      } else {
        setBannerAlert({
          type: "error",
          message: data.error || "Failed to narrow down product.",
        });
      }
    } catch {
      setBannerAlert({
        type: "error",
        message: "Network error finalizing product specification.",
      });
    } finally {
      setFinalizing(false);
    }
  };

  const handleAddToCart = (
    id: string | number,
    name: string,
    price: number,
    count: number = 1,
    source: string = "Swiggy",
    url?: string,
  ) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => String(item.id) === String(id),
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + count,
        };
        return updated;
      }
      return [...prev, { id, name, price, quantity: count, source, url }];
    });
    showToast(`Added ${count}x "${name}" to Cart! 🛒`);
  };

  const handleUpdateQty = (id: string | number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (String(item.id) === String(id)) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null),
    );
  };

  const handleRemoveItem = (id: string | number) => {
    setCartItems((prev) =>
      prev.filter((item) => String(item.id) !== String(id)),
    );
    showToast("Item removed from cart 🗑️");
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const deliveryFee = cartSubtotal > 0 ? (cartSubtotal > 500 ? 0 : 25) : 0;
  const taxesAndFees = cartSubtotal > 0 ? 15 : 0;
  const grandTotal = cartSubtotal + deliveryFee + taxesAndFees;

  const handlePlaceOrder = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setOrderSuccess(true);
      setCartItems([]);
    }, 1400);
  };

  const openProductModal = (prod: SwiggyProduct) => {
    setActiveProduct(prod);
    setModalItemQty(1);
  };

  const openFoodModal = (dish: SwiggyFoodDish) => {
    setActiveFoodDish(dish);
    setModalItemQty(1);
  };

  const resetAll = () => {
    setQuery("");
    setQuestions([]);
    setSelectedAnswers({});
    setFinalResult(null);
    setPlannerResults(null);
    setActiveProduct(null);
    setActiveFoodDish(null);
    setBannerAlert(null);
    setShowTinderSwipe(false);
    setShowFinalConfirmation(false);
    setSwipeProducts([]);
  };

  return (
    <div className="swipix-app swipix-app-body app-wrapper app-wrapper--with-sidebar">
      <TargetCursor
        hideDefaultCursor={false}
        cursorColor="#0e23a6"
        cursorColorOnTarget="#d93d3d"
      />
      {/* Ambient glow blobs */}
      <div className="glow glow--1" />
      <div className="glow glow--2" />

      {/* ── LEFT SIDEBAR CART ─────────────────────────────────── */}
      <aside
        className={`left-cart-sidebar ${isCartOpenMobile ? "left-cart-sidebar--open" : ""}`}
      >
        <div className="cart-header">
          <div className="cart-header__title-wrap">
            <span className="cart-header__icon">🛒</span>
            <h2 className="cart-header__title">Your Cart</h2>
            <span className="cart-header__badge">{totalCartCount} items</span>
          </div>

          {cartItems.length > 0 && (
            <button
              className="cart-clear-btn"
              onClick={handleClearCart}
              title="Clear Cart"
            >
              Clear All
            </button>
          )}

          <button
            className="cart-close-mobile"
            onClick={() => setIsCartOpenMobile(false)}
            aria-label="Close cart drawer"
          >
            ✕
          </button>
        </div>

        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <span className="cart-empty-icon">🛍️</span>
              <h3 className="cart-empty-title">Your Cart is Empty</h3>
              <p className="cart-empty-desc">
                Select items from Swiggy Instamart or Food catalogs to start
                adding products!
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item-card">
                <div className="cart-item-top">
                  <span
                    className={`cart-item-source ${
                      item.source.toLowerCase().includes("instamart")
                        ? "cart-item-source--instamart"
                        : ""
                    }`}
                  >
                    {item.source}
                  </span>
                  <button
                    className="cart-item-remove"
                    onClick={() => handleRemoveItem(item.id)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>

                <div className="cart-item-name">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--theme-accent)",
                        textDecoration: "none",
                      }}
                    >
                      {item.name} ↗
                    </a>
                  ) : (
                    item.name
                  )}
                </div>

                <div className="cart-item-bottom">
                  <div className="cart-item-price-wrap">
                    <span className="cart-item-unit-price">
                      ₹{item.price} each
                    </span>
                    <span className="cart-item-total-price">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>

                  <div className="cart-item-qty-selector">
                    <button
                      className="cart-item-qty-btn"
                      onClick={() => handleUpdateQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="cart-item-qty-num">{item.quantity}</span>
                    <button
                      className="cart-item-qty-btn"
                      onClick={() => handleUpdateQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-summary-rows">
            <div className="cart-summary-row">
              <span>Items Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            <div className="cart-summary-row">
              <span>Delivery Charges</span>
              <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
            </div>
            <div className="cart-summary-row">
              <span>Taxes & Packaging</span>
              <span>₹{taxesAndFees}</span>
            </div>
            <div className="cart-summary-row cart-summary-row--total">
              <span>Grand Total</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>

          <button
            id="checkout-btn"
            className="cart-checkout-btn"
            disabled={cartItems.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            <span className="checkout-btn-label">
              <span>Proceed to Checkout</span>
            </span>
            <span className="checkout-btn-label">
              <span>₹{grandTotal}</span>
              <span className="checkout-btn-arrow">→</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      <Nav>
        {/* Cart Button in Navbar */}
        <div
          className="desktop-cart-slot items-center gap-4 mr-4"
          style={{ marginLeft: "auto" }}
        >
          {totalCartCount > 0 && (
            <div
              className="cart-badge"
              onClick={() => setIsCartOpenMobile(true)}
              style={{
                cursor: "pointer",
                background: "rgba(255,255,255,0.1)",
                padding: "8px 16px",
                borderRadius: "20px",
              }}
            >
              🛒{" "}
              <span style={{ marginLeft: "4px", fontWeight: "bold" }}>
                {totalCartCount} Items
              </span>
            </div>
          )}
        </div>
      </Nav>

      <main className="container" style={{ paddingTop: "60px" }}>
        {/* Search Input — Below Nav */}
        <div
          className="voice-bar-section compact w-full max-w-3xl mx-auto px-4"
          style={{ padding: 0, background: "transparent" }}
        >
          <div
            className="voice-bar-container w-full"
            style={{ maxWidth: "100%", height: "68px" }}
          >
            <button
              type="button"
              className="voice-btn"
              onClick={() => navigate("/vision")}
              style={{ marginRight: "12px" }}
              title="Visual Search"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
            <button
              type="button"
              className={`voice-btn ${isListening ? "recording" : ""}`}
              onClick={toggleListen}
              style={{ marginRight: "16px" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>

            <div className="input-wrap" style={{ flex: 1 }}>
              {isListening ? (
                <div
                  className="voice-input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                    fontSize: "1.25rem",
                  }}
                >
                  {transcript || "Listening..."}
                </div>
              ) : (
                <input
                  id="search-input"
                  className="voice-input"
                  type="text"
                  placeholder="Ask Trigr to find something..."
                  value={query}
                  style={{ width: "100%", fontSize: "1.25rem" }}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setQuestions([]);
                    setSelectedAnswers({});
                    setFinalResult(null);
                    setPlannerResults(null);
                    setActiveProduct(null);
                    setActiveFoodDish(null);
                    setBannerAlert(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && questions.length === 0)
                      handleValidate();
                  }}
                />
              )}
            </div>

            {query && (
              <button
                className="search-btn"
                style={{ background: "transparent", color: "#ef4444" }}
                onClick={() => {
                  setQuery("");
                  setQuestions([]);
                  setSelectedAnswers({});
                  setFinalResult(null);
                  setPlannerResults(null);
                  setActiveProduct(null);
                  setActiveFoodDish(null);
                  setBannerAlert(null);
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Secondary Toolbar */}
        <div className="flex justify-end items-center mb-4 px-4">
          <div className="flex items-center gap-4 md:hidden">
            <button
              className="mobile-cart-toggle-btn"
              onClick={() => setIsCartOpenMobile(!isCartOpenMobile)}
            >
              🛒 Cart ({totalCartCount})
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 w-full max-w-7xl mx-auto mt-4">
          {/* Main Content Area (Centered Search + Validate) */}
          <div className="flex-1 flex flex-col items-center justify-start ">
            {/* Validate Action button */}
            {!isListShopping &&
              query.trim() &&
              questions.length === 0 &&
              !finalResult &&
              !plannerResults && (
                <button
                  id="continue-btn"
                  className="cta-btn"
                  style={{
                    width: "100%",
                    maxWidth: "280px",
                    display: "flex",
                    justifyContent: "center",
                  }}
                  onClick={() => handleValidate()}
                  disabled={loading || finalizing}
                >
                  {loading || finalizing ? (
                    <>
                      <span className="cta-btn__spinner" />
                      {finalizing ? "Building AI Plan..." : "Processing..."}
                    </>
                  ) : (
                    <>Validate & Continue</>
                  )}
                </button>
              )}

            {/* Alert Banner */}
            {bannerAlert && (
              <div
                className={`alert alert--${bannerAlert.type} w-full max-w-2xl mt-4`}
              >
                <span className="alert__icon">
                  {bannerAlert.type === "success" ? "✅" : "⚠️"}
                </span>
                <p className="alert__text">{bannerAlert.message}</p>
                <button
                  className="alert__close"
                  onClick={() => setBannerAlert(null)}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-8 border-b border-border-col">
          <div className="flex w-full items-center justify-start gap-4">
            <button
              className={`px-8 py-3 font-['Space_Mono'] font-bold text-sm uppercase tracking-widest transition-all ${activeTab === "shopping" ? "text-accent border-b-2 border-accent" : "text-text/50 hover:text-text"}`}
              onClick={() => setActiveTab("shopping")}
            >
              Shopping
            </button>
            <button
              className={`px-8 py-3 font-['Space_Mono'] font-bold text-sm uppercase tracking-widest transition-all ${activeTab === "watchlist" ? "text-accent border-b-2 border-accent" : "text-text/50 hover:text-text"}`}
              onClick={() => setActiveTab("watchlist")}
            >
              Watchlist
            </button>
            <button
              className={`px-8 py-3 font-['Space_Mono'] font-bold text-sm uppercase tracking-widest transition-all ${activeTab === "deals" ? "text-accent border-b-2 border-accent" : "text-text/50 hover:text-text"}`}
              onClick={() => setActiveTab("deals")}
            >
              Live Deals
            </button>
          </div>
        </div>

        {activeTab === "watchlist" && (
          <div className="mt-8">
            <WatchlistPanel onAddToCart={handleAddToCart} />
          </div>
        )}

        {activeTab === "deals" && (
          <div className="mt-8">
            <LiveDealsPanel query={query || undefined} />
          </div>
        )}

        {activeTab === "shopping" && (
          <>
            {/* ── 4 MCQ Clarification Questions Section (Optional) ──────────── */}
            {questions.length > 0 && !finalResult && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1050,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "1rem",
                    paddingRight: "1rem",
                  }}
                >
                  <button
                    onClick={() => handleFinalizeProduct()}
                    className="cursor-target px-4 py-2 bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors font-semibold"
                  >
                    Skip ⏭
                  </button>
                </div>
                <Stepper
                  initialStep={1}
                  onFinalStepCompleted={handleFinalizeProduct}
                  backButtonText="Previous"
                  nextButtonText="Done"
                  hideStepIndicators={true}
                  renderStepIndicator={() => null}
                  style={{ width: "100%", maxWidth: "600px" }}
                >
                  {questions.map((q, idx) => {
                    const qId = q.id !== undefined ? String(q.id) : `q_${idx}`;
                    return (
                      <Step key={qId}>
                        <h2
                          className="text-xl font-bold text-white mb-6 text-center cursor-target"
                          style={{ fontFamily: "Space Mono" }}
                        >
                          {q.question}
                        </h2>
                        <div className="flex flex-col gap-3 mb-4">
                          {q.options &&
                            q.options.map((opt) => (
                              <button
                                key={opt}
                                className={`cursor-target p-4 rounded-xl text-left transition-all ${selectedAnswers[qId] === opt ? "bg-[#5227ff] text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                                onClick={() => handleOptionSelect(qId, opt)}
                              >
                                {opt}
                              </button>
                            ))}
                        </div>
                      </Step>
                    );
                  })}
                </Stepper>
              </div>
            )}

            {plannerResults && location.pathname.includes("/shop/products") && (
              <ProductSwipeView
                tracks={plannerResults.tracks}
                goal={query}
                summary={plannerResults.summary}
                answers={selectedAnswers}
                onReset={() => {
                  setPlannerResults(null);
                  setQuery("");
                  setQuestions([]);
                  setSelectedAnswers({});
                  navigate("/shop");
                }}
              />
            )}

            {/* ── Tinder Swipe: Shows directly after AI identifies product ──── */}
            {finalResult && showTinderSwipe && swipeProducts.length > 0 && (
              <section className="results-container">
                {/* Small pill showing what AI found */}
                <div className="flex flex-col items-center mb-6">
                  <span className="result-badge mb-2">
                    🎯 Found: {finalResult.exact_product}
                  </span>
                  <p className="text-text/50 text-xs font-['Space_Mono'] text-center">
                    Swipe ❤️ to add to cart · Swipe ✕ to skip
                  </p>
                </div>
                <TinderSwipe
                  products={swipeProducts}
                  onSwipeRight={(prod) => {
                    handleAddToCart(
                      prod.id,
                      prod.name,
                      prod.price,
                      1,
                      prod.brand || "AI Product",
                      prod.url,
                    );
                  }}
                  onSwipeLeft={(prod) => {
                    console.log("Passed on", prod.name);
                  }}
                  onComplete={() => {
                    setShowTinderSwipe(false);
                    setShowFinalConfirmation(true);
                  }}
                />
              </section>
            )}

            {/* ── No products found fallback ─────────────────────────────────── */}
            {finalResult &&
              !showTinderSwipe &&
              !showFinalConfirmation &&
              swipeProducts.length === 0 && (
                <section className="results-container">
                  <div className="result-card">
                    <div className="result-badge">
                      🎯 AI Identified Exact Want
                    </div>
                    <h2 className="result-title">
                      {finalResult.exact_product}
                    </h2>
                    <p className="result-summary">{finalResult.summary}</p>
                    <p className="text-amber-400 mt-4 text-sm font-['Space_Mono']">
                      ⚠️ No products returned from MCP. Try a different query.
                    </p>
                  </div>
                </section>
              )}

            {/* Legacy block placeholder - keep opening tag for other existing sections */}
            {finalResult && <section style={{ display: "none" }}></section>}

            {/* ── Final Confirmation ─────────────────────────────────────── */}
            {showFinalConfirmation && (
              <section className="results-container">
                <h2 className="text-3xl font-bold font-['Oswald'] text-center text-text uppercase mb-6">
                  🛒 Final Confirmation
                </h2>
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text/60 font-['Space_Mono']">
                      No items were added to cart.
                    </p>
                    <button className="mt-6 reset-btn" onClick={resetAll}>
                      Start New Search 🔄
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl mx-auto mb-8">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="border border-accent/40 bg-white dark:bg-black/80 p-5 rounded-xl flex items-center justify-between shadow-[0_0_20px_rgba(221,198,85,0.15)]"
                        >
                          <div>
                            <div className="text-xs text-text/50 uppercase font-['Space_Mono'] mb-1">
                              {item.source}
                            </div>
                            <div className="text-lg font-bold text-text">
                              {item.name}
                            </div>
                            <div className="text-accent mt-2 font-bold font-['Space_Mono']">
                              ₹{item.price} × {item.quantity}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:bg-red-500/20 p-2 rounded-full transition-colors text-xl"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="border border-accent/40 bg-white dark:bg-black/80 p-8 rounded-xl w-full max-w-md mx-auto text-center">
                      <div className="text-text/60 mb-2 font-['Space_Mono'] text-sm">
                        Grand Total
                      </div>
                      <div className="text-5xl font-bold text-accent mb-6">
                        ₹{grandTotal}
                      </div>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={isProcessingPayment}
                        className="w-full bg-accent text-bg font-bold font-['Oswald'] uppercase tracking-widest py-4 rounded-lg hover:opacity-90 transition-opacity text-lg"
                      >
                        {isProcessingPayment
                          ? "Processing..."
                          : "Confirm & Buy ✅"}
                      </button>
                      <button
                        className="mt-4 w-full reset-btn"
                        onClick={resetAll}
                      >
                        Start New Search 🔄
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ── EXPANDED SWIGGY FOOD DISH MODAL ───────────────────────────── */}
            {activeFoodDish && (
              <div
                className="modal-backdrop"
                onClick={() => setActiveFoodDish(null)}
              >
                <div
                  className="modal-content modal-content--full-details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="modal-close-btn"
                    onClick={() => setActiveFoodDish(null)}
                    aria-label="Close details"
                  >
                    ✕
                  </button>

                  <div className="modal-details-container">
                    <div className="modal-header-section">
                      <div className="modal-badge-group">
                        <span className="modal-brand-tag">
                          {activeFoodDish.restaurant}
                        </span>
                        <span className="modal-delivery-tag">
                          ⚡ Food Delivery ({activeFoodDish.delivery_time})
                        </span>
                        <span className="modal-mcp-badge">
                          mcp.swiggy.com/food
                        </span>
                      </div>
                      <h2 className="modal-title">{activeFoodDish.name}</h2>
                    </div>

                    <div className="modal-price-box">
                      <div className="modal-price-main">
                        <span className="modal-current-price">
                          ₹{activeFoodDish.price}
                        </span>
                        {activeFoodDish.original_price &&
                          activeFoodDish.original_price >
                            activeFoodDish.price && (
                            <>
                              <span className="modal-original-price">
                                ₹{activeFoodDish.original_price}
                              </span>
                              <span className="modal-discount-tag">
                                {Math.round(
                                  ((activeFoodDish.original_price -
                                    activeFoodDish.price) /
                                    activeFoodDish.original_price) *
                                    100,
                                )}
                                % OFF
                              </span>
                              <span className="modal-save-amount">
                                Save ₹
                                {activeFoodDish.original_price -
                                  activeFoodDish.price}
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
                          {activeFoodDish.portion ||
                            "Standard Portion (Serves 1-2)"}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">🍲 Cuisine Type</span>
                        <span className="spec-value">
                          {activeFoodDish.cuisine || "Multi-Cuisine"}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">🌱 Dietary Badge</span>
                        <span className="spec-value">
                          {activeFoodDish.is_veg !== false
                            ? "🟢 Pure Veg Dish"
                            : "🔴 Non-Veg Dish"}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">⭐ Restaurant Rating</span>
                        <span className="spec-value">
                          {activeFoodDish.rating || 4.5} / 5.0 (Swiggy Verified)
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">⚡ Delivery Time</span>
                        <span className="spec-value">
                          {activeFoodDish.delivery_time}
                        </span>
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
                          🔥 Prepared fresh on order receipt in hygienic
                          restaurant kitchens
                        </li>
                        <li>
                          📦 Spill-proof, eco-friendly insulated hot delivery
                          container
                        </li>
                        <li>
                          ⚡ Live GPS courier tracking straight to your doorstep
                        </li>
                      </ul>
                    </div>

                    <div className="modal-actions">
                      <div className="modal-qty-selector">
                        <button
                          className="modal-qty-btn"
                          onClick={() =>
                            setModalItemQty((q) => Math.max(1, q - 1))
                          }
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

                      <button
                        className="modal-add-cart-btn"
                        onClick={() => {
                          handleAddToCart(
                            activeFoodDish.id,
                            activeFoodDish.name,
                            activeFoodDish.price,
                            modalItemQty,
                            "Swiggy Food",
                            activeFoodDish.url,
                          );
                          setActiveFoodDish(null);
                        }}
                      >
                        Add {modalItemQty} Dish to Food Cart • ₹
                        {activeFoodDish.price * modalItemQty}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── EXPANDED SWIGGY GROCERY PRODUCT MODAL ─────────────────────── */}
            {activeProduct && (
              <div
                className="modal-backdrop"
                onClick={() => setActiveProduct(null)}
              >
                <div
                  className="modal-content modal-content--full-details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="modal-close-btn"
                    onClick={() => setActiveProduct(null)}
                    aria-label="Close details"
                  >
                    ✕
                  </button>

                  <div className="modal-details-container">
                    <div className="modal-header-section">
                      <div className="modal-badge-group">
                        <span className="modal-brand-tag">
                          {activeProduct.brand}
                        </span>
                        <span className="modal-delivery-tag">
                          ⚡ Express Delivery ({activeProduct.delivery_time})
                        </span>
                        <span className="modal-mcp-badge">
                          Swiggy Instamart Verified
                        </span>
                      </div>
                      <h2 className="modal-title">{activeProduct.name}</h2>
                    </div>

                    <div className="modal-price-box">
                      <div className="modal-price-main">
                        <span className="modal-current-price">
                          ₹{activeProduct.price}
                        </span>
                        {activeProduct.original_price &&
                          activeProduct.original_price >
                            activeProduct.price && (
                            <>
                              <span className="modal-original-price">
                                ₹{activeProduct.original_price}
                              </span>
                              <span className="modal-discount-tag">
                                {Math.round(
                                  ((activeProduct.original_price -
                                    activeProduct.price) /
                                    activeProduct.original_price) *
                                    100,
                                )}
                                % OFF
                              </span>
                              <span className="modal-save-amount">
                                Save ₹
                                {activeProduct.original_price -
                                  activeProduct.price}
                              </span>
                            </>
                          )}
                      </div>
                      <p className="modal-tax-note">
                        Price inclusive of all taxes • Swiggy Instamart Instant
                        Billing
                      </p>
                    </div>

                    <div className="modal-spec-grid">
                      <div className="spec-item">
                        <span className="spec-label">📦 Pack Quantity</span>
                        <span className="spec-value">
                          {activeProduct.quantity}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">⚡ Delivery Speed</span>
                        <span className="spec-value">
                          {activeProduct.delivery_time}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">⭐ Rating & Reviews</span>
                        <span className="spec-value">
                          {activeProduct.rating || 4.8} / 5.0 (Instamart
                          Verified)
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">
                          🟢 Stock Availability
                        </span>
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
                          🔄 Instant refund / replacement guarantee if damaged
                          or unsatisfied
                        </li>
                      </ul>
                    </div>

                    <div className="modal-actions">
                      <div className="modal-qty-selector">
                        <button
                          className="modal-qty-btn"
                          onClick={() =>
                            setModalItemQty((q) => Math.max(1, q - 1))
                          }
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

                      <button
                        className="modal-add-cart-btn"
                        onClick={() => {
                          handleAddToCart(
                            activeProduct.id,
                            activeProduct.name,
                            activeProduct.price,
                            modalItemQty,
                            "Swiggy Instamart",
                            activeProduct.url,
                          );
                          setActiveProduct(null);
                        }}
                      >
                        Add {modalItemQty} to Instamart Cart • ₹
                        {activeProduct.price * modalItemQty}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── CHECKOUT MODAL ────────────────────────────────────── */}
            {isCheckoutOpen && (
              <div
                className="modal-backdrop"
                onClick={() => setIsCheckoutOpen(false)}
              >
                <div
                  className="modal-content modal-content--full-details checkout-modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="modal-close-btn"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setOrderSuccess(false);
                    }}
                    aria-label="Close checkout"
                  >
                    ✕
                  </button>

                  {orderSuccess ? (
                    <div className="checkout-success-container">
                      <span className="checkout-success-icon">🎉</span>
                      <h2 className="checkout-success-title">
                        Order Placed Successfully!
                      </h2>
                      <p className="checkout-success-sub">
                        Your order has been confirmed. Swiggy Express partner is
                        assigned and will deliver your order shortly!
                      </p>
                      <button
                        className="cta-btn"
                        style={{ marginTop: "12px" }}
                        onClick={() => {
                          setIsCheckoutOpen(false);
                          setOrderSuccess(false);
                        }}
                      >
                        Done & Continue Swiping ⚡
                      </button>
                    </div>
                  ) : (
                    <div className="modal-details-container">
                      <div className="checkout-header">
                        <h2 className="checkout-title">
                          <span>🛍️</span> Complete Your Order
                        </h2>
                        <span className="cart-header__badge">
                          {totalCartCount} items
                        </span>
                      </div>

                      <div className="checkout-section">
                        <span className="checkout-section-title">
                          Delivery Address
                        </span>
                        <div className="checkout-address-card">
                          <div className="checkout-address-info">
                            <span className="checkout-address-tag">
                              🏡 Home Address
                            </span>
                            <span className="checkout-address-text">
                              122, Indiranagar 100ft Road, Bengaluru, Karnataka
                              (560038)
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#6c5ce7",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Change
                          </span>
                        </div>
                      </div>

                      <div className="checkout-section">
                        <span className="checkout-section-title">
                          Order Items ({cartItems.length})
                        </span>
                        <div className="checkout-order-items">
                          {cartItems.map((item) => (
                            <div
                              key={item.id}
                              className="checkout-order-item-row"
                            >
                              <span className="checkout-order-item-name">
                                {item.quantity}x {item.name}
                              </span>
                              <span className="checkout-order-item-price">
                                ₹{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="checkout-section">
                        <span className="checkout-section-title">
                          Select Payment Method
                        </span>
                        <div className="checkout-payment-methods">
                          <div
                            className={`payment-method-card ${
                              selectedPayment === "upi"
                                ? "payment-method-card--selected"
                                : ""
                            }`}
                            onClick={() => setSelectedPayment("upi")}
                          >
                            <span className="payment-method-icon">⚡</span>
                            <span>UPI / GPay</span>
                          </div>
                          <div
                            className={`payment-method-card ${
                              selectedPayment === "card"
                                ? "payment-method-card--selected"
                                : ""
                            }`}
                            onClick={() => setSelectedPayment("card")}
                          >
                            <span className="payment-method-icon">💳</span>
                            <span>Card</span>
                          </div>
                          <div
                            className={`payment-method-card ${
                              selectedPayment === "cod"
                                ? "payment-method-card--selected"
                                : ""
                            }`}
                            onClick={() => setSelectedPayment("cod")}
                          >
                            <span className="payment-method-icon">💵</span>
                            <span>Cash</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="cart-summary-rows"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          padding: "12px",
                          borderRadius: "10px",
                        }}
                      >
                        <div className="cart-summary-row">
                          <span>Subtotal</span>
                          <span>₹{cartSubtotal}</span>
                        </div>
                        <div className="cart-summary-row">
                          <span>Delivery Fee</span>
                          <span>
                            {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                          </span>
                        </div>
                        <div className="cart-summary-row">
                          <span>Taxes & Platform</span>
                          <span>₹{taxesAndFees}</span>
                        </div>
                        <div className="cart-summary-row cart-summary-row--total">
                          <span>Total Amount Payable</span>
                          <span style={{ color: "#34d399" }}>
                            ₹{grandTotal}
                          </span>
                        </div>
                      </div>

                      <button
                        className="cart-checkout-btn"
                        disabled={isProcessingPayment}
                        onClick={handlePlaceOrder}
                        style={{ marginTop: "8px" }}
                      >
                        {isProcessingPayment ? (
                          <span
                            className="checkout-btn-label"
                            style={{ margin: "0 auto" }}
                          >
                            <span className="cta-btn__spinner" />
                            Processing Payment...
                          </span>
                        ) : (
                          <>
                            <span className="checkout-btn-label">
                              <span>Pay & Place Order</span>
                            </span>
                            <span className="checkout-btn-label">
                              <span>₹{grandTotal}</span>
                              <span className="checkout-btn-arrow">→</span>
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
