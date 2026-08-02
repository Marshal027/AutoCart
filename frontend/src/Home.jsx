import { useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import FeaturedWork from "./components/FeaturedWork.jsx";
import Services from "./components/Services.jsx";
import Footer from "./components/Footer.jsx";
import Loader from "./components/Loader.jsx";
import ShopHeaderLinks from "./components/ShopHeaderLinks.jsx";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadComplete = () => {
    setIsLoaded(true);
    const overlays = document.querySelectorAll(".transition-overlay");
    overlays.forEach((el) => {
      el.style.transform = "scaleY(0)";
    });
  };

  return (
    <>
      {/* Loader screen - only show before loaded */}
      {!isLoaded && <Loader onComplete={handleLoadComplete} />}

      {/* Transition overlays */}
      <div
        className="transition"
        style={{ display: isLoaded ? "none" : "block" }}
      >
        <div
          className="transition-overlay overlay-5"
          style={{ transform: "scaleY(0)" }}
        ></div>
        <div
          className="transition-overlay overlay-4"
          style={{ transform: "scaleY(0)" }}
        ></div>
        <div
          className="transition-overlay overlay-3"
          style={{ transform: "scaleY(0)" }}
        ></div>
        <div
          className="transition-overlay overlay-2"
          style={{ transform: "scaleY(0)" }}
        ></div>
        <div
          className="transition-overlay overlay-1"
          style={{ transform: "scaleY(0)" }}
        ></div>
      </div>

      <Nav>
        <ShopHeaderLinks />
      </Nav>
      <Hero />
      <FeaturedWork />
      <Services />
      <Footer />
    </>
  );
}
