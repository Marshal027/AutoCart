import React from "react";

export default function Trust() {
  return (
    <section id="trust" className="section-padding">
      <div className="section-title-wrapper">
        <h2 className="section-title">Security & Trust</h2>
      </div>
      <div className="info-grid">
        <div className="info-card">
          <p className="mn">Privacy First</p>
          <h3>Zero Data Sold</h3>
          <p>We never sell your data. Your shopping habits are your own.</p>
        </div>
        <div className="info-card">
          <p className="mn">Secure Payments</p>
          <h3>Bank-Level Security</h3>
          <p>We use Stripe to process payments. Your card details are fully encrypted.</p>
        </div>
      </div>
    </section>
  );
}
