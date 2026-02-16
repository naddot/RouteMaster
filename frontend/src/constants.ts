export const LOGO_PATH = './blackcircles-logo.svg';

export const INITIAL_MAP_CENTER = {
  lat: 51.5074, // London
  lng: -0.1278
};

export const DEFAULT_ZOOM = 12;

export const MAP_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export const MOCK_TRAFFIC_LAYER = true; // Suggests we want traffic enabled by default

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';