export interface CartItemPayload {
  id: string;
  name: string;
  price: number;
  quantity: number;
  source?: string;
  mcp_server?: string;
  merchant_url?: string;
}

export interface PravaSessionRequest {
  items: CartItemPayload[];
  currency: string;
  amount: number;
  callback_url?: string;
  userId: string;
  userEmail: string;
}

export interface PravaSessionResponse {
  session_id?: string;
  session_token?: string;
  order_id?: string;
  expires_at?: string;
  iframe_url?: string;
  url?: string;
  data?: {
    iframe_url?: string;
  };
  [key: string]: unknown;
}

export async function createPravaSession(
  payload: PravaSessionRequest,
): Promise<PravaSessionResponse> {
  let response: Response;

  try {
    response = await fetch('/api/prava/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error while creating Prava session.';
    throw new Error(`Could not reach the backend: ${message}`);
  }

  const rawBody = await response.text();
  let data: Partial<{ error: string }> & Record<string, unknown> = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as Partial<{ error: string }> & Record<string, unknown>;
    } catch {
      data = { error: rawBody };
    }
  }

  if (!response.ok) {
    const backendMessage = typeof data.error === 'string'
      ? data.error
      : typeof data.error?.message === 'string'
        ? data.error.message
        : rawBody;
    throw new Error(
      backendMessage
        ? `Prava session failed (${response.status}): ${backendMessage}`
        : `Prava session failed (${response.status}).`,
    );
  }

  return data as PravaSessionResponse;
}

export interface PravaSessionGroup extends PravaSessionResponse {
  merchant_key: string;
  merchant_name: string;
  amount: string;
}

export interface PravaSessionsResponse {
  session_count: number;
  sessions: PravaSessionGroup[];
}

export async function createPravaSessions(
  payload: PravaSessionRequest,
): Promise<PravaSessionsResponse> {
  const response = await fetch('/api/prava/sessions/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === 'string'
      ? data.error
      : typeof data.error?.message === 'string'
        ? data.error.message
        : 'Could not create Prava merchant sessions.';
    throw new Error(`Prava checkout failed (${response.status}): ${message}`);
  }
  return data as PravaSessionsResponse;
}

export async function pollPravaPaymentResult(sessionId: string): Promise<Record<string, any>> {
  const response = await fetch(`/api/prava/sessions/${encodeURIComponent(sessionId)}/payment-result/?_t=${Date.now()}`, {
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not read Prava payment status.');
  }
  return data;
}

export async function reportPravaPaymentStatus(
  sessionId: string,
  payload: { txn_ref_id: string; txn_status: 'APPROVED' | 'DECLINED'; authorization_code?: string; response_code?: string },
): Promise<Record<string, any>> {
  const response = await fetch(`/api/prava/sessions/${encodeURIComponent(sessionId)}/report-status/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : data.error?.message || 'Could not report Prava payment status.';
    throw new Error(message);
  }
  return data;
}