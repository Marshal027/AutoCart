export interface CartItemPayload {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PravaSessionRequest {
  items: CartItemPayload[];
  currency: string;
  amount: number;
  return_url: string;
  userId: string;
  userEmail: string;
}

export interface PravaSessionResponse {
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
    const backendMessage = typeof data.error === 'string' ? data.error : rawBody;
    throw new Error(
      backendMessage
        ? `Prava session failed (${response.status}): ${backendMessage}`
        : `Prava session failed (${response.status}).`,
    );
  }

  return data as PravaSessionResponse;
}