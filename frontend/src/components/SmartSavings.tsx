import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Tag,
  Clock,
  CreditCard,
  Ticket,
  Zap,
  Truck,
  Repeat,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Bell,
  X,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  Info,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

const getJson = async <T,>(endpoint: string): Promise<T> => {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

const postJson = async <T,>(endpoint: string, body: any): Promise<T> => {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

export interface ShoppingOpportunity {
  id: string;
  type: string;
  retailer: string;
  title: string;
  category: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  bank_offers: string | null;
  coupon: string | null;
  cashback: string | null;
  source_url: string;
  confidence: number;
  status: string;
  ai_score: number;
  ai_explainability: string;
}

export interface SearchResponse {
  opportunities: ShoppingOpportunity[];
  ai_insight: string;
}

export interface FiltersResponse {
  stores: string[];
  categories: string[];
  statuses: string[];
  types: string[];
}

export interface TrendingResponse {
  trending: string[];
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "SALE":
      return <Tag className="h-4 w-4 text-accent" />;
    case "BANK_OFFER":
      return <CreditCard className="h-4 w-4 text-accent-orange" />;
    case "COUPON":
      return <Ticket className="h-4 w-4 text-accent" />;
    case "FLASH_DEAL":
      return <Zap className="h-4 w-4 text-accent-orange" />;
    case "FREE_SHIPPING":
      return <Truck className="h-4 w-4 text-accent" />;
    case "CASHBACK":
      return <CreditCard className="h-4 w-4 text-accent" />;
    case "EXCHANGE_OFFER":
      return <Repeat className="h-4 w-4 text-accent-orange" />;
    default:
      return <Sparkles className="h-4 w-4 text-accent" />;
  }
};

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft("Expired");
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;
  return (
    <div className="flex items-center gap-1.5 text-accent-orange text-[10px] font-['Space_Mono'] font-bold tracking-widest bg-accent-orange/10 px-2 py-1 border border-accent-orange/20">
      <Clock className="h-3 w-3" />
      {timeLeft}
    </div>
  );
};

