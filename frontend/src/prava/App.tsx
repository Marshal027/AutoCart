import { useMemo, useState } from 'react';
import { createPravaSession, type CartItemPayload } from './api';
import VisionSearch from '@vision';
import type { ProductIdentification } from '@vision';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface CartItem extends Product {
  quantity: number;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'notebook',
    name: 'Field Notebook',
    price: 18,
    description: 'A plain notebook for notes, prompts, and checkout tests.',
  },
  {
    id: 'mug',
    name: 'Focus Mug',
    price: 14,
    description: 'Ceramic mug with enough room for coffee and debugging.',
  },
  {
    id: 'lamp',
    name: 'Desk Lamp',
    price: 42,
    description: 'A warm desk lamp for a clean checkout demo page.',
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getGuestId(): string {
  const storageKey = 'prava-sandbox-user-id';
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const generated = `guest_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

export default function App() {
  const [productsList, setProductsList] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([{ ...INITIAL_PRODUCTS[0], quantity: 1 }]);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart],
  );

  const handleAdd = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  };
  const handleProductFound = (productData: ProductIdentification) => {
    if (!productData || !productData.itemName) return;

    // Set a realistic sandbox price for checkout (or default to $20)
    let parsedPrice = 20.00;
    if (productData.confidence) {
      const confidenceNum = parseFloat(productData.confidence);
      if (!isNaN(confidenceNum)) {
        // Just a fun way to vary prices based on AI characteristics
        parsedPrice = confidenceNum > 0.85 ? 24.99 : 18.50;
      }
    }

    const newProduct: Product = {
      id: `scanned_${Date.now()}`,
      name: productData.itemName,
      price: parsedPrice,
      description: productData.description || `AI Identified product in category: ${productData.category || 'General'}.`
    };

    // Add to store products if not already there
    setProductsList((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === newProduct.name.toLowerCase())) {
        return prev;
      }
      return [newProduct, ...prev];
    });

    // Add item to cart automatically
    handleAdd(newProduct);
    setStatus(`Successfully scanned and added "${newProduct.name}" to cart!`);
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setStatus('Starting a Prava sandbox session...');

    try {
      const session = await createPravaSession({
        items: cart.map(({ id, name, price, quantity }): CartItemPayload => ({
          id,
          name,
          price,
          quantity,
        })),
        currency: 'USD',
        amount: subtotal,
        return_url: window.location.origin,
        userId: getGuestId(),
        userEmail: 'sandbox@example.com',
      });

      const iframeUrl = session.iframe_url || session.data?.iframe_url || session.url;

      if (iframeUrl) {
        window.open(iframeUrl, '_blank', 'noopener,noreferrer');
        setStatus('Prava checkout opened in a new tab. Complete the sandbox payment there.');
      } else {
        setStatus('Session created, but no iframe URL was returned by the backend.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed.';
      setStatus(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Prava sandbox storefront</div>
        <h1>Buy a few dummy items and launch the payment flow.</h1>
        <p>
          This page is intentionally simple. It gives you a clean checkout surface for
          testing Prava with a React frontend and a Django backend.
        </p>
      </section>

      <section className="layout-grid">
        <div className="products-panel">
          <div className="panel-title">Visual Search Scan</div>
          <div style={{ margin: '16px 0 32px 0' }}>
            <VisionSearch onProductFound={handleProductFound} />
          </div>

          <div className="panel-title" style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>Items for testing</div>
          <div className="product-list">
            {productsList.map((product) => (
              <article className="product-card" key={product.id}>
                <div>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                </div>
                <div className="product-footer">
                  <span>{formatCurrency(product.price)}</span>
                  <button type="button" onClick={() => handleAdd(product)}>
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="checkout-panel">
          <div className="panel-title">Cart</div>
          <div className="cart-list">
            {cart.map((item) => (
              <div className="cart-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatCurrency(item.price)}
                  </span>
                </div>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          <button
            type="button"
            className="checkout-button"
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? 'Creating session...' : 'Pay with Prava Sandbox'}
          </button>

          <p className="status-text">
            {status || 'Add items, then click checkout to create a sandbox session.'}
          </p>
        </aside>
      </section>
    </main>
  );
}