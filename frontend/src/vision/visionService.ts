

export interface ProductIdentification {
  itemName: string;
  brand: string;
  category: string;
  confidence: string;
  description: string;
}

/**
 * Identifies a product in the given base64 image by communicating with the backend.
 *
 * @param base64Image - The base64-encoded image string, optionally prefixed as a data URL.
 * @returns A promise resolving to a structured {@link ProductIdentification} object.
 */
export async function identifyProduct(base64Image: string): Promise<ProductIdentification> {
  if (!base64Image) {
    throw new Error('No image data provided for identification.');
  }

  const response = await fetch('/api/shop/vision/identify/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Image }),
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        if (typeof errorJson.error === 'string') {
          errorMsg = errorJson.error;
        } else if (errorJson.error.message) {
          errorMsg = errorJson.error.message;
        } else {
          errorMsg = JSON.stringify(errorJson.error);
        }
      } else if (errorJson.message) {
        errorMsg = errorJson.message;
      } else {
        errorMsg = JSON.stringify(errorJson);
      }
    } catch {
      // Ignore
    }
    throw new Error(`Failed to identify product: ${errorMsg}`);
  }

  const responseJson = await response.json();
  const textResult: string | undefined = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResult) {
    throw new Error('Backend API returned an empty response.');
  }

  // Safely parse the JSON structure
  const parsedData: Partial<ProductIdentification> = JSON.parse(textResult.trim());

  // Ensure every required key exists, defaulting to empty string
  const requiredKeys: (keyof ProductIdentification)[] = [
    'itemName',
    'brand',
    'category',
    'confidence',
    'description',
  ];
  for (const key of requiredKeys) {
    if (parsedData[key] === undefined) {
      parsedData[key] = '';
    }
  }

  return parsedData as ProductIdentification;
}
