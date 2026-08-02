import React from 'react';
import { useNavigate } from 'react-router-dom';
import VisionSearch from './vision';
import Nav from './components/Nav';

export default function VisionPage() {
    const navigate = useNavigate();

    const handleProductFound = (product) => {
        navigate(`/shop?q=${encodeURIComponent(product.itemName || '')}`);
    };

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
                <Nav />
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%' }}>
                <VisionSearch onProductFound={handleProductFound} className="fullscreen-mode" />
            </div>
        </div>
    );
}
