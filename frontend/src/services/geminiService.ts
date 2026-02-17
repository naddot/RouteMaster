import { DeliveryStop, FuelStation } from "../types";

export const parseAddressInput = async (input: string): Promise<DeliveryStop[]> => {
  try {
    const response = await fetch('/api/gemini/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: input })
    });

    if (!response.ok) throw new Error('Failed to parse manifest');

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("Gemini Parse returned non-array:", data);
      throw new Error("Invalid response format from AI service");
    }

    return data;
  } catch (err) {
    console.error("Gemini Parse Error:", err);
    throw err;
  }
};

export const findFuelStations = async (lat: number, lng: number): Promise<FuelStation[]> => {
  try {
    const response = await fetch('/api/gemini/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });

    if (!response.ok) throw new Error('Failed to find fuel stations');

    return await response.json();
  } catch (err) {
    console.error("Gemini Fuel Error:", err);
    return [];
  }
};
