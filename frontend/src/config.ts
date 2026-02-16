export interface RuntimeConfig {
  VITE_BFF_URL?: string;
  FEATURES?: Record<string, boolean>;
  googleMapsApiKey?: string;
}

declare global {
  interface Window {
    __RMA_CONFIG__?: {
      INGEST_URL: string;
      INGEST_API_KEY: string;
      GEMINI_API_KEY: string;
    };
  }
}

window.__RMA_CONFIG__ = {
  INGEST_URL: import.meta.env.VITE_BFF_URL ?? "",
  INGEST_API_KEY: import.meta.env.VITE_INGEST_API_KEY ?? "",
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ?? "",
};

let cachedConfig: RuntimeConfig | null = null;

export const loadRuntimeConfig = async (retries = 3, delay = 1000): Promise<RuntimeConfig> => {
  if (cachedConfig && Object.keys(cachedConfig).length > 0) return cachedConfig;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        cachedConfig = await response.json();
        return cachedConfig!;
      }
      console.warn(`Config fetch failed (attempt ${i + 1}/${retries}): ${response.status}`);
    } catch (e) {
      console.warn(`Config fetch error (attempt ${i + 1}/${retries})`, e);
    }

    if (i < retries - 1) {
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }

  console.error("Max retries reached for config. Using defaults.");
  cachedConfig = {};
  return cachedConfig;
};

export const getRuntimeConfigSync = (): RuntimeConfig | null => cachedConfig;

/**
 * Normalizes UK postcodes by uppercasing and ensuring a space before the last 3 characters.
 * Only applies to strings that match a approximate UK postcode pattern.
 */
export const normalizePostcode = (postcode: string): string => {
  if (!postcode || typeof postcode !== 'string') return postcode;

  const trimmed = postcode.trim();
  const cleaned = trimmed.replace(/\s+/g, '').toUpperCase();

  // Stricter UK postcode regex: 1-2 letters, 1-2 numbers/alphanum, space, 1 number, 2 letters
  // Approximate validation for: (A-Z{1,2}[0-9][0-9A-Z]? ?[0-9][A-Z]{2})
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/;

  if (ukPostcodeRegex.test(cleaned)) {
    // Insert space before last 3 characters
    return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
  }

  return trimmed;
};
