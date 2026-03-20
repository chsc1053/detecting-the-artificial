# Database Schema

Relational schema in PostgreSQL to support multimodal human–AI detection studies, with structured, research-grade data.

## Conventions

- Tables and columns: `snake_case`.
- All core tables: `id` (UUID primary key), `created_at`, `updated_at` timestamps.
- Use parameterized queries / query builder or ORM; indexes on frequently queried columns; foreign keys for referential integrity.

## Schema Management and Creation

- Migration tool: `node-pg-migrate` (configured in `backend/package.json`).
- Migration files live in `backend/migrations/`.
- Initial schema migration: `backend/migrations/1774035560378_init-schema.js`.
- Local database connection comes from `DATABASE_URL` in `backend/.env`.
- Apply schema changes with:
  - `npm run migrate:up` (apply pending migrations)
  - `npm run migrate:down` (roll back latest migration)
  - `npm run migrate:create -- migration_name` (create a new migration file)
- Applied migrations are tracked in PostgreSQL table `pgmigrations`.

## Core Tables

### `studies`

Represents a single study: a container that the experimenter fills with trials. A study can contain any mix of forced-choice and single-item trials (the experimenter chooses trial type when adding each trial).

- `id` (PK, UUID)
- `name` (text, required)
- `description` (text)
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamps)

### `stimuli`

Stores individual stimuli that can be reused across studies.

- `id` (PK, UUID)
- `modality` (enum/text: `text`, `image`, `video`, `audio`)
- `source_type` (enum/text: `human`, `ai`)
- `storage_key` (text; S3 key or reference; for pure text you can also store inline)
- `text_content` (text, nullable; used for text stimuli)
- `model_name` (text, nullable; full technical model name, e.g. `gpt-4o`, `midjourney-v5`)
- `generation_prompt` (text, nullable; optional prompt used to create AI content)
- `notes` (text, nullable)
- `created_at`, `updated_at`

### `study_trials`

Defines the units of work (trials) within a study. The experimenter adds trials one by one, choosing each trial’s type (forced-choice or single-item); a study can contain only forced-choice, only single-item, or a mix.

- `id` (PK, UUID)
- `study_id` (FK → `studies.id`, on delete cascade)
- `trial_index` (integer; order within the study)
- `task_type` (enum/text: `forced_choice` or `single_item`)
- `human_stimulus_id` (FK → `stimuli.id`, nullable; required for forced-choice)
- `ai_stimulus_id` (FK → `stimuli.id`, nullable; required for forced-choice)
- `single_stimulus_id` (FK → `stimuli.id`, nullable; used for single-item trials)
- `created_at`, `updated_at`

Notes:

- For forced-choice trials, `human_stimulus_id` and `ai_stimulus_id` are set; `single_stimulus_id` is null.
- For single-item trials, `single_stimulus_id` is set; `human_stimulus_id` / `ai_stimulus_id` are null.

### `participants`

Represents an anonymized participant taking one or more studies.

- `id` (PK, UUID)
- `study_id` (FK → `studies.id`) — if participants are scoped per study
- `age` (integer, nullable)
- `approx_location` (text, nullable; e.g. country or region)
- `education_level` (text/enum, nullable; e.g. `high_school`, `bachelor`, `master`, `phd`, `other`)
- `ai_literacy` (text/enum, nullable; e.g. `low`, `medium`, `high`)
- `created_at`, `updated_at`

### `responses`

Stores the core data for analysis: participant answers, confidence, and explanations.

- `id` (PK, UUID)
- `study_id` (FK → `studies.id`)
- `trial_id` (FK → `study_trials.id`)
- `participant_id` (FK → `participants.id`)
- `choice_label` (text/enum: `human` or `ai`)
  - **Forced-choice:** which of the two stimuli they picked as AI-generated (`human` = they picked the human-made one, `ai` = they picked the AI-made one). Correct when they pick the AI one → `is_correct = (choice_label === 'ai')`.
  - **Single-item:** their classification of the single stimulus (`ai` = they said it’s AI-generated, `human` = they said it’s human-made). `is_correct` from the stimulus’s `source_type`.
- `confidence` (integer; e.g. 1–5 scale)
- `explanation` (text, nullable; free-form justification)
- `is_correct` (boolean, nullable) — derived from trial/stimuli and choice_label; stored for convenience
- `created_at`, `updated_at`

Indexes to consider:

- On (`study_id`, `participant_id`) for per-study analyses.
- On (`study_id`, `trial_id`) for per-trial accuracy/confidence.

### `experimenters`

Users who access the **admin panel**. The final product is deployed by a researcher/experimenter who uses this single, auth-protected interface to create studies, add trials (forced-choice, single-item, or a mix), group trials into studies, run studies, and view automated analytics. No separate “admin” vs “experimenter” role; one panel for study/trial management and analytics.

- `id` (PK, UUID)
- `email` (text, unique)
- `password_hash` (text; hashed with bcrypt)
- `created_at`, `updated_at`

## How this supports analyses

- **Accuracy vs. confidence:** `responses.is_correct` and `responses.confidence` per `study_id` / `trial_id`.
- **Demographics:** join `responses` → `participants` to relate accuracy/confidence/explanations to age, location, education, AI literacy.
- **Modality / provenance:** join `study_trials` → `stimuli` to analyze performance by modality, `source_type` (human vs AI), and `model_name`.

## Related

- [Overview](overview.md)
- [Backend](backend.md)
- [Response collection](../features/response-collection.md)
