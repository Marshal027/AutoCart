import { useState, useEffect, useRef } from "react";
import gsap from "gsap";

export default function Nav({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const tl = useRef(null);
  const linkTl = useRef(null);

  useEffect(() => {
    // Initial nav animation
    gsap.fromTo(
      navRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.1 }
    );
  }, []);

  useEffect(() => {
    // Menu toggle animation setup
    tl.current = gsap.timeline({ paused: true });
    tl.current.to(".nav-overlay", {
      duration: 1.25,
      scaleY: 1,
      transformOrigin: "top",
      ease: "power4.inOut"
    });

    linkTl.current = gsap.timeline({ paused: true });
    linkTl.current.to(".nav-item p", {
      y: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power4.out",
      delay: 0.25
    });
    linkTl.current.to(".nav-footer", {
      opacity: 1,
      duration: 1,
      ease: "power4.out",
    }, "-=0.5");
  }, []);

  useEffect(() => {
    if (menuOpen) {
      tl.current.play();
      linkTl.current.play();
      gsap.to(".open-label", { y: "-100%", duration: 0.5, ease: "power3.inOut" });
      gsap.to(".close-label", { y: "-100%", duration: 0.5, ease: "power3.inOut" });
    } else {
      linkTl.current.reverse();
      setTimeout(() => {
        tl.current.reverse();
      }, 500);
      gsap.to(".open-label", { y: "0%", duration: 0.5, ease: "power3.inOut" });
      gsap.to(".close-label", { y: "0%", duration: 0.5, ease: "power3.inOut" });
    }
  }, [menuOpen]);

  const links = [
    { label: "Home", href: "#" },
    { label: "How it works", href: "#how" },
    { label: "Merchants", href: "#merchants" },
    { label: "Trust", href: "#trust" },
  ];

  return (
    <>
      <nav ref={navRef}>
        <div className="logo">
          <div className="logo-container">
            <p className="mn"><a href="/">Trigr</a></p>
          </div>
        </div>
        
        {children && (
          <div className="nav-center" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 2rem' }}>
            {children}
          </div>
        )}

        <div className="menu-toggle-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="menu-toggle-btn-wrapper">
            <p className="mn open-label">Menu</p>
            <p className="mn close-label" style={{ position: "absolute", top: "100%" }}>Close</p>
          </div>
        </div>
      </nav>

      <div className="nav-overlay">
        <div className="nav-items">
          {links.map((l, i) => (
            <div className={`nav-item ${i === 0 ? "active" : ""}`} key={l.href}>
              <p onClick={() => setMenuOpen(false)}><a href={l.href}>{l.label}</a></p>
            </div>
          ))}
        </div>
        <div className="nav-footer">
          <div className="nav-footer-item">
            <p className="mn">Connect</p>
            <p className="mn"><a href="#">Twitter</a></p>
          </div>
          <div className="nav-footer-item" style={{ textAlign: "right" }}>
            <p className="mn">Support</p>
            <p className="mn"><a href="mailto:support@trigr.com">support@trigr.com</a></p>
          </div>
        </div>
      </div>
    </>
  );
}
