import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Services() {
  const containerRef = useRef(null);

  const services = [
    {
      id: "service-card-1",
      title: "Real-time Processing",
      image: "/images/work-items/work-item-1.jpg",
    },
    {
      id: "service-card-2",
      title: "Autonomous Agents",
      image: "/images/work-items/work-item-2.jpg",
    },
    {
      id: "service-card-3",
      title: "Secure Checkouts",
      image: "/images/work-items/work-item-3.jpg",
    },
    {
      id: "service-card-4",
      title: "Multi-Platform Integration",
      image: "/images/work-items/work-item-4.jpg",
    },
  ];

  useLayoutEffect(() => {
    let scrollTriggerInstances = [];

    const initAnimations = () => {
      // Kill existing instances
      scrollTriggerInstances.forEach((instance) => {
        if (instance) instance.kill();
      });
      scrollTriggerInstances = [];

      if (window.innerWidth <= 1000) return;

      const serviceCards = gsap.utils.toArray(".service-card");
      if (!serviceCards.length) return;

      // Main tracker
      const mainTrigger = ScrollTrigger.create({
        trigger: serviceCards[0],
        start: "top 50%",
        endTrigger: serviceCards[serviceCards.length - 1],
        end: "top 150%",
      });
      scrollTriggerInstances.push(mainTrigger);

      serviceCards.forEach((service, index) => {
        const isLastServiceCard = index === serviceCards.length - 1;
        const serviceCardInner = service.querySelector(".service-card-inner");

        if (!isLastServiceCard) {
          // Pin card at 45% of viewport
          const pinTrigger = ScrollTrigger.create({
            trigger: service,
            start: "top 45%",
            endTrigger: ".contact-cta",
            end: "top 90%",
            pin: true,
            pinSpacing: false,
          });
          scrollTriggerInstances.push(pinTrigger);

          // Move inner card upward as you scroll (creates the stacking/overlap)
          const scrollAnimation = gsap.to(serviceCardInner, {
            y: `-${(serviceCards.length - index) * 14}vh`,
            ease: "none",
            scrollTrigger: {
              trigger: service,
              start: "top 45%",
              endTrigger: ".contact-cta",
              end: "top 90%",
              scrub: true,
            },
          });
          scrollTriggerInstances.push(scrollAnimation.scrollTrigger);
        }
      });
    };

    initAnimations();

    const handleResize = () => {
      initAnimations();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scrollTriggerInstances.forEach((instance) => {
        if (instance) instance.kill();
      });
    };
  }, []);

  return (
    <section className="services" ref={containerRef}>
      {services.map((service) => (
        <div className="service-card" id={service.id} key={service.id}>
          <div className="service-card-inner">
            <div className="service-card-content">
              <h1>{service.title}</h1>
            </div>
            <div className="service-card-img">
              <img src={service.image} alt={service.title} />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
