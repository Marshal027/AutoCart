import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Home from "./Home.jsx";
import SwipixApp from "./SwipixApp.tsx";
import VisionPage from "./VisionPage.jsx";
import RippleGrid from "./components/RippleGrid.jsx";

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

    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: '#d9fcf9' }}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <RippleGrid
            enableRainbow
            gridColor="#ffffff"
            rippleIntensity={0.06}
            gridSize={22}
            gridThickness={16}
            fadeDistance={2.4}
            vignetteStrength={5}
            glowIntensity={0.5}
            opacity={1}
            gridRotation={0}
            mouseInteraction
            mouseInteractionRadius={1}
          />
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="cursor-dot" ref={cursorRef} style={{ pointerEvents: 'none', zIndex: 9999, position: 'fixed', top: 0, left: 0 }} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="/shop/*" element={<SwipixApp />} />
        </Routes>
      </div>
    </>
  );
}
