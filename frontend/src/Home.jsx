import { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import FeaturedWork from './components/FeaturedWork.jsx';
import Services from './components/Services.jsx';
import ContactCTA from './components/ContactCTA.jsx';
import Footer from './components/Footer.jsx';
import Loader from './components/Loader.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);
        return () => {
            lenis.destroy();
            cancelAnimationFrame(rafId);
        };
    }, []);

    const handleLoadComplete = () => {
        setIsLoaded(true);
        const overlays = document.querySelectorAll('.transition-overlay');
        overlays.forEach(el => {
            el.style.transform = 'scaleY(0)';
        });
    };

    return (
        <>
            {/* Loader screen - only show before loaded */}
            {!isLoaded && <Loader onComplete={handleLoadComplete} />}

            {/* Transition overlays */}
            <div className="transition" style={{ display: isLoaded ? 'none' : 'block' }}>
                <div className="transition-overlay overlay-5" style={{ transform: 'scaleY(0)' }}></div>
                <div className="transition-overlay overlay-4" style={{ transform: 'scaleY(0)' }}></div>
                <div className="transition-overlay overlay-3" style={{ transform: 'scaleY(0)' }}></div>
                <div className="transition-overlay overlay-2" style={{ transform: 'scaleY(0)' }}></div>
                <div className="transition-overlay overlay-1" style={{ transform: 'scaleY(0)' }}></div>
            </div>

            <Nav />
            <Hero />
            <FeaturedWork />
            <Services />
            <ContactCTA />
            <Footer />
        </>
    );
}
