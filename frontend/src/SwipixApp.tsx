import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Lenis from 'lenis';
import Nav from "./components/Nav.jsx";
import { ProductSwipeView, QuestionFlow, useWatchlist, toggleWatchlist } from "./components/SwipeScreens";
import { ShinyText } from "./components/ReactBits";
import CircularGallery from "./components/CircularGallery.jsx";
import { TrendingDown, Pizza, ShoppingBag, ShoppingCart, Utensils, Sparkles, Shirt } from "lucide-react";
import { SmartSavings } from "./components/SmartSavings";

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
  const watchlistItems = useWatchlist();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CategoryId | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // MCQ questions state
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [finalResult, setFinalResult] = useState<FinalProductResult | null>(null);
  const [plannerResults, setPlannerResults] = useState<any>(null);

  // Expanded Product / Dish Detail Modal State
  const [activeProduct, setActiveProduct] = useState<SwiggyProduct | null>(null);
  const [activeFoodDish, setActiveFoodDish] = useState<SwiggyFoodDish | null>(null);
  const [modalItemQty, setModalItemQty] = useState<number>(1);

  // Cart & Checkout State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
  const [selectedPayment, setSelectedPayment] = useState<"upi" | "card" | "cod">("upi");
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isListShopping, setIsListShopping] = useState(false);
  const [activeTab, setActiveTab] = useState<"shopping" | "deals" | "watchlist">("shopping");
  const [listFile, setListFile] = useState<File | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
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
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition.");
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
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
      setTranscript(''); // Clear for next time
    }
  }, [isListening, transcript]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleValidate = async (forcedQuery?: string, forcedCategory?: string | null) => {
    const activeQuery = forcedQuery !== undefined ? forcedQuery : query;
    const activeCategory = forcedCategory !== undefined ? forcedCategory : selected;

    if (!activeQuery.trim()) return;

    setLoading(true);
    setAlert(null);
    setQuestions([]);
    setSelectedAnswers({});
    setFinalResult(null);
    setPlannerResults(null);
    setActiveProduct(null);
    setActiveFoodDish(null);

    try {
      const endpoint = activeCategory ? `${API_BASE}/validate/` : `${API_BASE}/planner/validate/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeCategory ? { category: activeCategory, query: activeQuery.trim() } : { query: activeQuery.trim() }),
      });

      const data = await res.json();

      if (data.valid) {
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setAlert({
            type: "success",
            message: data.message || "Input validated! Answer clarification questions below (optional).",
          });
          setQuestions(data.questions);
        } else {
          // If no questions, directly finalize
          handleFinalizeProduct(activeQuery, activeCategory);
        }
      } else {
        setAlert({
          type: "error",
          message:
            data.message ||
            "That doesn't seem to match this category. Try something else.",
        });
      }
    } catch {
      setAlert({
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
    setAlert(null);
    
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
          handleAddToCart(item.id, item.name, item.price, 1, item.source, (item as any).url);
          addedCount++;
        }
        setAlert({
          type: "success",
          message: `Successfully processed list and added ${addedCount} items to cart!`,
        });
        setListFile(null); // Clear after success
      } else {
        setAlert({
          type: "error",
          message: data.error || "Failed to process shopping list.",
        });
      }
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error connecting to the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId: number, option: string) => {
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      if (next[questionId] === option) {
        delete next[questionId];
      } else {
        next[questionId] = option;
      }
      return next;
    });
  };

  const handleFinalizeProduct = async (overrideQuery?: string | React.MouseEvent, overrideCategory?: string | null) => {
    // If overrideQuery is a mouse event, ignore it.
    const q = typeof overrideQuery === "string" ? overrideQuery : query;
    const c = overrideCategory !== undefined && typeof overrideQuery === "string" ? overrideCategory : selected;

    if (!q.trim()) return;

    setFinalizing(true);
    setFinalResult(null);
    setPlannerResults(null);
    setAlert(null);

    const formattedAnswers = questions.map((q) => ({
      question: q.question,
      answer: selectedAnswers[q.id] || "Skipped (No preference)",
    }));

    try {
      const endpoint = c ? `${API_BASE}/finalize/` : `${API_BASE}/planner/finalize/`;
      const payload = c 
        ? { category: c, query: q.trim(), answers: formattedAnswers }
        : { query: q.trim(), answers: formattedAnswers };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && (data.exact_product || data.tracks)) {
        if (data.exact_product) {
          setFinalResult(data);
        } else if (data.tracks) {
          setPlannerResults(data);
        }
        setAlert({
          type: "success",
          message: "AI product specification complete! Details logged to console.",
        });
      } else {
        setAlert({
          type: "error",
          message: data.error || "Failed to narrow down product.",
        });
      }
    } catch {
      setAlert({
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
    url?: string
  ) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => String(item.id) === String(id));
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
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveItem = (id: string | number) => {
    setCartItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
    showToast("Item removed from cart 🗑️");
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
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
    setSelected(null);
    setQuestions([]);
    setSelectedAnswers({});
    setFinalResult(null);
    setPlannerResults(null);
    setActiveProduct(null);
    setActiveFoodDish(null);
    setAlert(null);
  };

  return (
    <div className="swipix-app swipix-app-body app-wrapper app-wrapper--with-sidebar">
      {/* Ambient glow blobs */}
      <div className="glow glow--1" />
      <div className="glow glow--2" />

      {/* ── LEFT SIDEBAR CART ─────────────────────────────────── */}
      <aside className={`left-cart-sidebar ${isCartOpenMobile ? "left-cart-sidebar--open" : ""}`}>
        <div className="cart-header">
          <div className="cart-header__title-wrap">
            <span className="cart-header__icon">🛒</span>
            <h2 className="cart-header__title">Your Cart</h2>
            <span className="cart-header__badge">{totalCartCount} items</span>
          </div>

          {cartItems.length > 0 && (
            <button className="cart-clear-btn" onClick={handleClearCart} title="Clear Cart">
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
                Select items from Swiggy Instamart or Food catalogs to start adding products!
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item-card">
                <div className="cart-item-top">
                  <span
                    className={`cart-item-source ${
                      item.source.toLowerCase().includes("instamart") ? "cart-item-source--instamart" : ""
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
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{color: "var(--theme-accent)", textDecoration: "none"}}>
                      {item.name} ↗
                    </a>
                  ) : (
                    item.name
                  )}
                </div>

                <div className="cart-item-bottom">
                  <div className="cart-item-price-wrap">
                    <span className="cart-item-unit-price">₹{item.price} each</span>
                    <span className="cart-item-total-price">₹{item.price * item.quantity}</span>
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
        <div className="flex items-center gap-4 mr-4 hidden md:flex" style={{ marginLeft: 'auto' }}>
          {totalCartCount > 0 && (
            <div
              className="cart-badge"
              onClick={() => setIsCartOpenMobile(true)}
              style={{ cursor: "pointer", background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '20px' }}
            >
              🛒 <span style={{ marginLeft: '4px', fontWeight: 'bold' }}>{totalCartCount} Items</span>
            </div>
          )}
        </div>
      </Nav>

      <main className="container" style={{ paddingTop: '60px' }}>
        
        {/* Search Input — Below Nav */}
        <div className="voice-bar-section compact w-full max-w-2xl mx-auto " style={{ padding: 0, background: 'transparent' }}>
          <div className="voice-bar-container w-full" style={{ maxWidth: '100%', height: '64px' }}>
            <button
              type="button"
              className="voice-btn"
              onClick={() => navigate('/vision')}
              style={{ marginRight: '12px' }}
              title="Visual Search"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
            <button 
              type="button" 
              className={`voice-btn ${isListening ? "recording" : ""}`}
              onClick={toggleListen}
              style={{ marginRight: '16px' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            
            <div className="input-wrap" style={{ flex: 1 }}>
              {isListening ? (
                <div className="voice-input" style={{ display: 'flex', alignItems: 'center', height: '100%', fontSize: '1.25rem' }}>{transcript || 'Listening...'}</div>
              ) : (
                <input
                  id="search-input"
                  className="voice-input"
                  type="text"
                  placeholder={selected ? `Search for ${CATEGORIES.find((c) => c.id === selected)?.label.toLowerCase()}...` : "Ask Trigr to find something..."}
                  value={query}
                  style={{ width: '100%', fontSize: '1.25rem' }}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setQuestions([]);
                    setSelectedAnswers({});
                    setFinalResult(null);
                    setPlannerResults(null);
                    setActiveProduct(null);
                    setActiveFoodDish(null);
                    setAlert(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && questions.length === 0) handleValidate();
                  }}
                />
              )}
            </div>

            {query && (
              <button
                className="search-btn"
                style={{ background: 'transparent', color: '#ef4444' }}
                onClick={() => {
                  setQuery("");
                  setQuestions([]);
                  setSelectedAnswers({});
                  setFinalResult(null);
                  setPlannerResults(null);
                  setActiveProduct(null);
                  setActiveFoodDish(null);
                  setAlert(null);
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

        <div className="w-full flex flex-col items-center justify-center mb-8">
          <h2 className="text-xl font-bold text-center mt-0 w-full mb-4">Optional: Select a Category</h2>
          <div style={{ height: '350px', width: '200vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }}>
            <CircularGallery
              bend={3}
              textColor="#1a1a1a"
              borderRadius={0.05}
              font="bold 45px 'Inter', sans-serif"
              scrollEase={0.10}
              items={CATEGORIES.map(cat => {
                let img = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800";
                if (cat.id === "groceries") img = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
                if (cat.id === "table_reservation" || cat.id === "reservation") img = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
                if (cat.id === "beauty") img = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800";
                if (cat.id === "footwear" || cat.id === "apparel") img = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800";
                return { image: img, text: cat.label };
              })}
              onItemClick={(index) => {
                const cat = CATEGORIES[index];
                if (cat) {
                  setSelected(selected === cat.id ? null : cat.id);
                  setQuestions([]);
                  setSelectedAnswers({});
                  setFinalResult(null);
                  setActiveProduct(null);
                  setActiveFoodDish(null);
                  setAlert(null);
                }
              }}
            />
          </div>
          {selected && (
            <p className="mt-4 text-accent font-bold">Selected: {CATEGORIES.find(c => c.id === selected)?.label}</p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 w-full max-w-7xl mx-auto mt-4">
          
          {/* Main Content Area (Centered Search + Validate) */}
          <div className="flex-1 flex flex-col items-center justify-start ">

            {/* Validate Action button */}
            {!isListShopping && query.trim() && questions.length === 0 && !finalResult && !plannerResults && (
              <button
                id="continue-btn"
                className="cta-btn"
                style={{ width: '100%', maxWidth: '280px', display: 'flex', justifyContent: 'center' }}
                onClick={() => handleValidate()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="cta-btn__spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    Validate & Continue
                  </>
                )}
              </button>
            )}

            {/* Alert Banner */}
            {alert && (
              <div className={`alert alert--${alert.type} w-full max-w-2xl mt-4`}>
                <span className="alert__icon">
                  {alert.type === "success" ? "✅" : "⚠️"}
                </span>
                <p className="alert__text">{alert.message}</p>
                <button
                  className="alert__close"
                  onClick={() => setAlert(null)}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8 border-b border-border-col">
          <button 
            className={`px-8 py-3 font-['Space_Mono'] font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'shopping' ? 'text-accent border-b-2 border-accent' : 'text-text/50 hover:text-text'}`}
            onClick={() => setActiveTab('shopping')}
          >
            Categories
          </button>
          <button 
            className={`px-8 py-3 font-['Space_Mono'] font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'deals' ? 'text-accent border-b-2 border-accent' : 'text-text/50 hover:text-text'}`}
            onClick={() => setActiveTab('deals')}
          >
            Live Deals
          </button>
          <button 
            className={`px-8 py-3 font-['Space_Mono'] font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'watchlist' ? 'text-accent border-b-2 border-accent' : 'text-text/50 hover:text-text'}`}
            onClick={() => setActiveTab('watchlist')}
          >
            Watchlist
          </button>
        </div>

        {activeTab === 'shopping' && (
          <>


        {/* ── 4 MCQ Clarification Questions Section (Optional) ──────────── */}
        {questions.length > 0 && !finalResult && (
          <section className="mcq-section">
            <div className="mcq-header">
              <div className="mcq-badge">Optional Clarifications</div>
              <h3 className="mcq-title"><ShinyText text="Narrow down what you want" /></h3>
              <p className="mcq-subtitle">
                Answer these 4 questions to help AI zero in on your exact preference (or skip ahead).
              </p>
            </div>

            <div className="w-full">
            <QuestionFlow 
              questions={questions.map(q => ({
                id: String(q.id),
                type: "multi_choice",
                question: q.question,
                options: q.options
              } as any))}
              answers={Object.fromEntries(Object.entries(selectedAnswers).map(([k, v]) => [String(k), v]))}
              onAnswer={(id, val) => handleOptionSelect(Number(id), String(val))}
              activeQuestionId={questions.find((q) => !selectedAnswers[q.id]) ? String(questions.find((q) => !selectedAnswers[q.id])!.id) : null}
              liveVoiceText=""
            />
          </div>

            <div className="mcq-actions">
              <button
                className="cta-btn"
                onClick={handleFinalizeProduct}
                disabled={finalizing}
              >
                {finalizing ? (
                  <>
                    <span className="cta-btn__spinner" />
                    Fetching...
                  </>
                ) : (
                  <>
                    Narrow Down Exact Want ✨
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        
        {plannerResults && plannerResults.tracks && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'var(--bg)', overflowY: 'auto' }}>
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
              }}
            />
          </div>
        )}

        {/* ── Final Result Card & Swiggy Catalog Grid ──────────────────── */}
        {finalResult && (
          <section className="results-container">
            {/* AI Summary Card */}
            <div className="result-card">
              <div className="result-badge">🎯 AI Identified Exact Want</div>
              <h2 className="result-title">{finalResult.exact_product}</h2>
              <p className="result-summary">{finalResult.summary}</p>

              {finalResult.key_attributes && finalResult.key_attributes.length > 0 && (
                <div className="result-tags">
                  {finalResult.key_attributes.map((attr, i) => (
                    <span key={i} className="result-tag">
                      #{attr}
                    </span>
                  ))}
                </div>
              )}

              <div className="console-notice">
                <span>💻</span> Output logged to Developer Console (`console.log`)
              </div>
            </div>

            {/* ✨ Beauty MCP Section */}
            {finalResult.beauty_mcp && (
              <section className="swiggy-section">
                <div className="swiggy-header">
                  <div className="swiggy-title-group">
                    <span className="swiggy-logo">✨</span>
                    <div>
                      <h3 className="swiggy-heading">Beauty & Grooming Catalog</h3>
                      <p className="swiggy-mcp-tag">
                        Connected to <code>{finalResult.beauty_mcp.mcp_server}</code>
                      </p>
                    </div>
                  </div>
                  <div className="swiggy-match-status">
                    <span className="match-pill">
                      {finalResult.beauty_mcp.is_exact_match ? "Top Recommended Products" : "Similar Brands"}
                    </span>
                  </div>
                </div>

                <p className="swiggy-notice-text">
                  {finalResult.beauty_mcp.match_notice}
                </p>

                <div className="swiggy-grid">
                  {finalResult.beauty_mcp.products.map((prod) => {
                    const discount =
                      prod.original_price && prod.original_price > prod.price
                        ? Math.round(((prod.original_price - prod.price) / prod.original_price) * 100)
                        : null;

                    return (
                      <div
                        key={prod.id}
                        className="swiggy-card swiggy-card--text-focused"
                        onClick={() => openProductModal(prod)}
                        title="Click to view full product details"
                      >
                        <div className="swiggy-card-top-bar">
                          <span className="swiggy-delivery-badge">
                            ⚡ {prod.delivery_time || "2-3 days"}
                          </span>
                          {prod.is_ai_recommended && (
                            <span className="swiggy-exact-badge" style={{ background: 'var(--theme-accent)', marginLeft: 'auto' }}>✨ AI Recommended</span>
                          )}
                        </div>

                        <div className="swiggy-card-image-container">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="swiggy-card-img" />
                          ) : (
                            <div className="swiggy-card-emoji-fallback">{prod.emoji || "✨"}</div>
                          )}
                        </div>

                        <div className="swiggy-card-body">
                          <span className="swiggy-brand">{prod.brand}</span>
                          <h4 className="swiggy-prod-name">{prod.name}</h4>

                          <div className="swiggy-meta-pills">
                            {prod.quantity && <span className="swiggy-pill">📦 {prod.quantity}</span>}
                            {prod.rating && (
                              <span className="swiggy-pill swiggy-pill--star">⭐ {prod.rating}</span>
                            )}
                          </div>

                          <div className="swiggy-footer">
                            <div className="swiggy-price-wrap">
                              <span className="swiggy-price">₹{prod.price}</span>
                              {prod.original_price && prod.original_price > prod.price && (
                                <>
                                  <span className="swiggy-orig-price">
                                    ₹{prod.original_price}
                                  </span>
                                  {discount && (
                                    <span className="swiggy-discount-pill">{discount}% OFF</span>
                                  )}
                                </>
                              )}
                            </div>
                            <button
                              className="swiggy-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod.id, prod.name, prod.price, 1, "Shopify MCP", prod.url);
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 👟 Footwear & Apparel MCP Section */}
            {finalResult.apparel_mcp && (
              <section className="swiggy-section">
                <div className="swiggy-header">
                  <div className="swiggy-title-group">
                    <span className="swiggy-logo">👟</span>
                    <div>
                      <h3 className="swiggy-heading">Footwear & Apparel Catalog</h3>
                      <p className="swiggy-mcp-tag">
                        Connected to <code>{finalResult.apparel_mcp.mcp_server}</code>
                      </p>
                    </div>
                  </div>
                  <div className="swiggy-match-status">
                    <span className="match-pill">
                      {finalResult.apparel_mcp.is_exact_match ? "Top Recommended Matches" : "Similar Styles"}
                    </span>
                  </div>
                </div>

                <p className="swiggy-notice-text">
                  {finalResult.apparel_mcp.match_notice}
                </p>

                <div className="swiggy-grid">
                  {finalResult.apparel_mcp.products.map((prod) => {
                    const discount =
                      prod.original_price && prod.original_price > prod.price
                        ? Math.round(((prod.original_price - prod.price) / prod.original_price) * 100)
                        : null;

                    return (
                      <div
                        key={prod.id}
                        className="swiggy-card swiggy-card--text-focused"
                        onClick={() => openProductModal(prod)}
                        title="Click to view full product details"
                      >
                        <div className="swiggy-card-top-bar">
                          <span className="swiggy-delivery-badge">
                            ⚡ {prod.delivery_time || "3-5 days"}
                          </span>
                          {prod.is_ai_recommended && (
                            <span className="swiggy-exact-badge" style={{ background: 'var(--theme-accent)', marginLeft: 'auto' }}>✨ AI Recommended</span>
                          )}
                        </div>

                        <div className="swiggy-card-image-container">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="swiggy-card-img" />
                          ) : (
                            <div className="swiggy-card-emoji-fallback">{prod.emoji || "👟"}</div>
                          )}
                        </div>

                        <div className="swiggy-card-body">
                          <span className="swiggy-brand">{prod.brand}</span>
                          <h4 className="swiggy-prod-name">{prod.name}</h4>

                          <div className="swiggy-meta-pills">
                            {prod.quantity && <span className="swiggy-pill">👕 {prod.quantity}</span>}
                            {prod.rating && (
                              <span className="swiggy-pill swiggy-pill--star">⭐ {prod.rating}</span>
                            )}
                          </div>

                          <div className="swiggy-footer">
                            <div className="swiggy-price-wrap">
                              <span className="swiggy-price">₹{prod.price}</span>
                              {prod.original_price && prod.original_price > prod.price && (
                                <>
                                  <span className="swiggy-orig-price">
                                    ₹{prod.original_price}
                                  </span>
                                  {discount && (
                                    <span className="swiggy-discount-pill">{discount}% OFF</span>
                                  )}
                                </>
                              )}
                            </div>
                            <button
                              className="swiggy-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod.id, prod.name, prod.price, 1, "Shopify Apparel", prod.url);
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 🍕 Swiggy Food MCP Section (Only for Food Category) */}
            {finalResult.swiggy_food_mcp && (
              <section className="swiggy-section">
                <div className="swiggy-header">
                  <div className="swiggy-title-group">
                    <span className="swiggy-logo">🍕</span>
                    <div>
                      <h3 className="swiggy-heading">Swiggy Food Delivery Catalog</h3>
                      <p className="swiggy-mcp-tag">
                        Connected to <code>mcp.swiggy.com/food</code>
                      </p>
                    </div>
                  </div>
                  <div className="swiggy-match-status">
                    <span className="match-pill">
                      {finalResult.swiggy_food_mcp.is_exact_match ? "Top Recommended Dishes" : "Similar Restaurants"}
                    </span>
                  </div>
                </div>

                <p className="swiggy-notice-text">
                  {finalResult.swiggy_food_mcp.match_notice} (Click any dish card to view restaurant specs)
                </p>

                {/* Swiggy Food Dishes Grid */}
                <div className="swiggy-grid">
                  {finalResult.swiggy_food_mcp.products.map((dish) => {
                    const discount =
                      dish.original_price && dish.original_price > dish.price
                        ? Math.round(((dish.original_price - dish.price) / dish.original_price) * 100)
                        : null;

                    return (
                      <div
                        key={dish.id}
                        className="swiggy-card swiggy-card--text-focused"
                        onClick={() => openFoodModal(dish)}
                        title="Click to view full restaurant & dish details"
                      >
                        {/* Top Speed & Veg/Non-Veg Header */}
                        <div className="swiggy-card-top-bar">
                          <span className="swiggy-delivery-badge">
                            ⚡ {dish.delivery_time}
                          </span>
                          <span className={`diet-pill ${dish.is_veg !== false ? "diet-pill--veg" : "diet-pill--nonveg"}`}>
                            {dish.is_veg !== false ? "🟢 Pure Veg" : "🔴 Non-Veg"}
                          </span>
                          {dish.is_ai_recommended && (
                            <span className="swiggy-exact-badge" style={{ background: 'var(--theme-accent)', marginLeft: 'auto' }}>✨ AI Recommended</span>
                          )}
                        </div>

                        <div className="swiggy-card-image-container">
                          {dish.image_url ? (
                            <img src={dish.image_url} alt={dish.name} className="swiggy-card-img" />
                          ) : (
                            <div className="swiggy-card-emoji-fallback">{dish.emoji || "🍽️"}</div>
                          )}
                        </div>

                        <div className="swiggy-card-body">
                          <span className="swiggy-brand">{dish.restaurant}</span>
                          <h4 className="swiggy-prod-name">{dish.name}</h4>

                          <div className="swiggy-meta-pills">
                            {dish.portion && <span className="swiggy-pill">🍽️ {dish.portion}</span>}
                            {dish.cuisine && <span className="swiggy-pill">🍲 {dish.cuisine}</span>}
                            {dish.rating && (
                              <span className="swiggy-pill swiggy-pill--star">⭐ {dish.rating}</span>
                            )}
                          </div>

                          <div className="swiggy-feature-tags">
                            <span className="feature-tag">🔥 Best Seller</span>
                            <span className="feature-tag">⚡ Swiggy Express</span>
                          </div>

                          <div className="swiggy-footer">
                            <div className="swiggy-price-wrap">
                              <span className="swiggy-price">₹{dish.price}</span>
                              {dish.original_price && dish.original_price > dish.price && (
                                <>
                                  <span className="swiggy-orig-price">
                                    ₹{dish.original_price}
                                  </span>
                                  {discount && (
                                    <span className="swiggy-discount-pill">{discount}% OFF</span>
                                  )}
                                </>
                              )}
                            </div>

                            <button
                              className="swiggy-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(dish.id, dish.name, dish.price, 1, "Swiggy Food", dish.url);
                              }}
                            >
                              ORDER +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 🛒 Swiggy Instamart Grocery Section (Only for Groceries Category) */}
            {finalResult.swiggy_mcp && (
              <section className="swiggy-section">
                <div className="swiggy-header">
                  <div className="swiggy-title-group">
                    <span className="swiggy-logo">⚡</span>
                    <div>
                      <h3 className="swiggy-heading">Swiggy Instamart Catalog</h3>
                      <p className="swiggy-mcp-tag">
                        Connected to <code>mcp.swiggy.com/im</code>
                      </p>
                    </div>
                  </div>
                  <div className="swiggy-match-status">
                    <span className="match-pill">
                      {finalResult.swiggy_mcp.is_exact_match ? "Exact & Related Items" : "Similar Items"}
                    </span>
                  </div>
                </div>

                <p className="swiggy-notice-text">
                  {finalResult.swiggy_mcp.match_notice} (Click any card to view full product details & specs)
                </p>

                {/* 5+ Grocery Products Detailed Text Grid */}
                <div className="swiggy-grid">
                  {finalResult.swiggy_mcp.products.map((prod) => {
                    const discount =
                      prod.original_price && prod.original_price > prod.price
                        ? Math.round(((prod.original_price - prod.price) / prod.original_price) * 100)
                        : null;

                    return (
                      <div
                        key={prod.id}
                        className="swiggy-card swiggy-card--text-focused"
                        onClick={() => openProductModal(prod)}
                        title="Click to view full product details"
                      >
                        {/* Top Speed & Match Header */}
                        <div className="swiggy-card-top-bar">
                          <span className="swiggy-delivery-badge">
                            ⚡ {prod.delivery_time}
                          </span>
                          {prod.is_similar ? (
                            <span className="swiggy-similar-badge">Similar</span>
                          ) : (
                            <span className="swiggy-exact-badge">Top Match</span>
                          )}
                          {prod.is_ai_recommended && (
                            <span className="swiggy-exact-badge" style={{ background: 'var(--theme-accent)', marginLeft: 'auto' }}>✨ AI Recommended</span>
                          )}
                        </div>

                        <div className="swiggy-card-image-container">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="swiggy-card-img" />
                          ) : (
                            <div className="swiggy-card-emoji-fallback">{prod.emoji || "🛒"}</div>
                          )}
                        </div>

                        <div className="swiggy-card-body">
                          <span className="swiggy-brand">{prod.brand}</span>
                          <h4 className="swiggy-prod-name">{prod.name}</h4>

                          <div className="swiggy-meta-pills">
                            <span className="swiggy-pill">📦 {prod.quantity}</span>
                            {prod.rating && (
                              <span className="swiggy-pill swiggy-pill--star">⭐ {prod.rating}</span>
                            )}
                            <span className="swiggy-pill swiggy-pill--stock">🟢 In Stock</span>
                          </div>

                          <div className="swiggy-feature-tags">
                            <span className="feature-tag">🌿 Fresh Quality</span>
                            <span className="feature-tag">⚡ Express Instamart</span>
                          </div>

                          <div className="swiggy-footer">
                            <div className="swiggy-price-wrap">
                              <span className="swiggy-price">₹{prod.price}</span>
                              {prod.original_price && prod.original_price > prod.price && (
                                <>
                                  <span className="swiggy-orig-price">
                                    ₹{prod.original_price}
                                  </span>
                                  {discount && (
                                    <span className="swiggy-discount-pill">{discount}% OFF</span>
                                  )}
                                </>
                              )}
                            </div>

                            <button
                              className="swiggy-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod.id, prod.name, prod.price, 1, "Swiggy Instamart", prod.url);
                              }}
                            >
                              ADD +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 🍽️ Swiggy Dineout Section (Only for Reservation Category) */}
            {finalResult.swiggy_dineout_mcp && (
              <section className="swiggy-section">
                <div className="swiggy-header">
                  <div className="swiggy-title-group">
                    <span className="swiggy-logo">🍽️</span>
                    <div>
                      <h3 className="swiggy-heading">Swiggy Dineout Reservations</h3>
                      <p className="swiggy-mcp-tag">
                        Connected to <code>mcp.swiggy.com/dineout</code>
                      </p>
                    </div>
                  </div>
                  <div className="swiggy-match-status">
                    <span className="match-pill">
                      {finalResult.swiggy_dineout_mcp.is_exact_match ? "Top Recommended Restaurants" : "Similar Restaurants"}
                    </span>
                  </div>
                </div>

                <p className="swiggy-notice-text">
                  {finalResult.swiggy_dineout_mcp.match_notice} (Click Reserve to secure a table)
                </p>

                <div className="swiggy-grid">
                  {finalResult.swiggy_dineout_mcp.products.map((prod) => {
                    const discount =
                      prod.original_price && prod.original_price > prod.price
                        ? Math.round(((prod.original_price - prod.price) / prod.original_price) * 100)
                        : null;

                    return (
                      <div
                        key={prod.id}
                        className="swiggy-card swiggy-card--text-focused"
                        title="Click to reserve table"
                      >
                        <div className="swiggy-card-top-bar">
                          <span className="swiggy-delivery-badge">
                            📍 {prod.location}
                          </span>
                          {prod.is_ai_recommended && (
                            <span className="swiggy-exact-badge" style={{ background: 'var(--theme-accent)', marginLeft: 'auto' }}>✨ AI Recommended</span>
                          )}
                        </div>

                        <div className="swiggy-card-image-container">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="swiggy-card-img" />
                          ) : (
                            <div className="swiggy-card-emoji-fallback">{prod.emoji || "🍽️"}</div>
                          )}
                        </div>

                        <div className="swiggy-card-body">
                          <span className="swiggy-brand">{prod.cuisine}</span>
                          <h4 className="swiggy-prod-name">{prod.name}</h4>

                          <div className="swiggy-meta-pills">
                            <span className="swiggy-pill">⭐ {prod.rating}</span>
                            <span className="swiggy-pill">{prod.table_available ? "🟢 Table Available" : "🔴 Waitlist"}</span>
                          </div>

                          <div className="swiggy-feature-tags">
                            {prod.discount && <span className="feature-tag">🏷️ {prod.discount}</span>}
                          </div>

                          <div className="swiggy-footer">
                            <div className="swiggy-price-wrap">
                              <span className="swiggy-price">₹{prod.price}</span>
                              {prod.original_price && prod.original_price > prod.price && (
                                <>
                                  <span className="swiggy-orig-price">
                                    ₹{prod.original_price}
                                  </span>
                                  {discount && (
                                    <span className="swiggy-discount-pill">{discount}% OFF</span>
                                  )}
                                </>
                              )}
                            </div>

                            <button
                              className="swiggy-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod.id, prod.name, prod.price, 1, "Swiggy Dineout", prod.url);
                              }}
                            >
                              Reserve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <button className="reset-btn" onClick={resetAll}>
              Start New Search 🔄
            </button>
          </section>
        )}

        {/* ── EXPANDED SWIGGY FOOD DISH MODAL ───────────────────────────── */}
        {activeFoodDish && (
          <div className="modal-backdrop" onClick={() => setActiveFoodDish(null)}>
            <div className="modal-content modal-content--full-details" onClick={(e) => e.stopPropagation()}>
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
                    <span className="modal-brand-tag">{activeFoodDish.restaurant}</span>
                    <span className="modal-delivery-tag">
                      ⚡ Food Delivery ({activeFoodDish.delivery_time})
                    </span>
                    <span className="modal-mcp-badge">mcp.swiggy.com/food</span>
                  </div>
                  <h2 className="modal-title">{activeFoodDish.name}</h2>
                </div>

                <div className="modal-price-box">
                  <div className="modal-price-main">
                    <span className="modal-current-price">₹{activeFoodDish.price}</span>
                    {activeFoodDish.original_price && activeFoodDish.original_price > activeFoodDish.price && (
                      <>
                        <span className="modal-original-price">₹{activeFoodDish.original_price}</span>
                        <span className="modal-discount-tag">
                          {Math.round(
                            ((activeFoodDish.original_price - activeFoodDish.price) /
                              activeFoodDish.original_price) *
                              100
                          )}
                          % OFF
                        </span>
                        <span className="modal-save-amount">
                          Save ₹{activeFoodDish.original_price - activeFoodDish.price}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="modal-tax-note">Includes all food preparation & packaging charges</p>
                </div>

                <div className="modal-spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">🍽️ Portion / Serving</span>
                    <span className="spec-value">{activeFoodDish.portion || "Standard Portion (Serves 1-2)"}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">🍲 Cuisine Type</span>
                    <span className="spec-value">{activeFoodDish.cuisine || "Multi-Cuisine"}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">🌱 Dietary Badge</span>
                    <span className="spec-value">{activeFoodDish.is_veg !== false ? "🟢 Pure Veg Dish" : "🔴 Non-Veg Dish"}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">⭐ Restaurant Rating</span>
                    <span className="spec-value">{activeFoodDish.rating || 4.5} / 5.0 (Swiggy Verified)</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">⚡ Delivery Time</span>
                    <span className="spec-value">{activeFoodDish.delivery_time}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">🏢 Provider Endpoint</span>
                    <span className="spec-value">mcp.swiggy.com/food</span>
                  </div>
                </div>

                <div className="modal-highlights">
                  <h4 className="modal-highlights-title">Swiggy Food Freshness & Quality Assurance</h4>
                  <ul className="modal-highlights-list">
                    <li>🔥 Prepared fresh on order receipt in hygienic restaurant kitchens</li>
                    <li>📦 Spill-proof, eco-friendly insulated hot delivery container</li>
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

                  <button
                    className="modal-add-cart-btn"
                    onClick={() => {
                      handleAddToCart(activeFoodDish.id, activeFoodDish.name, activeFoodDish.price, modalItemQty, "Swiggy Food", activeFoodDish.url);
                      setActiveFoodDish(null);
                    }}
                  >
                    Add {modalItemQty} Dish to Food Cart • ₹{activeFoodDish.price * modalItemQty}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EXPANDED SWIGGY GROCERY PRODUCT MODAL ─────────────────────── */}
        {activeProduct && (
          <div className="modal-backdrop" onClick={() => setActiveProduct(null)}>
            <div className="modal-content modal-content--full-details" onClick={(e) => e.stopPropagation()}>
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
                    <span className="modal-brand-tag">{activeProduct.brand}</span>
                    <span className="modal-delivery-tag">
                      ⚡ Express Delivery ({activeProduct.delivery_time})
                    </span>
                    <span className="modal-mcp-badge">Swiggy Instamart Verified</span>
                  </div>
                  <h2 className="modal-title">{activeProduct.name}</h2>
                </div>

                <div className="modal-price-box">
                  <div className="modal-price-main">
                    <span className="modal-current-price">₹{activeProduct.price}</span>
                    {activeProduct.original_price && activeProduct.original_price > activeProduct.price && (
                      <>
                        <span className="modal-original-price">₹{activeProduct.original_price}</span>
                        <span className="modal-discount-tag">
                          {Math.round(
                            ((activeProduct.original_price - activeProduct.price) /
                              activeProduct.original_price) *
                              100
                          )}
                          % OFF
                        </span>
                        <span className="modal-save-amount">
                          Save ₹{activeProduct.original_price - activeProduct.price}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="modal-tax-note">Price inclusive of all taxes • Swiggy Instamart Instant Billing</p>
                </div>

                <div className="modal-spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">📦 Pack Quantity</span>
                    <span className="spec-value">{activeProduct.quantity}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">⚡ Delivery Speed</span>
                    <span className="spec-value">{activeProduct.delivery_time}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">⭐ Rating & Reviews</span>
                    <span className="spec-value">{activeProduct.rating || 4.8} / 5.0 (Instamart Verified)</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">🟢 Stock Availability</span>
                    <span className="spec-value">Available at Nearest Dark Store</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">🌿 Dietary / Quality</span>
                    <span className="spec-value">100% Vegetarian & Quality Checked</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">🏢 Provider Endpoint</span>
                    <span className="spec-value">mcp.swiggy.com/im</span>
                  </div>
                </div>

                <div className="modal-highlights">
                  <h4 className="modal-highlights-title">Swiggy Instamart Assured Guarantees</h4>
                  <ul className="modal-highlights-list">
                    <li>🌿 100% Fresh & Authentic Product Sourcing</li>
                    <li>⚡ Delivered under 15 minutes straight from temperature-controlled dark stores</li>
                    <li>📦 Hygienic, tamper-evident sealed packaging</li>
                    <li>🔄 Instant refund / replacement guarantee if damaged or unsatisfied</li>
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

                  <button
                    className="modal-add-cart-btn"
                    onClick={() => {
                      handleAddToCart(activeProduct.id, activeProduct.name, activeProduct.price, modalItemQty, "Swiggy Instamart", activeProduct.url);
                      setActiveProduct(null);
                    }}
                  >
                    Add {modalItemQty} to Instamart Cart • ₹{activeProduct.price * modalItemQty}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CHECKOUT MODAL ────────────────────────────────────── */}
        {isCheckoutOpen && (
          <div className="modal-backdrop" onClick={() => setIsCheckoutOpen(false)}>
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
                  <h2 className="checkout-success-title">Order Placed Successfully!</h2>
                  <p className="checkout-success-sub">
                    Your order has been confirmed. Swiggy Express partner is assigned and will deliver your order shortly!
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
                    <span className="cart-header__badge">{totalCartCount} items</span>
                  </div>

                  <div className="checkout-section">
                    <span className="checkout-section-title">Delivery Address</span>
                    <div className="checkout-address-card">
                      <div className="checkout-address-info">
                        <span className="checkout-address-tag">🏡 Home Address</span>
                        <span className="checkout-address-text">
                          122, Indiranagar 100ft Road, Bengaluru, Karnataka (560038)
                        </span>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#6c5ce7", fontWeight: 700, cursor: "pointer" }}>
                        Change
                      </span>
                    </div>
                  </div>

                  <div className="checkout-section">
                    <span className="checkout-section-title">Order Items ({cartItems.length})</span>
                    <div className="checkout-order-items">
                      {cartItems.map((item) => (
                        <div key={item.id} className="checkout-order-item-row">
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
                    <span className="checkout-section-title">Select Payment Method</span>
                    <div className="checkout-payment-methods">
                      <div
                        className={`payment-method-card ${
                          selectedPayment === "upi" ? "payment-method-card--selected" : ""
                        }`}
                        onClick={() => setSelectedPayment("upi")}
                      >
                        <span className="payment-method-icon">⚡</span>
                        <span>UPI / GPay</span>
                      </div>
                      <div
                        className={`payment-method-card ${
                          selectedPayment === "card" ? "payment-method-card--selected" : ""
                        }`}
                        onClick={() => setSelectedPayment("card")}
                      >
                        <span className="payment-method-icon">💳</span>
                        <span>Card</span>
                      </div>
                      <div
                        className={`payment-method-card ${
                          selectedPayment === "cod" ? "payment-method-card--selected" : ""
                        }`}
                        onClick={() => setSelectedPayment("cod")}
                      >
                        <span className="payment-method-icon">💵</span>
                        <span>Cash</span>
                      </div>
                    </div>
                  </div>

                  <div className="cart-summary-rows" style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "10px" }}>
                    <div className="cart-summary-row">
                      <span>Subtotal</span>
                      <span>₹{cartSubtotal}</span>
                    </div>
                    <div className="cart-summary-row">
                      <span>Delivery Fee</span>
                      <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                    </div>
                    <div className="cart-summary-row">
                      <span>Taxes & Platform</span>
                      <span>₹{taxesAndFees}</span>
                    </div>
                    <div className="cart-summary-row cart-summary-row--total">
                      <span>Total Amount Payable</span>
                      <span style={{ color: "#34d399" }}>₹{grandTotal}</span>
                    </div>
                  </div>

                  <button
                    className="cart-checkout-btn"
                    disabled={isProcessingPayment}
                    onClick={handlePlaceOrder}
                    style={{ marginTop: "8px" }}
                  >
                    {isProcessingPayment ? (
                      <span className="checkout-btn-label" style={{ margin: "0 auto" }}>
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
        {activeTab === 'deals' && (
          <div className="mt-4">
            <SmartSavings currentGoal={query || undefined} />
          </div>
        )}
      
        {/* ── Watchlist Tab ──────────────────────────────────── */}
        {activeTab === 'watchlist' && (
          <section className="watchlist-section mt-4 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-wide text-text flex items-center gap-3">
                My Watchlist <span className="bg-accent/20 text-accent text-lg px-3 py-1 rounded-full">{watchlistItems.length}</span>
              </h2>
            </div>
            
            {watchlistItems.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border-col/50 rounded-lg">
                <span className="text-4xl">💔</span>
                <p className="mt-4 text-text/60 font-['Space_Mono']">Your watchlist is empty.</p>
                <p className="text-text/40 text-sm mt-2">Heart products in the Swipe Planner to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {watchlistItems.map((item: any, idx: number) => {
                  let hash = 0;
                  const str = String(item.id || item.name);
                  for (let i = 0; i < str.length; i++) {
                    hash = (hash << 5) - hash + str.charCodeAt(i);
                    hash = hash & hash;
                  }
                  const rand = Math.abs(hash) % 100;
                  const hasPriceDrop = rand < 30; // 30% chance
                  const dropPercent = hasPriceDrop ? 10 + (Math.abs(hash) % 15) : 0;
                  const currentPrice = hasPriceDrop ? Math.floor(item.price * (1 - dropPercent/100)) : item.price;

                  return (
                    <div key={`${item.id}-${idx}`} className="swiggy-card relative border border-border-col bg-card-bg group">
                      
                      <button 
                        onClick={() => toggleWatchlist(item)}
                        className="absolute top-2 right-2 z-10 bg-bg/80 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-500"
                        title="Remove from watchlist"
                      >
                        ✕
                      </button>

                      <div className="swiggy-card-top-bar" style={{minHeight: "36px"}}>
                        {hasPriceDrop ? (
                          <span className="swiggy-delivery-badge flex items-center gap-1 !bg-green-500/20 !text-green-500 !border-green-500/30">
                            <TrendingDown className="h-3 w-3" />
                            Price Dropped by {dropPercent}%!
                          </span>
                        ) : (
                          <span className="swiggy-delivery-badge">Watching Price 👀</span>
                        )}
                      </div>
                      
                      <div className="swiggy-card-image-container h-48">
                        {item.image || item.image_url ? (
                          <img src={item.image || item.image_url} alt={item.name} className="swiggy-card-img" />
                        ) : (
                          <div className="swiggy-card-emoji-fallback">{item.emoji || "🎁"}</div>
                        )}
                      </div>

                      <div className="swiggy-card-body">
                        <span className="swiggy-brand">{item.brand || item.restaurant || "Product"}</span>
                        <h4 className="swiggy-prod-name line-clamp-2" title={item.name}>{item.name}</h4>
                        
                        <div className="swiggy-footer mt-4 flex flex-col gap-3">
                          <div className="swiggy-price-wrap flex items-end gap-2">
                            <span className="swiggy-price text-xl text-text font-bold">₹{currentPrice}</span>
                            {hasPriceDrop && (
                              <span className="text-text/40 line-through text-xs mb-1">₹{item.price}</span>
                            )}
                          </div>
                          
                          <button
                            className="swiggy-add-btn w-full"
                            onClick={() => handleAddToCart(item.id, item.name, currentPrice, 1, "Watchlist", item.url)}
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
        )}

      </main>
    </div>
  );
}

export default App;

