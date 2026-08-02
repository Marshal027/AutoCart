import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Home from "./Home.jsx";
import SwipixApp from "./SwipixApp.tsx";
import VisionPage from "./VisionPage.jsx";
import LiquidEther from "./components/LiquidEther.jsx";
import PravaSettingsPage from "./prava/PravaSettingsPage.jsx";
import EmptyShopPage from "./components/EmptyShopPage.jsx";
import WatchlistPage from "./components/WatchlistPage.jsx";
import AdminPage from "./components/AdminPage.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = "auto";
    setTimeout(() => {
      document.documentElement.style.scrollBehavior = "";
    }, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const dot = cursorRef.current;
    if (!dot) return;

    let mouseX = 0,
      mouseY = 0;
    let dotX = 0,
      dotY = 0;
    let rafId;

    function onMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function animate() {
      dotX += (mouseX - dotX) * 0.15;
      dotY += (mouseY - dotY) * 0.15;
      dot.style.transform = `translate(${dotX - 6}px, ${dotY - 6}px)`;
      rafId = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", onMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <LiquidEther
          colors={["#5227FF", "#FF9FFC", "#B497CF"]}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>
      <div className="cursor-dot" ref={cursorRef} style={{ pointerEvents: 'none', zIndex: 9999, position: 'fixed', top: 0, left: 0 }} />
      
      {/* Black navigation bar on top of all layouts */}
      <div style={{
        position: 'fixed',
        top: '0px',
        left: 0,
        width: '100%',
        height: '40px',
        backgroundColor: '#000000',
        color: '#ffffff',
        zIndex: 99999999, // on top of everything
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '2em',
        fontFamily: "'Space Mono', monospace",
        fontSize: '0.85rem',
        textTransform: 'lowercase',
        letterSpacing: '2px',
        fontWeight: 'bold',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
      }}>
        find in
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="/prava" element={<PravaSettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/shop/watchlist" element={<WatchlistPage />} />
          <Route path="/shop/deals" element={<EmptyShopPage eyebrow="Live deals" title="Live deals" description="Live merchant offers will appear here." />} />
          <Route
            path="/shop/products"
            element={<SwipixApp page="products" />}
          />
          <Route path="/shop/cart" element={<SwipixApp page="cart" />} />
          <Route path="/shop/*" element={<SwipixApp page="home" />} />
        </Routes>
      </div>
    </>
  );
}