export const SmartSavings = ({ currentGoal }: { currentGoal?: string }) => {
  const [data, setData] = useState<ShoppingOpportunity[]>([]);
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedStore, setSelectedStore] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");

  // Dynamic Data
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(
    null,
  );
  const [trending, setTrending] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Popovers
  const [watchPopoverId, setWatchPopoverId] = useState<string | null>(null);
  const [explainPopoverId, setExplainPopoverId] = useState<string | null>(null);

  // Watch Preferences State
  const [watchPrefs, setWatchPrefs] = useState({
    notify_sale_starts: false,
    notify_price_drops: false,
    notify_new_coupon: false,
    notify_better_bank_offer: false,
    notify_cashback_increase: false,
    notify_stock: false,
  });

  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch Filters and Trending on Mount
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const [filtersRes, trendingRes] = await Promise.all([
          getJson<FiltersResponse>("/opportunities/filters/"),
          getJson<TrendingResponse>("/opportunities/trending/"),
        ]);
        if (active) {
          setFilterOptions(filtersRes);
          setTrending(trendingRes.trending);
        }
      } catch (e) {
        console.error("Failed to init Opportunity Explorer:", e);
      }
    };
    init();

    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch Opportunities
  useEffect(() => {
    let active = true;
    const fetchSearch = async () => {
      setLoading(true);
      try {
        const response = await postJson<SearchResponse>(
          "/opportunities/search/",
          {
            query: searchQuery,
            goal: currentGoal,
            filters: {
              category: activeCategory,
              store: selectedStore,
              type: selectedType,
              status: selectedStatus,
              sort: sortBy,
            },
          },
        );
        if (active) {
          setData(response.opportunities);
          setInsight(response.ai_insight);
        }
      } catch (e) {
        console.error("Failed to search opportunities:", e);
      } finally {
        if (active) setLoading(false);
      }
    };

    // Debounce search slightly
    const timer = setTimeout(fetchSearch, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    searchQuery,
    activeCategory,
    selectedStore,
    selectedType,
    selectedStatus,
    sortBy,
    currentGoal,
  ]);

  const handleWatchToggle = async (oppId: string) => {
    try {
      await postJson("/opportunities/watch/", {
        opportunity_id: oppId,
        preferences: watchPrefs,
      });
      setWatchPopoverId(null);
      // Show small toast ideally, but fine for now
    } catch (e) {
      console.error("Failed to set watch:", e);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return "text-accent border-accent bg-accent/10 shadow-[0_0_15px_rgba(0,255,153,0.3)]";
    if (score >= 50)
      return "text-accent-orange border-accent-orange bg-accent-orange/10 shadow-[0_0_10px_rgba(255,153,0,0.2)]";
    return "text-text/60 border-border-col bg-bg";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Insight */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="font-['Oswald'] text-2xl uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            AI Opportunity Explorer
          </h2>
          {insight && (
            <p className="font-['Space_Mono'] text-xs text-text/60 mt-2">
              <span className="text-accent">AI INSIGHT:</span> {insight}
            </p>
          )}
        </div>
      </div>

      {/* Search Bar with Autocomplete */}
      <div className="relative z-30" ref={searchRef}>
        <div className="flex items-center border border-border-col bg-bg hover:border-accent transition-colors px-4 py-3 relative">
          <Search className="h-5 w-5 text-text/50 mr-3" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-text placeholder:text-text/30 font-medium"
            placeholder="Search deals, stores, brands or ask naturally (e.g. 'gaming laptop offers')..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowAutocomplete(true);
            }}
            onFocus={() => setShowAutocomplete(true)}
          />
          {loading && (
            <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin ml-3" />
          )}
        </div>

        <AnimatePresence>
          {showAutocomplete && trending.length > 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 border border-border-col bg-card-bg shadow-2xl p-4 z-40"
            >
              <div className="text-[10px] font-['Space_Mono'] text-text/50 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Trending Searches
              </div>
              <div className="flex flex-col gap-2">
                {trending.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(t);
                      setShowAutocomplete(false);
                    }}
                    className="text-left font-['Space_Mono'] text-sm text-text/80 hover:text-accent hover:pl-2 transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
        <button
          onClick={() => setActiveCategory("All")}
          className={`shrink-0 px-4 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest border transition-colors ${activeCategory === "All" ? "bg-accent border-accent text-bg" : "bg-card-bg border-border-col text-text/70 hover:border-accent hover:text-accent"}`}
        >
          All
        </button>
        {filterOptions?.categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest border transition-colors ${activeCategory === cat ? "bg-accent border-accent text-bg" : "bg-card-bg border-border-col text-text/70 hover:border-accent hover:text-accent"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-border-col bg-card-bg px-3 py-2 text-xs font-['Space_Mono'] uppercase tracking-widest text-text/70">
          <Filter className="h-3 w-3 text-accent" /> Filters:
        </div>

        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="bg-bg border border-border-col px-3 py-2 text-xs font-['Space_Mono'] text-text outline-none focus:border-accent"
        >
          <option value="All">Store: All</option>
          {filterOptions?.stores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-bg border border-border-col px-3 py-2 text-xs font-['Space_Mono'] text-text outline-none focus:border-accent"
        >
          <option value="All">Type: All</option>
          {filterOptions?.types.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-bg border border-border-col px-3 py-2 text-xs font-['Space_Mono'] text-text outline-none focus:border-accent"
        >
          <option value="All">Status: All</option>
          {filterOptions?.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-bg border border-border-col px-3 py-2 text-xs font-['Space_Mono'] text-text outline-none focus:border-accent ml-auto"
        >
          <option value="recommended">Sort: Recommended (AI Score)</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {/* Grid of Opportunities */}
      {data.length === 0 && !loading ? (
        <div className="py-20 text-center border border-border-col border-dashed">
          <Sparkles className="h-8 w-8 text-text/20 mx-auto mb-3" />
          <h3 className="font-['Oswald'] text-xl uppercase tracking-widest text-text/50">
            No opportunities found
          </h3>
          <p className="font-['Space_Mono'] text-sm text-text/40 mt-2">
            Try adjusting your filters or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.map((opp, idx) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative border border-border-col bg-card-bg p-5 hover:border-accent transition-all duration-300 flex flex-col justify-between overflow-visible"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-bg border border-border-col text-text/70 flex items-center gap-1.5">
                    <TypeIcon type={opp.type || "SALE"} />
                    {String(opp.type || "SALE").replace("_", " ")}
                  </span>

                  {/* AI Score Badge */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setExplainPopoverId(
                          explainPopoverId === opp.id ? null : opp.id,
                        )
                      }
                      className={`flex flex-col items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${getScoreColor(opp.ai_score)}`}
                    >
                      <span className="text-xs font-bold font-['Space_Mono']">
                        {opp.ai_score}
                      </span>
                    </button>

                    {/* Explainability Popover */}
                    <AnimatePresence>
                      {explainPopoverId === opp.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-12 w-48 bg-bg border border-accent p-3 z-50 shadow-xl"
                        >
                          <div className="flex items-center gap-2 mb-2 text-accent border-b border-accent/20 pb-2">
                            <Info className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase font-['Space_Mono'] tracking-widest">
                              AI Score Info
                            </span>
                          </div>
                          <p className="text-xs text-text/80 leading-relaxed font-['Space_Mono']">
                            {opp.ai_explainability}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-text/50 font-['Space_Mono']">
                    {opp.retailer}
                  </span>
                  <h3 className="text-lg font-bold text-text mt-1 group-hover:text-accent transition-colors line-clamp-2 leading-tight font-['Oswald'] tracking-wide">
                    {opp.title}
                  </h3>
                </div>

                <p className="text-sm text-text/60 line-clamp-2 mt-2 mb-4">
                  {opp.description}
                </p>

                <div className="space-y-2 mb-4">
                  {opp.bank_offers && (
                    <div className="flex items-start gap-2 text-sm text-text/70 bg-bg/50 p-2 border border-border-col/50">
                      <CreditCard className="h-4 w-4 mt-0.5 text-accent-orange shrink-0" />
                      <span className="leading-snug">{opp.bank_offers}</span>
                    </div>
                  )}
                  {opp.coupon && (
                    <div className="flex items-center justify-between text-sm text-text/70 bg-bg/50 p-2 border border-border-col/50">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-accent shrink-0" />
                        <span>Code:</span>
                      </div>
                      <span className="font-['Space_Mono'] font-bold text-accent uppercase tracking-widest px-2 py-0.5 bg-accent/10 border border-accent/30">
                        {opp.coupon}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border-col flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {opp.end_date && <Countdown targetDate={opp.end_date} />}
                </div>

                <div className="flex items-center gap-2 relative">
                  {/* Watch Button */}
                  <button
                    onClick={() =>
                      setWatchPopoverId(
                        watchPopoverId === opp.id ? null : opp.id,
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center border border-border-col bg-bg text-text/50 hover:border-accent-orange hover:text-accent-orange transition-colors"
                    title="Watch Opportunity"
                  >
                    <Bell className="h-4 w-4" />
                  </button>

                  {/* Watch Popover */}
                  <AnimatePresence>
                    {watchPopoverId === opp.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-10 right-0 w-64 bg-card-bg border border-accent p-4 z-50 shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-col">
                          <span className="text-xs font-bold uppercase tracking-widest font-['Space_Mono'] text-accent-orange flex items-center gap-2">
                            <Bell className="h-3 w-3" /> Watch Alerts
                          </span>
                          <button
                            onClick={() => setWatchPopoverId(null)}
                            className="text-text/50 hover:text-text"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-2 mb-4">
                          {Object.entries(watchPrefs).map(([key, val]) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                checked={val}
                                onChange={() =>
                                  setWatchPrefs({ ...watchPrefs, [key]: !val })
                                }
                                className="appearance-none w-4 h-4 border border-border-col bg-bg checked:bg-accent-orange checked:border-accent-orange transition-all relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[2px] after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-bg after:rotate-45"
                              />
                              <span className="text-xs font-['Space_Mono'] text-text/70 group-hover:text-text transition-colors">
                                {key
                                  .replace("notify_", "")
                                  .replace(/_/g, " ")
                                  .toUpperCase()}
                              </span>
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={() => handleWatchToggle(opp.id)}
                          className="w-full bg-accent-orange text-bg font-bold text-xs uppercase tracking-widest py-2 font-['Space_Mono'] hover:opacity-90 transition-opacity"
                        >
                          Save Watch
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <a
                    href={opp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center border border-border-col bg-accent text-bg hover:opacity-90 transition-opacity"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
