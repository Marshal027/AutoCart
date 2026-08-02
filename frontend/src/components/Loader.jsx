import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

export default function Loader({ onComplete }) {
  const loaderRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const hasFinished = useRef(false);

  const finishLoading = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    // Fade out loader content
    tl.to(".loader-logo", { y: -50, opacity: 0, duration: 0.4, ease: "power2.in" })
      .to(".loader-line", { scaleX: 0, opacity: 0, duration: 0.4, ease: "power2.in" }, "-=0.2")
      .to(".loader-tagline", { opacity: 0, duration: 0.3 }, "-=0.2")
      .to(".loader-counter", { opacity: 0, duration: 0.3 }, "-=0.2");

    // Rainbow color wipe strips slide down in sequence
    tl.to(".loader-strip-5", { scaleY: 1, duration: 0.4, ease: "power2.inOut" }, "-=0.1")
      .to(".loader-strip-4", { scaleY: 1, duration: 0.4, ease: "power2.inOut" }, "-=0.25")
      .to(".loader-strip-3", { scaleY: 1, duration: 0.4, ease: "power2.inOut" }, "-=0.25")
      .to(".loader-strip-2", { scaleY: 1, duration: 0.4, ease: "power2.inOut" }, "-=0.25")
      .to(".loader-strip-1", { scaleY: 1, duration: 0.4, ease: "power2.inOut" }, "-=0.25");

    // Then wipe them all away (scale from bottom)
    tl.to(".loader-strip", {
      scaleY: 0,
      transformOrigin: "bottom",
      duration: 0.6,
      stagger: 0.08,
      ease: "power3.inOut",
    }, "+=0.1")
    .to(loaderRef.current, {
      opacity: 0,
      duration: 0.3,
      pointerEvents: "none",
    }, "-=0.3");

  }, [onComplete]);

  useEffect(() => {
    // Images to preload
    const imageParticleCount = 10;
    const imagePaths = Array.from(
      { length: imageParticleCount },
      (_, i) => `/images/work-items/work-item-${i + 1}.jpg`
    );

    let loadedCount = 0;

    // Fallback timer in case images are missing or take too long
    const maxTimeout = setTimeout(() => {
      finishLoading();
    }, 5000);

    const checkLoading = () => {
      loadedCount++;
      const percent = Math.floor((loadedCount / imagePaths.length) * 100);
      setProgress(percent);
      if (loadedCount >= imagePaths.length) {
        clearTimeout(maxTimeout);
        // Small delay so user sees 100%
        setTimeout(finishLoading, 400);
      }
    };

    imagePaths.forEach((path) => {
      const img = new Image();
      img.onload = checkLoading;
      img.onerror = checkLoading;
      img.src = path;
    });

    // Initial entrance animations
    gsap.to(".loader-logo", { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
    gsap.to(".loader-tagline", { opacity: 1, duration: 1, delay: 0.5 });
    gsap.to(".loader-counter", { opacity: 1, duration: 1, delay: 0.5 });
    gsap.to(".loader-line", { opacity: 1, duration: 1, delay: 0.3 });

    return () => {
      clearTimeout(maxTimeout);
    };
  }, [finishLoading]);

  useEffect(() => {
    gsap.to(".loader-line-fill", {
      width: `${progress}%`,
      duration: 0.3,
      ease: "power1.out"
    });
  }, [progress]);

  return (
    <div className="loader-screen" ref={loaderRef}>
      <div className="loader-content">
        <div className="loader-logo" style={{ opacity: 0, transform: 'translateY(30px)' }}>
          AutoCart
        </div>
        <div className="loader-tagline" style={{ opacity: 0 }}>Initializing Models</div>
        <div className="loader-line" style={{ opacity: 0 }}>
          <div className="loader-line-fill"></div>
        </div>
        <div className="loader-counter" style={{ opacity: 0 }}>{progress}%</div>
      </div>

      {/* Rainbow color strips for exit animation */}
      <div className="loader-strip loader-strip-5" style={{ background: 'var(--accent4)', transform: 'scaleY(0)', transformOrigin: 'top' }}></div>
      <div className="loader-strip loader-strip-4" style={{ background: 'var(--accent3)', transform: 'scaleY(0)', transformOrigin: 'top' }}></div>
      <div className="loader-strip loader-strip-3" style={{ background: 'var(--accent2)', transform: 'scaleY(0)', transformOrigin: 'top' }}></div>
      <div className="loader-strip loader-strip-2" style={{ background: 'var(--accent1)', transform: 'scaleY(0)', transformOrigin: 'top' }}></div>
      <div className="loader-strip loader-strip-1" style={{ background: 'var(--fg)', transform: 'scaleY(0)', transformOrigin: 'top' }}></div>
    </div>
  );
}
