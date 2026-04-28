# Detecting the Artificial

Detecting the Artificial is a full-stack research platform for running studies that measure how well people can distinguish human-created vs AI-generated content across text, image, audio, and video.

It includes a participant-facing study experience, an admin/researcher dashboard, analytics views, and a deployable AWS stack for end-to-end operation.

## Why this project

As generative models improve, human detection performance, confidence calibration, and demographic effects become important research questions. This project provides reusable infrastructure so those experiments can be configured and executed without rebuilding tooling each time.

## What it does

- Create and manage studies/trials in an authenticated admin panel
- Upload and manage multimodal stimuli (text/image/audio/video)
- Run participant sessions and collect responses + confidence + demographics
- Export and inspect results in analytics/admin views
- Enforce data-integrity rules for cleaner analysis
- Support one-time first-admin account setup on `/admin/login`

## What I achieved

- Built and connected a complete frontend + backend study platform
- Implemented admin workflows for study/trial/stimuli/response management
- Added analytics integrity safeguards and response cleanup controls
- Set up cloud deployment with Docker + AWS Elastic Beanstalk (API + web)
- Integrated S3 media uploads and RDS-backed persistence
- Added GitHub Actions deployment pipeline with AWS OIDC
- Documented local setup, deployment, CI/CD, and migration operations

## Architecture at a glance

- **Frontend:** React + Vite (`frontend/`)
- **Backend API:** Node.js + Express (`backend/`)
- **Database:** PostgreSQL + `node-pg-migrate`
- **Storage:** Amazon S3 (stimuli media upload + public media URLs)
- **Deployment:** Docker images on AWS Elastic Beanstalk
  - API environment: `backend/Dockerfile`
  - Web environment: `web/Dockerfile` (nginx serving frontend + proxying `/api/`*)
- **CI/CD:** GitHub Actions + AWS OIDC + ECR + EB application version updates

## Demo

- **Live demo URL:** [http://dta-web-prod.eba-nspqwara.us-east-2.elasticbeanstalk.com](http://dta-web-prod.eba-nspqwara.us-east-2.elasticbeanstalk.com) `DECOMMISSIONED`

## Screenshots

### 1) Admin dashboard

![Admin Dashboard](./docs/assets/screenshots/admin-dashboard.png)

### 2) Stimuli upload + library

![Stimuli Upload](./docs/assets/screenshots/stimuli-upload.png)
![Stimuli Creation](./docs/assets/screenshots/stimuli-creation.png)

### 3) Study workspace (overview/trials/responses)

![Study Workspace - Overview](./docs/assets/screenshots/study-workspace-overview.png)
![Study Workspace - Trials](./docs/assets/screenshots/study-workspace-trials.png)
![Study Workspace - Responses](./docs/assets/screenshots/study-workspace-responses.png)

### 4) Participant study flow

![Participant Flow - Study Home](./docs/assets/screenshots/participant-flow-study-home.png)
![Participant Flow - Video Trial (Single Item)](./docs/assets/screenshots/participant-flow-single-item-video-trial.png)
![Participant Flow - Image Trial (Forced Choice)](./docs/assets/screenshots/participant-flow-forced-choice-image-trial.png)
![Participant Flow - Demographics Mandatory](./docs/assets/screenshots/participant-flow-demographics-mandatory.png)
![Participant Flow - Demographics Optional](./docs/assets/screenshots/participant-flow-demographics-optional.png)
![Participant Flow - Results](./docs/assets/screenshots/participant-flow-results.png)

### 5) Analytics view

![Analytics - Demographics](./docs/assets/screenshots/analytics-demographics.png)
![Analytics - Performance Tab - PDF Export](./docs/assets/screenshots/analytics-performance-export.png)

### 6) Cloud deployment evidence (AWS + CI/CD)

![AWS S3 - Stimuli Media](./docs/assets/screenshots/aws-s3-media-bucket.png)
![AWS RDS - PostgreSQL DB](./docs/assets/screenshots/aws-rds-db.png)
![AWS EB - Web Environment](./docs/assets/screenshots/aws-eb-environment.png)
![GitHub Actions - Deployment Summary](./docs/assets/screenshots/github-actions-deployment.png)

## Local quick start

```bash
# 1) Backend
cd backend
npm ci
# configure backend/.env with DATABASE_URL
npm run migrate:up
npm run dev

# 2) Frontend (new terminal)
cd ../frontend
npm ci
npm run dev
```

Open `http://localhost:5173/admin/login`.

If no experimenter exists yet, complete one-time setup in the login page.

## Repository structure

- `frontend/` — React app
- `backend/` — Express API + migrations
- `web/` — nginx web image assets for deployment
- `docs/` — architecture, API, deployment, and feature documentation

## License

MIT — see [LICENSE](./LICENSE)
