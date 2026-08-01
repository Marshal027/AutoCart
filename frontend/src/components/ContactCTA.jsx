import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ContactCTA() {
  const ctaRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Small pulse animation on the button when hovering
      const btn = ctaRef.current.querySelector(".contact-button");
      if (btn) {
        btn.addEventListener("mouseenter", () => {
          gsap.to(btn, { scale: 1.02, duration: 0.3, ease: "power2.out" });
        });
        btn.addEventListener("mouseleave", () => {
          gsap.to(btn, { scale: 1, duration: 0.3, ease: "power2.out" });
        });
      }
    }, ctaRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="contact-cta" ref={ctaRef}>
      <div className="contact-button">
        <a href="#demo"></a>
        <div className="contact-text-small">
          <p className="ss">Start automating your purchases today.</p>
        </div>
        <div className="contact-text-large">
          <h1>Get Started</h1>
        </div>
      </div>
    </section>
  );
}
