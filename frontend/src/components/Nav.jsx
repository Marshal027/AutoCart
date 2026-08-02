import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";

export default function Nav({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);
  const overlayRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    // Initial nav animation
    gsap.fromTo(
      navRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.1 },
    );
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;

    const itemLabels = overlay.querySelectorAll(".nav-item p");
    const footer = footerRef.current;
    const openLabel = navRef.current?.querySelector(".open-label");
    const closeLabel = navRef.current?.querySelector(".close-label");
    gsap.killTweensOf([overlay, itemLabels, footer, openLabel, closeLabel]);

    if (menuOpen) {
      gsap.to(openLabel, { y: "-100%", duration: 0.35, ease: "power3.inOut" });
      gsap.to(closeLabel, { y: "-100%", duration: 0.35, ease: "power3.inOut" });
      gsap.to(overlay, {
        duration: 0.85,
        scaleY: 1,
        transformOrigin: "top",
        ease: "power4.inOut",
      });
      gsap.to(itemLabels, {
        y: 0,
        duration: 0.75,
        stagger: 0.07,
        ease: "power4.out",
        delay: 0.22,
      });
      gsap.to(footer, { opacity: 1, duration: 0.55, delay: 0.35 });
    } else {
      gsap.to(openLabel, { y: "0%", duration: 0.35, ease: "power3.inOut" });
      gsap.to(closeLabel, { y: "0%", duration: 0.35, ease: "power3.inOut" });
      gsap.to(itemLabels, {
        y: "100%",
        duration: 0.3,
        stagger: 0.03,
        ease: "power3.in",
      });
      gsap.to(footer, { opacity: 0, duration: 0.2 });
      gsap.to(overlay, {
        duration: 0.65,
        scaleY: 0,
        transformOrigin: "top",
        ease: "power4.inOut",
        delay: 0.12,
      });
    }

    return () =>
      gsap.killTweensOf([overlay, itemLabels, footer, openLabel, closeLabel]);
  }, [menuOpen]);

  const links = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/shop" },
    { label: "Products", to: "/shop/products" },
    { label: "Cart", to: "/shop/cart" },
    { label: "Visual search", to: "/vision" },
    { label: "Prava sandbox", to: "/prava" },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav ref={navRef} className={menuOpen ? "nav--menu-open" : ""}>
        <div className="logo">
          <div className="logo-container">
            <p className="mn">
              <Link to="/" onClick={closeMenu}>
                Trigr
              </Link>
            </p>
          </div>
        </div>

        {children && (
          <div
            className="nav-center"
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "0 2rem",
            }}
          >
            {children}
          </div>
        )}

        <button
          type="button"
          className={`menu-toggle-btn ${menuOpen ? "menu-toggle-btn--open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-navigation-overlay"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
        >
          <div className="menu-toggle-btn-wrapper">
            <p className="mn open-label">Menu</p>
            <p className="mn close-label">Close</p>
          </div>
        </button>
      </nav>

      <div
        ref={overlayRef}
        id="site-navigation-overlay"
        className={`nav-overlay ${menuOpen ? "nav-overlay--open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="nav-items">
          {links.map((l, i) => (
            <div
              className={`nav-item ${location.pathname === l.to ? "active" : ""}`}
              key={l.to}
            >
              <p onClick={closeMenu}>
                <Link to={l.to}>{l.label}</Link>
              </p>
            </div>
          ))}
        </div>
        <div className="nav-footer" ref={footerRef}>
          <div className="nav-footer-item">
            <p className="mn">Connect</p>
            <p className="mn">
              <a href="#">Twitter</a>
            </p>
          </div>
          <div className="nav-footer-item" style={{ textAlign: "right" }}>
            <p className="mn">Support</p>
            <p className="mn">
              <a href="mailto:support@trigr.com">support@trigr.com</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
