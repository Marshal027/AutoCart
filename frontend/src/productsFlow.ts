export type ProductFlowState = {
  plannerResults: any;
  query: string;
  answers: Record<string, string>;
};

const FLOW_STORAGE_KEY = "trigr-product-flow";

export function saveProductFlow(flow: ProductFlowState) {
  sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow));
}

export function loadProductFlow(): ProductFlowState | null {
  try {
    const raw = sessionStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProductFlowState;
  } catch {
    return null;
  }
}

export function clearProductFlow() {
  sessionStorage.removeItem(FLOW_STORAGE_KEY);
}
