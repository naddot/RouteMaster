Fuel Finder Public API
Access the Fuel Finder API to retrieve real-time fuel prices and forecourt amenities data. This API provides comprehensive information about fuel prices and services across all registered filling stations to help you build applications and services for drivers to find fuel and amenities.

The API provides data that is updated within 30 minutes of any changes, as required by The Motor Fuel Price (Open Data) Regulations 2025.

Before you start
You'll need:

A Gov.UK One Login to access the API
Understanding of REST API principles
Technical capability to integrate with JSON APIs
Knowledge of your target geographic areas or specific forecourt requirements
The API follows REST principles: resources have stable URLs and map to standard HTTP methods. You can read data by issuing simple GET requests to the relevant resource URL.

This API covers filling stations in the United Kingdom.

What you get:
Current retail prices of all the petrol stations by fuel type
Forecourt details (address, operator, brand)
Site amenities and opening hours
Update timestamps for each price and site
API authentication
Access to API services requires authentication. The Fuel Finder API supports OAuth 2.0 (client credentials).

Developer guidelines
Read the developer guidelines for information about security, API rate limits, pagination and enumerated types as you build your application.

The Fuel Finder API is a REST API that gives a simple, consistent way to request, create and update data. REST stands for Representational State Transfer which is an architectural software style in which standard HTTP request methods are used to retrieve and modify representations of data. This is identical to the process of retrieving a web page or submitting a web form.

Representational State Transfer (REST) web services
In a RESTful API, each data resource has a unique URL and is manipulated using standard HTTP verbs such as:

GET to request a resource
POST to create a resource (not used for read-only endpoints)
PUT to change a resource (not used for read-only endpoints)
DELETE to remove a resource (not used for read-only endpoints)
Example: request a price resource
GET: https://api.fuelfinder.service.gov.uk/v1/prices/GB-12345 HTTP/1.1 
The request uses GET and does not include a request body.

In a RESTful API, a resource is modified by POSTing a revised resource representation, in this case JSON, to the same resource URL:

POST: https://api.fuelfinder.service.gov.uk/v1/<endpoint> 
Content-Type: text/json 
	{ 
		"CustomerName": "Joe Bloggs", 
		"Address": "", 
		"etc": etc 
	} 
REST builds on the features of HTTP. Because each resource has a globally unique URL and can be fetched with GET, REST APIs can benefit from existing network components such as caches and proxies.

The JSON data format
Responses use JSON (JavaScript Object Notation). JSON is a compact, widely used format for storing and exchanging data. Most programming languages support JSON, which makes it well suited to HTTP-based API services.

API specifications
The API specifications describe every Fuel Finder operation.

Information recipients: read trusted open data — current prices by fuel type, forecourt details, amenities, and time-stamped updates.
Motor fuel traders: submit fuel prices.

API authentication
Access to API services requires authentication. Fuel Finder uses OAuth 2.0 (client credentials) in both test and production environments.

OAuth 2.0 (client credentials)
Use OAuth 2.0 client credentials to obtain a shortlived access token. You’ll need a client and client secret for your application.

Token request (example)
POST: 
Content-Type: application/x-www-form-urlencoded 
grant_type: client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=fuelfinder.read 
Successful response (example)
{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "expires_in": 3600 } 
Call the API with your token
Include the token in the Authorization header on each request.

GET : /v1/prices?fuel_type=unleaded 
Authorization: Bearer ACCESS_TOKEN 
If the token is missing, expired or invalid, the API returns 401 Unauthorized.
Environments
Test – use test client credentials to integrate and trial your application.
Production – use production client credentials for live data.
Next steps
Learn how to create an application (Information Recipients) and get client credentials.

Read the developer guidelines for rate limits, security and pagination.