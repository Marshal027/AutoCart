const BASE = "/api";

async function req(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getProducts: () => req("/products"),
  matchVoice: (text) => req("/voice/match", { method: "POST", body: JSON.stringify({ text }) }),
  buyNow: (productId) => req("/buy", { method: "POST", body: JSON.stringify({ productId }) }),
  createWatch: (productId, ceiling, condition) =>
    req("/watches", { method: "POST", body: JSON.stringify({ productId, ceiling, condition }) }),
  listWatches: () => req("/watches"),
  getWatch: (id) => req(`/watches/${id}`),
  cancelWatch: (id) => req(`/watches/${id}/cancel`, { method: "POST" }),
  getLedger: () => req("/ledger"),
  
  // Agent endpoints
  searchAgent: (query) => req('/agent/search', { method: 'POST', body: JSON.stringify({ query }) }),
  buyAgent: (product) => req('/agent/buy', { method: 'POST', body: JSON.stringify(product) }),
  chatAgent: (message, history) => req('/agent/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
  getHistory: () => req('/agent/history')
};
