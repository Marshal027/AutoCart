import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Tell AutoCart What You Want",
      desc: "Use your voice or type out the exact item, brand, or condition you're looking for.",
    },
    {
      num: "02",
      title: "Set Your Conditions",
      desc: "Specify your maximum price or wait for a restock of a sold-out item.",
    },
    {
      num: "03",
      title: "Instant Purchase",
      desc: "The second your condition is met, AutoCart automatically buys it for you.",
    }
  ];

  return (
    <section id="how" className="section-padding">
      <div className="section-title-wrapper">
        <h2 className="section-title">How it works</h2>
      </div>
      <div className="info-grid">
        {steps.map((s, i) => (
          <div className="info-card" key={i}>
            <p className="mn" style={{ color: "var(--accent1)" }}>STEP {s.num}</p>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
