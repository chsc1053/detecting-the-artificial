# Data Export

## Implemented (lightweight)

- **Study workspace → Responses:** client-side **Download CSV** from the loaded response list (same fields as `GET /admin/studies/:studyId/responses` after filtering). Suitable for ad-hoc downloads; not a dedicated export job or server-side archive.

## Planned

- From the **admin panel**: server-side or hub export of anonymized response data (CSV/JSON) with optional date range, JSON export, and documented columns.
- Access control: export only for authenticated experimenter users; audit trail optional.

## Related

- [Response collection](response-collection.md)
- [Experiment config](experiment-config.md)
- [API endpoints](../api/endpoints.md)
