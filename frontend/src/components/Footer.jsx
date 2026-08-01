import React, { useEffect, useRef } from 'react';

export default function Footer() {
  const footerRef = useRef(null);
  const explosionContainerRef = useRef(null);
  const hasExplodedRef = useRef(false);
  const animationIdRef = useRef(null);

  useEffect(() => {
    const config = {
      gravity: 0.25,
      friction: 0.99,
      imageWidth: 150, // Change this for width
      imageHeight: 150, // Change this for length/height
      horizontalForce: 20,
      verticalForce: 15,
      rotationSpeed: 10,
    };

    const imageParticleCount = 10;
    const imagePaths = Array.from(
      { length: imageParticleCount },
      (_, i) => `/images/work-items/work-item-${i + 1}.jpg`
    );

    // Preload
    imagePaths.forEach((path) => {
      const img = new Image();
      img.src = path;
    });

    const createParticles = () => {
      if (!explosionContainerRef.current) return;
      explosionContainerRef.current.innerHTML = "";
      imagePaths.forEach((path) => {
        const particle = document.createElement("img");
        particle.src = path;
        particle.classList.add("explosion-particle-img");
        particle.style.width = `${config.imageWidth}px`;
        particle.style.height = `${config.imageHeight}px`;
        particle.style.objectFit = "cover";
        explosionContainerRef.current.appendChild(particle);
      });
    };

    class Particle {
      constructor(element) {
        this.element = element;
        this.x = 0;
        this.y = 0;
        this.vx = (Math.random() - 0.5) * config.horizontalForce;
        this.vy = -config.verticalForce - Math.random() * 10;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * config.rotationSpeed;
      }

      update() {
        this.vy += config.gravity;
        this.vx *= config.friction;
        this.vy *= config.friction;
        this.rotationSpeed *= config.friction;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg)`;
      }
    }

    const explode = () => {
      if (hasExplodedRef.current) return;
      hasExplodedRef.current = true;

      createParticles();
      const particleElements = explosionContainerRef.current.querySelectorAll(".explosion-particle-img");
      const particles = Array.from(particleElements).map((element) => new Particle(element));

      const animate = () => {
        particles.forEach((particle) => particle.update());
        animationIdRef.current = requestAnimationFrame(animate);

        if (particles.every((particle) => particle.y > window.innerHeight)) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
      animate();
    };

    const checkFooterPosition = () => {
      if (!footerRef.current) return;
      const footerRect = footerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (footerRect.top > viewportHeight + 100) {
        hasExplodedRef.current = false;
      }
      if (!hasExplodedRef.current && footerRect.top <= viewportHeight + 250) {
        explode();
      }
    };

    let checkTimeout;
    const handleScroll = () => {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(checkFooterPosition, 5);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", () => {
      hasExplodedRef.current = false;
    });

    createParticles();
    checkTimeout = setTimeout(checkFooterPosition, 500);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      clearTimeout(checkTimeout);
    };
  }, []);

  return (
    <footer ref={footerRef}>
      <div className="explosion-container" ref={explosionContainerRef}></div>
      <div className="footer-container">
        <div className="footer-header">
          <h1>Trigr</h1>
        </div>
        <div className="footer-row">
          <div className="footer-col">
            <p>Explore</p>
            <p><a href="/">Home</a></p>
            <p><a href="#how">How it works</a></p>
            <p><a href="#merchants">Merchants</a></p>
          </div>
          <div className="footer-col">
            <p>Company</p>
            <p><a href="#">About</a></p>
            <p><a href="#">Careers</a></p>
            <p><a href="#">Privacy</a></p>
            <p><a href="#">Terms</a></p>
          </div>
          <div className="footer-col">
            <p>Connect</p>
            <p><a href="#">Twitter</a></p>
            <p><a href="#">Instagram</a></p>
            <p><a href="#">Discord</a></p>
          </div>
        </div>
        <div className="copyright-info">
          <p className="mn">© Trigr // 2026</p>
          <p className="mn">Built with Prava</p>
        </div>
      </div>
    </footer>
  );
}
