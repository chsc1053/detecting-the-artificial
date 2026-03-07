# Response Collection

(To be filled when the response API and participant flow are implemented.)

## Scope

- Ask for which is AI-generated: forced-choice = “Which one is AI-generated?”; single-item = “Is this AI-generated?”. Stored as `choice_label` (`human` or `ai`) per [database schema](../architecture/database.md).
- Capturing confidence rating (1–5) and optional open-ended explanation.
- Collecting demographics (age, location, education, AI literacy).
- Storing structured, research-grade data for analysis; linking responses to stimuli and studies.

## Related

- [API endpoints](../api/endpoints.md)
- [Database schema](../architecture/database.md)
- [Data export](data-export.md)
