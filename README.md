# Routemaster

Routemaster is a modern delivery management application built with a **3-tier architecture** to ensure security, scalability, and developer experience.

## 🏗️ Architecture

The project is divided into three distinct layers:


### Architecture Diagram
```
Dev:  Browser -> Vite (Proxy) -> BFF -> Backend
Prod: Browser -> BFF (Static+API) -> Backend
```

1.  **Frontend (`/frontend`)**
    *   **Stack**: React, Vite, Tailwind CSS.
    *   **Role**: Pure UI. **No API keys** are stored or used here.
    *   **Communication**: calls `/api/*` endpoint paths. In development Vite proxies these to the BFF. In production the BFF serves both static files and API routes. The frontend never references backend URLs directly.

2.  **BFF (Backend-for-Frontend) (`/bff`)**
    *   **Stack**: Node.js, Express.
    *   **Role**: Secure Gateway.
    *   **Responsibilities**:
        *   Forwards `/api/ingest` to the Backend root (`/`) and injects `x-api-key`.
        *   Forwards `/api/gemini/*` to backend (`/gemini/*`) and injects `x-api-key`.
        *   Forwards backend status codes and response bodies transparently.
        *   Serves the static frontend in production.

3.  **Backend (`/backend`)**
    *   **Stack**: Google Cloud Functions (Node.js 22).
    *   **Role**: Business Logic & Ingestion.
    *   **Responsibilities**:
        *   Streams telemetry to BigQuery (optimized with Schema Caching).
        *   **Dead Letter Queue**: Local persistence for failed ingestion rows.
        *   **AI Integration**: Powered by Gemini 2.5 Flash.
        *   **Exposes**:
            *   `/` → Data ingestion (Jobs, Shifts, GPS, Intended Routes).
            *   `/gemini/parse` → Intelligent manifest parser.
            *   `/gemini/fuel` → Location-aware fuel station finder.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   `gcloud` CLI (authenticated with `gcloud auth login`)

### Installation
Run the root installer to set up all workspaces:
```bash
npm run install:all
```

### Configuration
1.  **Frontend**: `frontend/.env.local`
    ```env
    VITE_BFF_URL=http://localhost:8080
    ```
2.  **BFF**: `bff/.env`
    ```env
    # Optional: For local dev override.
    # If missing, it fetches ROUTEMASTER_INGEST_API_KEY from Google Secret Manager.
    INGEST_API_KEY=...
    BACKEND_URL=http://localhost:8081 
    ```
3.  **Backend**: `backend/.env`
    ```env
    # Optional: For local dev override.
    # If missing, it fetches ROUTEMASTER_GEMINI_API_KEY from Google Secret Manager.
    GEMINI_API_KEY=...
    ```

### Running Locally
To start all services (Frontend, BFF, Backend) concurrently:
```bash
npm run dev
```
*   **Frontend**: [http://localhost:5173](http://localhost:5173)
*   **BFF**: [http://localhost:8080](http://localhost:8080)
*   **Backend**: [http://localhost:8081](http://localhost:8081)

## 🔐 Secret Management
We use **Google Secret Manager** for production secrets.
*   `ROUTEMASTER_INGEST_API_KEY`: Used by BFF to talk to Backend.
*   `ROUTEMASTER_GEMINI_API_KEY`: Used by Backend to talk to Google AI.

The services use a **Hybrid Strategy**:
1.  Check `process.env` (Fast for local dev).
2.  Fallback to fetching from Secret Manager (Secure for prod).

> **Note**: In production, the service account running the service must have the `Secret Manager Secret Accessor` IAM role.

## 📦 Deployment
1.  **Build Frontend**: `npm run build`
2.  **Deploy Backend**: `gcloud functions deploy ...`
3.  **Deploy BFF**: `gcloud run deploy ...`

> **Important**: Ensure Backend ingress is restricted appropriately (internal only if possible) and BFF is configured with the correct `BACKEND_URL`.
