# Database Schema

(To be filled as PostgreSQL schema and migrations are added.)

## Conventions

- Tables and columns: `snake_case`.
- All tables: `created_at`, `updated_at` timestamps.
- Use parameterized queries / query builder or ORM; indexes on frequently queried columns; foreign keys for referential integrity.

## Planned Entities

- Studies, stimuli (with modality and provenance), tasks (forced-choice vs single-item), responses (choice, confidence, explanation), participants/demographics, experimenter users (if needed).

## Related

- [Overview](overview.md)
- [Backend](backend.md)
- [Response collection](../features/response-collection.md)
