# Stimulus Delivery

(To be filled when media storage and delivery are implemented.)

## Scope

- Storing stimuli in AWS S3; metadata and provenance in PostgreSQL.
- Serving media to participants via pre-signed URLs or safe proxy to avoid exposing credentials.
- Rendering text, image, video, and audio in the participant UI according to task type (forced-choice or single-item).

## Related

- [Experiment config](experiment-config.md)
- [Response collection](response-collection.md)
- [Backend architecture](../architecture/backend.md)
