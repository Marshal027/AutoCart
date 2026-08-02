import { useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Info, X } from "lucide-react";

function iconFor(level) {
  if (level === "success") return <CheckCircle2 size={15} />;
  if (level === "error") return <CircleAlert size={15} />;
  return level === "warning" ? <CircleAlert size={15} /> : <Info size={15} />;
}

export default function ActivityPanel({ events = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="activity-toggle" onClick={() => setOpen(true)}>
        <Activity size={16} />
        Activity
        <span>{events.length}</span>
      </button>
      {open && (
        <>
          <button type="button" className="activity-backdrop" aria-label="Close activity" onClick={() => setOpen(false)} />
          <aside className="activity-panel" aria-label="AutoCart payment activity">
            <div className="activity-panel-header">
              <div><span className="route-eyebrow">Live diagnostics</span><h2>Activity</h2></div>
              <button type="button" className="activity-close" onClick={() => setOpen(false)} aria-label="Close activity"><X size={18} /></button>
            </div>
            <p className="activity-panel-note">Operational events from AutoCart, MCP sessions, and Prava. Sensitive card data is never recorded.</p>
            <div className="activity-list">
              {events.length === 0 && <p className="activity-empty">No flow events yet. Start checkout to monitor it here.</p>}
              {events.map((event) => (
                <article className={`activity-event activity-event--${event.level || "info"}`} key={event.id}>
                  <span className="activity-event-icon">{iconFor(event.level)}</span>
                  <div><div className="activity-event-top"><strong>{event.title || "Flow event"}</strong><time>{event.time}</time></div><p>{event.message}</p></div>
                </article>
              ))}
            </div>
            <div className="activity-panel-footer">Card details, CVV, tokens, and session tokens are excluded.</div>
          </aside>
        </>
      )}
    </>
  );
}
