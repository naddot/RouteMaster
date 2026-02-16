# RouteMaster Frontend

Modern React application for delivery management and telemetry tracking.

## 🛠️ Tech Stack
- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS v4
- **Maps**: Google Maps JavaScript API (Advanced Markers)
- **State Management**: React Hooks (Custom hooks for Geolocation, Journey, and Queueing)

## 🔑 Environment Variables (`.env.local`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `VITE_BFF_URL` | Yes | URL to the BFF gateway (e.g. `http://localhost:8080`) |
| `VITE_GOOGLE_MAP_ID` | Yes | Map ID required for Advanced Markers |
| `VITE_GOOGLE_PLACES_ENABLED` | No | Set to `true` to enable Places library |

## 📦 Features
- **Offline Sync**: Automatic queuing and background syncing of telemetry when connection is restored.
- **Advanced Mapping**: Dynamic route calculation with real-time traffic and custom marker pins.
- **AI Assist**: Manifest parsing and fuel station finder powered by Gemini.

## 🚀 Development
```bash
npm install
npm run dev
```
