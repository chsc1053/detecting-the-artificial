# Response Collection

## Participant flow (implemented)

1. **Home (`/`)** — If exactly one active study, redirect to `/study/:studyId`. If several, list active studies. If none, empty state.
2. **Intro (`/study/:studyId`)** — Study name, description, counts of forced-choice vs single-item trials, anonymity disclaimer, **Start**.
3. **Trials** — One question at a time: forced-choice (Option A/B with any modality via `StimulusView`) or single-item; confidence 1–5; optional open-ended explanation; **Next**.
4. **Demographics** — Age, location, education, AI literacy. **Save and see results** is enabled only when **all** fields are filled; otherwise the participant must use **Skip demographics** (no partial saves). Security disclaimer always; if **demographics mandatory** (study flag), extra warning that skipping discards trial data for research. Optional studies: skip still keeps trial responses for research without demographic rows.
5. **Mandatory skip** — `DELETE /participant/participants/:id/session` removes responses + participant; results page shows informal feedback from client-side session data only (not stored).
6. **Results** — Correct label vs participant choice per trial, summary accuracy and average confidence (from server when session retained).

## Experimenter configuration

- **Overview** tab: **Require demographics for responses to count** maps to `studies.demographics_mandatory`.

## API

See [API endpoints](../api/endpoints.md) (`/participant/...`).

## Related

- [Database schema](../architecture/database.md)
- [Data export](data-export.md)
- [Stimulus delivery](stimulus-delivery.md)
