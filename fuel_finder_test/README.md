
# Fuel Finder API Test

> [!WARNING]
> **WORK IN PROGRESS - NOT READY FOR PRODUCTION**

This directory contains experimental scripts and documentation for integrating with the UK Fuel Finder Developer Portal.

## Current Status
- **Authentication**: Implemented via `auth_test.js` but currently failing due to connectivity/endpoint issues (`ENOTFOUND` or `404`).
- **Endpoints**: The documented endpoint `api.fuelfinder.service.gov.uk` is not reachable from this environment. `www.fuel-finder.service.gov.uk` is reachable but API paths are unconfirmed.

## Usage
1. Create a `.env` file in this directory with:
   ```
   CLIENT_ID=your_id
   CLIENT_SECRET=your_secret
   ```
2. Run the diagnostic script:
   ```bash
   node --env-file=.env auth_test.js
   ```

## Files
- `auth_test.js`: Main script to test authentication and basic data fetching.
- `dns_probe_v2.js`: Utility to check DNS resolution for API domains.
- `brute_paths.js`: Utility to check for common API paths on the reachable domain.
- `Developer Guidelines.md`: Official guidelines (local copy).
- `Fuel Finder REST API.md`: API documentation (local copy).
