export interface RuntimeConfig {
  VITE_BFF_URL?: string;
  FEATURES?: Record<string, boolean>;
  // No secrets here!
}

let cachedConfig: RuntimeConfig | null = null;

export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  if (cachedConfig) return cachedConfig;

  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      cachedConfig = await response.json();
    } else {
      console.warn("Using default config (BFF unreachable?)");
      cachedConfig = {};
    }
  } catch (e) {
    console.warn("Config fetch failed", e);
    cachedConfig = {};
  }

  return cachedConfig;
};

export const getRuntimeConfigSync = (): RuntimeConfig | null => cachedConfig;
