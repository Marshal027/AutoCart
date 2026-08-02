import React from 'react';

function ProductCard({ product, isRecommended, onBuy }) {
  if (!product) return null;
  return (
    <div className="result-card" style={{ 
        background: isRecommended ? "var(--accent2)" : "var(--bg)",
        borderColor: "var(--fg)"
      }}>
      <div className="result-header">
        <h3 style={{ fontSize: "1.5rem" }}>{product.name || "Product"}</h3>
        {isRecommended && <span className="mn" style={{ color: "var(--accent1)" }}>Recommended</span>}
      </div>
      <p className="mn" style={{ marginBottom: "1em", color: "var(--fg)" }}>Price: ${product.price || "0.00"}</p>
      {product.image && (
        <div style={{ width: "100%", height: "200px", background: "var(--bg2)", marginBottom: "1em", border: "2px solid var(--fg)" }}>
          {/* <img src={product.image} alt={product.name} /> */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p className="mn">Image Preview</p>
          </div>
        </div>
      )}
      <button className="buy-btn" onClick={() => onBuy(product)}>Buy Instantly</button>
    </div>
  );
}

export default function SearchResults({ products, recommendation, voiceResponse, onBuy }) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return (
      <section className="search-results empty" id="search-results">
        <div className="wrap" style={{ textAlign: "center", padding: "2em" }}>
          <p className="ss">No products found or invalid response.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="search-results" id="search-results">
      <div className="wrap">
        <div className="section-title-wrapper" style={{ marginBottom: "2em" }}>
          <h2 className="section-title">Found {products.length} products</h2>
          {voiceResponse && <p className="voice-response-text" style={{ fontStyle: "italic", marginTop: "1em" }}>AI: "{voiceResponse}"</p>}
        </div>
        
        <div className="info-grid">
          {products.map((prod, i) => (
            <ProductCard 
              key={prod.id || i}
              product={prod}
              isRecommended={recommendation && recommendation.id === prod.id}
              onBuy={onBuy}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
