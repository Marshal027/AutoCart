import React, { useLayoutEffect, useRef } from "react";
import ScrollStack, { ScrollStackItem } from "./ScrollStack.jsx";

export default function Services() {
  const containerRef = useRef(null);
  const indicatorRef = useRef(null);

  const services = [
    {
      id: "service-card-1",
      title: "Real-time Processing",
      image: "/images/work-items/work-item-1.jpeg",
    },
    {
      id: "service-card-2",
      title: "Autonomous Agents",
      image: "/images/work-items/work-item-2.jpeg",
    },
    {
      id: "service-card-3",
      title: "Secure Checkouts",
      image: "/images/work-items/work-item-3.jpeg",
    },
    {
      id: "service-card-4",
      title: "Multi-Platform Integration",
      image: "/images/work-items/work-item-4.jpeg",
    },
  ];

  useLayoutEffect(() => {
    let frameId = null;

    const updateIndicator = () => {
      frameId = null;
      if (!containerRef.current || !indicatorRef.current) return;

      const section = containerRef.current;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const sectionBottom = sectionTop + section.offsetHeight;
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      const sectionProgress = Math.max(
        0,
        Math.min(
          1,
          (viewportCenter - sectionTop) / (sectionBottom - sectionTop),
        ),
      );
      const isActive =
        viewportCenter >= sectionTop && viewportCenter <= sectionBottom;

      indicatorRef.current.style.opacity = isActive ? "1" : "0";
      indicatorRef.current.style.visibility = isActive ? "visible" : "hidden";

      const indicators = indicatorRef.current.querySelectorAll(".indicator");
      const progressPerIndicator = 1 / indicators.length;
      indicators.forEach((indicator, index) => {
        indicator.style.opacity =
          sectionProgress > index * progressPerIndicator ? "1" : "0.2";
      });
    };

    const scheduleIndicatorUpdate = () => {
      if (frameId === null) frameId = requestAnimationFrame(updateIndicator);
    };

    window.addEventListener("scroll", scheduleIndicatorUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleIndicatorUpdate);
    scheduleIndicatorUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleIndicatorUpdate);
      window.removeEventListener("resize", scheduleIndicatorUpdate);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className="services" ref={containerRef}>
      <div
        className="scroll-indicator services-scroll-indicator"
        ref={indicatorRef}
        aria-hidden="true"
      >
        {services.map((service, serviceIndex) => (
          <React.Fragment key={service.id}>
            <p className="mn">0{serviceIndex + 1}</p>
            {Array.from({ length: 10 }, (_, indicatorIndex) => (
              <div
                className="indicator"
                key={`${service.id}-indicator-${indicatorIndex}`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <ScrollStack
        className="services-scroll-stack"
        itemDistance={48}
        itemScale={0.025}
        itemStackDistance={72}
        stackPosition="18%"
        scaleEndPosition="10%"
        baseScale={0.88}
        useWindowScroll
      >
        {services.map((service, serviceIndex) => (
          <ScrollStackItem
            key={service.id}
            itemClassName={`service-card service-card-inner service-card-${serviceIndex + 1}`}
          >
            <div className="service-card-content">
              <h1>{service.title}</h1>
            </div>
            <div className="service-card-img">
              <img src={service.image} alt={service.title} />
            </div>
          </ScrollStackItem>
        ))}
      </ScrollStack>
    </section>
  );
}
