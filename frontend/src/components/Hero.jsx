import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import VoiceBar from "./VoiceBar.jsx";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef(null);
  const imgRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(1);
  const totalImages = 10;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev >= totalImages ? 1 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 1.5 }); // wait for transition
      tl.to(".hero-header-1 h1", {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
      })
        .to(
          ".hero-header-2 h1",
          { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
          "-=0.8",
        )
        .to(
          ".hero-sub",
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "-=0.6",
        )
        .to(
          ".hero-footer",
          { opacity: 1, duration: 1, ease: "power3.out" },
          "-=0.6",
        );

      if (imgRef.current) {
        ScrollTrigger.create({
          trigger: ".hero-img-holder",
          start: "top bottom",
          end: "top top",
          onUpdate: (self) => {
            const progress = self.progress;
            gsap.set(imgRef.current, {
              y: `${-110 + 110 * progress}%`,
              scale: 0.25 + 0.75 * progress,
              rotation: -15 + 15 * progress,
            });
          },
        });
      }
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} style={{ position: "relative" }}>
      <section className="hero">
        <div
          className="hero-header-wrapper"
          style={{ zIndex: 20, position: "relative" }}
        >
          <div className="hero-header hero-header-1">
            <h1 style={{ opacity: 0, transform: "translateY(100%)" }}>
              The AI that
            </h1>
          </div>
          <div className="hero-header hero-header-2">
            <h1 style={{ opacity: 0, transform: "translateY(100%)" }}>
              Shops for you.
            </h1>
          </div>
        </div>

        <div
          style={{
            marginTop: "4em",
            width: "100%",
            zIndex: 10,
            position: "relative",
          }}
        >
          <VoiceBar />
        </div>

        <p
          className="hero-sub ss"
          style={{
            opacity: 0,
            transform: "translateY(20px)",
            marginTop: "2em",
            maxWidth: "600px",
            zIndex: 10,
            position: "relative",
          }}
        >
          Voice search, stunning discoveries, and instant purchases powered by
          Prava. Find it, love it, buy it — instantly. Set once. It buys the
          second it's true.
        </p>

        <div className="hero-footer">
          <div className="hero-footer-scroll-down"></div>
          <div className="hero-footer-tags"></div>
        </div>
      </section>

      <section className="hero-img-holder">
        <div className="hero-img" ref={imgRef} style={{ position: "relative" }}>
          {Array.from({ length: totalImages }).map((_, i) => (
            <img
              key={i}
              src={`/images/hero/img${i + 1}.jpg`}
              alt={`Hero feature ${i + 1}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: currentImageIndex === i + 1 ? 1 : 0,
                transition: "opacity 1s ease-in-out",
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
