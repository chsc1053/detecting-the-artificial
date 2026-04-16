# Detecting the Artificial

Web platform for running human-vs-AI detection studies across text, image, video, and audio.

Researchers can configure studies in an admin panel, collect participant responses, analyze results, and export data without building custom tooling for each experiment.

## What the Project Includes

- **Participant app** for study flow and response collection
- **Admin panel** for study configuration, trial management, stimuli upload, and analytics
- **PostgreSQL-backed API** for studies, participants, responses, and admin/auth routes
- **S3 media upload flow** (presigned PUT URLs) for image/video/audio stimuli
- **One-time first-account bootstrap** on `/admin/login` when no experimenter exists

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (`node-pg-migrate`)
- **Charts/analytics UI:** Recharts
- **Deployment:** Docker images on AWS Elastic Beanstalk (separate API and web environments)

## Deployment Summary

This repository is deployed on AWS with:

- **Two Elastic Beanstalk Docker environments**
  - **API environment** (`backend/Dockerfile`)
  - **Web environment** (`web/Dockerfile`, nginx serving built frontend and proxying `/api/`* to API)
- **Amazon RDS PostgreSQL** in the same VPC
- **Amazon ECR** for container images
- **Amazon S3** for stimuli media storage
- **GitHub Actions + OIDC** for CI/CD deploys on push to `main`

Details:

- Deployment architecture: `docs/deployment/aws-deployment.md`
- CI/CD configuration and OIDC trust policy: `docs/deployment/cicd.md`
- Local development setup: `docs/deployment/local-setup.md`
- Migration workflow: `docs/deployment/database-migrations.md`
- API endpoints: `docs/api/endpoints.md`

## Quick Start (Local)

1. Start PostgreSQL and set `DATABASE_URL` in `backend/.env`
2. Run backend migrations: `cd backend && npm ci && npm run migrate:up`
3. Start backend: `npm run dev`
4. Start frontend: `cd ../frontend && npm ci && npm run dev`
5. Open `http://localhost:5173/admin/login`
  - If no experimenter exists, complete one-time setup form

## License

MIT License - see [LICENSE](LICENSE).