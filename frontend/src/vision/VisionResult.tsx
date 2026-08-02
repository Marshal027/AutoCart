import type { ProductIdentification } from './visionService';

interface VisionResultProps {
  /** Parsed product data from the AI vision service, or null if not yet available. */
  result: ProductIdentification | null;
  /** Whether the identification service call is in-flight. */
  isLoading: boolean;
  /** Any error thrown during identification, or null. */
  error: Error | null;
  /** Handler to reset state and allow a new scan. */
  onRetry: () => void;
}

/**
 * VisionResult displays the structured product information identified by the AI vision service.
 * Handles loading (holographic scanner animation), error, empty, and success states.
 */
export default function VisionResult({ result, isLoading, error, onRetry }: VisionResultProps) {
  if (isLoading) {
    return (
      <div className="vision-result loading-state">
        <div className="scanner-container">
          <div className="scan-line" />
          <div className="spinner-ring">
            <div className="spinner-segment" />
          </div>
          <h4>Analyzing Product...</h4>
          <p className="loading-subtext">Consulting AI to identify product matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vision-result error-state">
        <div className="error-badge">⚠️</div>
        <h3>Identification Failed</h3>
        <p className="error-message">
          {error.message || 'An error occurred while recognizing the product. Please try again.'}
        </p>
        <button type="button" className="action-btn retry-btn" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="vision-result empty-state">
        <div className="empty-graphic">🔍</div>
        <h3>No Scanned Item</h3>
        <p className="empty-message">
          Use the camera viewport above to capture a product image, or upload a file.
        </p>
      </div>
    );
  }

  const { itemName, brand, category, confidence, description } = result;

  // Safely convert the confidence string to a numeric percentage value.
  let confidenceVal = 0;
  if (confidence) {
    const rawVal = parseFloat(confidence);
    if (!isNaN(rawVal)) {
      confidenceVal = rawVal <= 1 ? rawVal * 100 : rawVal;
    } else if (confidence.includes('%')) {
      confidenceVal = parseFloat(confidence.replace('%', ''));
    }
  }

  const roundedConfidence: number | null = confidenceVal ? Math.round(confidenceVal) : null;
  const displayConfidence = roundedConfidence !== null ? `${roundedConfidence}%` : confidence || 'N/A';

  let confidenceClass = 'low-conf';
  if (roundedConfidence !== null) {
    if (roundedConfidence >= 80) confidenceClass = 'high-conf';
    else if (roundedConfidence >= 55) confidenceClass = 'med-conf';
  }

  return (
    <div className="vision-result success-state">
      <div className="result-header">
        <div className="tags-row">
          {category && <span className="category-tag">{category}</span>}
          {roundedConfidence !== null && (
            <span className={`confidence-tag ${confidenceClass}`}>
              {displayConfidence} Match
            </span>
          )}
        </div>
        <h2 className="product-title">{itemName || 'Identified Product'}</h2>
        {brand && <p className="product-brand">by {brand}</p>}
      </div>

      <div className="result-body">
        {roundedConfidence !== null && (
          <div className="confidence-meter-group">
            <div className="meter-header">
              <span>Match Confidence</span>
              <span className={confidenceClass}>{displayConfidence}</span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${confidenceClass}`}
                style={{ width: `${Math.min(100, Math.max(0, roundedConfidence))}%` }}
              />
            </div>
          </div>
        )}

        <div className="details-table">
          <div className="details-row">
            <span className="details-label">Product Name</span>
            <span className="details-value">{itemName || 'N/A'}</span>
          </div>
          <div className="details-row">
            <span className="details-label">Brand / Manufacturer</span>
            <span className="details-value">{brand || 'N/A'}</span>
          </div>
          <div className="details-row">
            <span className="details-label">Category Group</span>
            <span className="details-value">{category || 'N/A'}</span>
          </div>
        </div>

        {description && (
          <div className="description-container">
            <h4>AI Generated Summary</h4>
            <p className="description-text">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
