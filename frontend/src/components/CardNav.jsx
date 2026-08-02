import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Link } from "react-router-dom";
import "./CardNav.css";

export default function CardNav({ items = [], children, className = "", ease = "power3.out", baseColor = "#fff", menuColor = "#111" }) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const timelineRef = useRef(null);

  const calculateHeight = () => {
    const nav = navRef.current;
    if (!nav) return 260;
    return window.matchMedia("(max-width: 768px)").matches ? 50 + nav.querySelector(".card-nav-content")?.scrollHeight + 16 : 260;
  };

  const createTimeline = () => {
    const nav = navRef.current;
    if (!nav) return null;
    gsap.set(nav, { height: 50, overflow: "hidden" });
    gsap.set(cardsRef.current, { y: 34, opacity: 0 });
    const timeline = gsap.timeline({ paused: true });
    timeline.to(nav, { height: calculateHeight, duration: 0.4, ease });
    timeline.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.35, ease, stagger: 0.07 }, "-=0.12");
    return timeline;
  };

  useLayoutEffect(() => {
    timelineRef.current = createTimeline();
    return () => timelineRef.current?.kill();
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!timelineRef.current) return;
      timelineRef.current.kill();
      const nextTimeline = createTimeline();
      if (nextTimeline && isOpen) nextTimeline.progress(1);
      timelineRef.current = nextTimeline;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  const toggleMenu = () => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (isOpen) {
      setIsOpen(false);
      timeline.reverse();
    } else {
      setIsOpen(true);
      timeline.play(0);
    }
  };

  const setCardRef = (index) => (element) => {
    if (element) cardsRef.current[index] = element;
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isOpen ? "open" : ""}`} style={{ backgroundColor: baseColor }}>
        <div className="card-nav-top">
          <Link className="card-nav-logo" to="/" onClick={() => setIsOpen(false)} aria-label="AutoCart home">AutoCart</Link>
          {children && <div className="card-nav-center">{children}</div>}
          {items.length > 0 && (
            <div className="card-nav-actions">
              <button type="button" className={`card-nav-menu ${isOpen ? "open" : ""}`} onClick={toggleMenu} aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isOpen} style={{ color: menuColor }}>
                <span /><span />
              </button>
            </div>
          )}
        </div>
        <div className="card-nav-content" aria-hidden={!isOpen}>
          {items.slice(0, 3).map((item, index) => (
            <Link key={`${item.label}-${index}`} to={item.to || "/"} onClick={() => setIsOpen(false)} className="card-nav-card" ref={setCardRef(index)} style={{ backgroundColor: item.bgColor, color: item.textColor }} aria-label={item.ariaLabel || item.label}>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
