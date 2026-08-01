import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function BuyAnimation({ product, onDismiss }) {
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const textRef = useRef(null);
  const checkRef = useRef(null);
  const particlesRef = useRef(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setTimeout(() => {
            gsap.to(overlayRef.current, { opacity: 0, duration: 0.5, onComplete: onDismiss });
          }, 2000);
        }
      });
      
      tl.to(overlayRef.current, { opacity: 1, duration: 0.4, ease: 'power2.out' })
        .fromTo(cardRef.current, 
          { scale: 0.8, y: 50, opacity: 0 }, 
          { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
        )
        .fromTo(textRef.current, 
          { opacity: 0, y: 20 }, 
          { opacity: 1, y: 0, duration: 0.4 }
        )
        .to(textRef.current, { opacity: 0, duration: 0.3 }, "+=0.8")
        .fromTo(checkRef.current,
          { strokeDasharray: 100, strokeDashoffset: 100, opacity: 0 },
          { strokeDashoffset: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
        )
        .add(() => {
          // Trigger particles
          if (particlesRef.current) {
            Array.from(particlesRef.current.children).forEach((p, i) => {
              const angle = (i / 30) * Math.PI * 2;
              const velocity = 50 + Math.random() * 50;
              gsap.to(p, {
                x: Math.cos(angle) * velocity,
                y: Math.sin(angle) * velocity,
                opacity: 0,
                duration: 0.6 + Math.random() * 0.4,
                ease: 'power3.out'
              });
            });
          }
        }, "-=0.2");
        
    });
    
    return () => ctx.revert();
  }, [onDismiss]);

  return (
    <div className="buy-animation-overlay" ref={overlayRef} onClick={onDismiss} style={{ opacity: 0 }}>
      <div className="buy-animation-content" onClick={(e) => e.stopPropagation()}>
        <div className="buy-card" ref={cardRef}>
          <img src={product?.imageUrl || 'https://via.placeholder.com/150'} alt="product" />
          <div className="particles-container" ref={particlesRef}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="particle"></div>
            ))}
          </div>
          <svg className="check-svg" ref={checkRef} viewBox="0 0 52 52" style={{ opacity: 0 }}>
            <circle className="check-circle" cx="26" cy="26" r="25" fill="none"/>
            <path className="check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
        <div className="buy-status-text" ref={textRef}>
          Processing with Prava...
        </div>
      </div>
    </div>
  );
}
