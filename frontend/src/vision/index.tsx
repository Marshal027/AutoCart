import { useState } from 'react';
import VisionCapture from './VisionCapture';
import VisionResult from './VisionResult';
import { identifyProduct } from './visionService';
import type { ProductIdentification } from './visionService';
import './Vision.css';

interface VisionSearchProps {
  /**
   * Callback fired when a product is successfully identified.
   * Receives the structured product data and the original base64 image string.
   */
  onProductFound?: (product: ProductIdentification, base64Image: string) => void;
  /** Optional extra CSS class name for the root container. */
  className?: string;
}

/**
 * VisionSearch is the top-level orchestrator component.
 * Combine with a single import: `import VisionSearch from './Vision';`
 *
  * It coordinates camera capture, the AI identification service, and
 * the result display — managing all shared state in one place.
 */
export default function VisionSearch({ onProductFound, className = '' }: VisionSearchProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ProductIdentification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const handleCapture = async (base64Image: string): Promise<void> => {
    setCapturedImage(base64Image);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await identifyProduct(base64Image);
      if (onProductFound) {
        onProductFound(data, base64Image);
        return;
      }
      setResult(data);
    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to identify product:', caughtError);
      setError(caughtError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (): void => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className={`vision-search-container ${className}`.trim()}>
      <div className="vision-search-content" style={{ height: '100%' }}>
        {!capturedImage && !isLoading && !error ? (
          <VisionCapture onCapture={handleCapture} onError={setError} />
        ) : (
          <div className="vision-result-wrapper">
            {capturedImage && (
              <div className="captured-preview-container">
                <img src={capturedImage} alt="Captured scan" className="captured-preview" />
                {!isLoading && !error && (
                  <button type="button" className="retake-btn" onClick={handleRetry}>
                    ⚡ New Scan
                  </button>
                )}
              </div>
            )}
            <VisionResult
              result={result}
              isLoading={isLoading}
              error={error}
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export type { VisionSearchProps, ProductIdentification };
export { VisionCapture, VisionResult, identifyProduct };
