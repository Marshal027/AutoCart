import React from "react";

export default function Merchants() {
  const merchants = [
    { name: "Amazon", category: "Retail" },
    { name: "BestBuy", category: "Electronics" },
    { name: "Nike", category: "Apparel" },
    { name: "Ticketmaster", category: "Tickets" },
    { name: "Target", category: "Retail" },
    { name: "Walmart", category: "Retail" }
  ];

  return (
    <section id="merchants" className="section-padding" style={{ background: "var(--accent2)" }}>
      <div className="section-title-wrapper">
        <h2 className="section-title">Supported Merchants</h2>
      </div>
      <div className="info-grid">
        {merchants.map((m, i) => (
          <div className="info-card" key={i} style={{ background: "var(--bg)", borderColor: "var(--fg)" }}>
            <p className="mn" style={{ color: "var(--accent3)" }}>{m.category}</p>
            <h3>{m.name}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
