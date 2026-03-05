# Architecture Overview

Detecting the Artificial is a cloud-native web platform for conducting multimodal human–AI detection studies. Researchers use it to evaluate how well humans can distinguish AI-generated content from human-created content across text, image, video, and audio.

## High-Level Architecture

- **Frontend**: React (Vite) — participant and experimenter interfaces.
- **Backend**: Node.js + Express (REST API) — business logic, auth, and data access.
- **Database**: PostgreSQL on AWS RDS — studies, stimuli, responses, and metadata.
- **Media storage**: AWS S3 — text, image, video, and audio stimuli and related assets.
- **Deployment**: AWS Elastic Beanstalk with Docker; CI/CD via GitHub Actions.

Traffic flows: participants and experimenters use the web app; the app calls the REST API; the API reads/writes PostgreSQL and uses S3 for media (e.g. via pre-signed URLs).

## Documentation Map

- [Frontend](frontend.md) — React app structure and state management.
- [Backend](backend.md) — API structure and routes.
- [Database](database.md) — Schema and relationships.
