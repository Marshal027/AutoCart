import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Home from "./Home.jsx";
import SwipixApp from "./SwipixApp.tsx";

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
      <div className="cursor-dot" ref={cursorRef} style={{ pointerEvents: 'none', zIndex: 9999, position: 'fixed', top: 0, left: 0 }} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop/*" element={<SwipixApp />} />
      </Routes>
    </>
  );
}
