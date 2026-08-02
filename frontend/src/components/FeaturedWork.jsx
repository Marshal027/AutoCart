import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function FeaturedWork() {
  const containerRef = useRef(null);
  const indicatorRef = useRef(null);
  const imagesRef = useRef(null);
  const titlesRef = useRef(null);

  const features = [
    "Voice Search",
    "Multi-Agent AI",
    "Real-Time Pricing",
    "Guaranteed Authentic",
    "Auto Checkout",
  ];

  useLayoutEffect(() => {
    let scrollTriggerInstance = null;

    const initAnimations = () => {
      const isMobile = window.innerWidth <= 1000;
      const positionScale = isMobile
        ? Math.min(1, window.innerWidth / 1120)
        : 1;

      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }

      // Generate indicators
      if (indicatorRef.current) {
        indicatorRef.current.innerHTML = "";
        for (let section = 1; section <= 5; section++) {
          const sectionNumber = document.createElement("p");
          sectionNumber.className = "mn";
          sectionNumber.textContent = `0${section}`;
          indicatorRef.current.appendChild(sectionNumber);
          for (let i = 0; i < 10; i++) {
            const indicator = document.createElement("div");
            indicator.className = "indicator";
            indicatorRef.current.appendChild(indicator);
          }
        }
      }

      const featuredCardPosSmall = [
        { y: 100, x: 1000 },
        { y: 1500, x: 100 },
        { y: 1250, x: 1950 },
        { y: 1500, x: 850 },
        { y: 200, x: 2100 },
        { y: 250, x: 600 },
        { y: 1100, x: 1650 },
        { y: 1000, x: 800 },
        { y: 900, x: 2200 },
        { y: 150, x: 1600 },
      ];
      const featuredCardPosLarge = [
        { y: 800, x: 5000 },
        { y: 2000, x: 3000 },
        { y: 240, x: 4450 },
        { y: 1200, x: 3450 },
        { y: 500, x: 2200 },
        { y: 750, x: 1100 },
        { y: 1850, x: 3350 },
        { y: 2200, x: 1300 },
        { y: 3000, x: 1950 },
        { y: 500, x: 4500 },
      ];
      const featuredCardPos =
        window.innerWidth >= 1600 ? featuredCardPosLarge : featuredCardPosSmall;

      const moveDistance = window.innerWidth * 4;

      if (imagesRef.current) {
        imagesRef.current.innerHTML = "";
        for (let i = 1; i <= 10; i++) {
          const featuredImgCard = document.createElement("div");
          featuredImgCard.className = `featured-img-card featured-img-card-${i}`;
          const img = document.createElement("img");
          // Reusing work-item images as feature showcases
          img.src = `/images/work-items/work-item-${i}.jpeg`;
          img.alt = `feature image ${i}`;
          featuredImgCard.appendChild(img);
          const position = featuredCardPos[i - 1];
          gsap.set(featuredImgCard, {
            x: position.x * positionScale,
            y: position.y * positionScale,
            z: -1500,
            scale: 0,
          });
          imagesRef.current.appendChild(featuredImgCard);
        }
      }

      scrollTriggerInstance = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: `+=${window.innerHeight * 5}px`,
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const xPosition = -moveDistance * self.progress;
          if (titlesRef.current) {
            gsap.set(titlesRef.current, { x: xPosition });
          }

          if (imagesRef.current) {
            const cards =
              imagesRef.current.querySelectorAll(".featured-img-card");
            cards.forEach((card, index) => {
              const staggerOffset = index * 0.075;
              const scaledProgress = (self.progress - staggerOffset) * 2;
              const individualProgress = Math.max(
                0,
                Math.min(1, scaledProgress),
              );
              const newZ = -1500 + 3000 * individualProgress;
              const scaleProgress = Math.min(1, individualProgress * 10);
              const scale = Math.max(0, Math.min(1, scaleProgress));
              gsap.set(card, {
                z: newZ,
                scale: scale,
              });
            });
          }

          if (indicatorRef.current) {
            const indicators =
              indicatorRef.current.querySelectorAll(".indicator");
            const totalIndicators = indicators.length;
            const progressPerIndicator = 1 / totalIndicators;
            indicators.forEach((indicator, index) => {
              const indicatorStart = index * progressPerIndicator;
              const indicatorOpacity = self.progress > indicatorStart ? 1 : 0.2;
              gsap.to(indicator, {
                opacity: indicatorOpacity,
                duration: 0.3,
              });
            });
          }
        },
      });
    };

    const ctx = gsap.context(() => {
      initAnimations();
    }, containerRef);

    const handleResize = () => {
      initAnimations();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ctx.revert();
    };
  }, []);

  return (
    <section className="featured-work" ref={containerRef}>
      <div className="featured-titles" ref={titlesRef}>
        {features.map((feature, i) => (
          <div className="featured-title-wrapper" key={i}>
            <h1>{feature}</h1>
            <div className="featured-title-img">
              <img
                src={`/images/work-items/work-item-${i + 1}.jpeg`}
                alt={feature}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="featured-images" ref={imagesRef}></div>
      <div
        className="scroll-indicator featured-work-indicator"
        ref={indicatorRef}
      ></div>
      <div className="featured-work-footer">
        <p className="mn">Features</p>
        <p className="mn">Capabilities</p>
      </div>
    </section>
  );
}
