# Stimulus Delivery

## Current behavior

- **Text:** Inline `text_content` from the API; rendered in `StimulusView`.
- **Image / video / audio:** If `storage_key` is an absolute **`http:` or `https:`** URL, the participant UI embeds it (`<img>`, `<video>`, `<audio>`). Otherwise the UI shows a short placeholder until storage integration supplies a reachable URL.

## Scope (remaining)

- Storing uploaded blobs in **AWS S3**; metadata and provenance in PostgreSQL (already modeled).
- Serving media via **pre-signed URLs** or a safe proxy instead of relying on public URLs in `storage_key`.
- Rendering text, image, video, and audio in the participant UI according to task type (forced-choice or single-item) — layout implemented; delivery for non-URL keys is not.

## Related

- [Experiment config](experiment-config.md)
- [Response collection](response-collection.md)
- [Backend architecture](../architecture/backend.md)
