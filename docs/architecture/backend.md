# Backend Architecture

(To be filled as the Node.js/Express API is built.)

## Stack

- Node.js + Express.
- REST API; consistent response shape: `{ success, data, error }`.
- Environment-based config; secrets via `.env` (never committed).

## Planned Structure

- Routes: health, studies, stimuli, responses, admin/auth, export.
- Validation and sanitization on all inputs; parameterized DB queries; CORS and rate limiting as needed.
- S3 access via pre-signed URLs for secure media delivery.

## Related

- [Overview](overview.md)
- [API Endpoints](../api/endpoints.md)
- [Database](database.md)
