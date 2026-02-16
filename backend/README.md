# Routemaster Ingestion Service

This directory contains the backend Cloud Function / Cloud Run service for Routemaster. It operates as a telemetry ingestor, receiving JSON data from the frontend application and streaming it into **Google BigQuery**.

## 🏗️ Architecture

-   **Runtime**: Node.js 22
-   **Framework**: Google Cloud Functions Framework
-   **Destination**: Google BigQuery
-   **Trigger**: HTTP POST

## 🔑 Configuration

The service requires the following environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | `bqsqltesting` |
| `INGEST_API_KEY` | Secret key for `x-api-key` auth | *Required* |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | *All* |

## 📦 Data Schema

The service accepts a JSON payload with the following arrays. Data is mapped to specific BigQuery tables:

-   `intended_route` -> `Intended_route_table`
-   `jobs` -> `Jobs`
-   `shifts` -> `Shifts`
-   `gps_logs` -> `gps_logs`

### 🛡️ Robust Ingestion Features
- **Schema Caching (TTL)**: Automatically fetches and caches BigQuery table structures to avoid redundant API calls.
- **Durable Validation**: Validates types (TIMESTAMP, NUMERIC, etc.) before ingestion.
- **Dead Letter Queue (`dead_letter.jsonl`)**: Persistent local storage for rows that fail validation or ingestion, allowing for manual recovery.
- **Field Normalization**: Auto-handles field aliasing (e.g., `timestamp` vs `timestampt`) and unit conversion.

## 🤖 AI Features
- **Manifest Parser**: Intelligent parsing of unstructured delivery manifests into structured JSON.
- **Smart Fuel Finder**: Location-aware search for Allstar-accepted fuel stations with postcode validation.

## 🚀 Deployment

To deploy to Google Cloud Run:

```bash
gcloud run deploy routemaster-ingest \
  --source . \
  --function mobileFittersIngest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars INGEST_API_KEY=your_secret_key
```
