# AWS deployment — step-by-step setup

## What you will have when you are done


| Piece                      | What it does                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **S3 bucket**              | Stores uploaded images, videos, and audio. The admin **Stimuli upload** tab sends files here.                                            |
| **Bucket policy + CORS**   | Lets **anyone read** files under `stimuli/`* (so participants can see media) and lets **your admin site** upload files from the browser. |
| **IAM role (recommended)** | Lets the **API server** ask S3 for presigned upload links **without** putting AWS passwords in your code.                                |
| **Environment variables**  | Tell the running app your bucket name and region (`AWS_S3_BUCKET`, `AWS_REGION`, etc.).                                                  |


The **database (RDS PostgreSQL)** and **hosting the app (e.g. Elastic Beanstalk)** are part of the full production stack; this guide gives **detailed steps for S3 + IAM + env vars** (required for uploads) and **pointers** for RDS and Beanstalk so you know what to do next.

---

## How to use this guide

1. Open the AWS console in a desktop browser: [https://console.aws.amazon.com/](https://console.aws.amazon.com/).
2. Complete **Phase 1 → Phase 6** in order.


**Region:** In the AWS console, the region is shown in the **top right** (next to your account name). Click it to change region. **Create the S3 bucket in the same region** you intend to use for your app servers so latency and configuration stay simple.

---

## Phase 0 — AWS account and console

### Step 0.1 — Create or sign in to an AWS account

1. Go to [https://aws.amazon.com/](https://aws.amazon.com/) and choose **Create an AWS Account** (or **Sign In to the Console** if you already have one).

### Step 0.2 — Open the right region

1. Sign in to [https://console.aws.amazon.com/](https://console.aws.amazon.com/).
2. In the **top right**, open the **region** dropdown.
3. Choose a region (for example **US East (N. Virginia)** — code `us-east-1`).
4. **Stay in this region** for S3 and for creating IAM policies unless your organization mandates otherwise.

---

## Phase 1 — Create the S3 bucket

### Step 1.1 — Open S3

1. In the top search bar, type **S3** and open **S3** (object storage).
2. Confirm the region in the top right still matches.

### Step 1.2 — Start bucket creation

1. Click the orange **Create bucket** button.

### Step 1.3 — General configuration

1. **Bucket name:** Enter a name that is **globally unique** across all of AWS (lowercase letters, numbers, hyphens are safe). Example: `my-lab-detecting-media`.
2. **AWS Region:** Should match the region you chose (e.g. N. Virginia = `us-east-1`).

### Step 1.4 — Object Ownership

1. Leave **ACLs disabled (recommended)** unless your organization says otherwise. The app does not rely on object ACLs.

### Step 1.5 — Block Public Access (important)

For participants to open media URLs in the browser, objects under `stimuli/` must be **readable without logging in**. The simplest approach is to allow **public read** only via a **bucket policy**.

1. Find **Block Public Access settings for this bucket**.
2. **Uncheck** **Block all public access** (or expand and uncheck the settings that block **public bucket policies**—the console explains each checkbox).
3. A yellow warning appears. Check the **acknowledgement** box that you understand objects may become public if you add a policy that allows it.

### Step 1.6 — Bucket versioning, encryption, tags

1. For a first setup, you can leave **default encryption** on (SSE-S3 is fine).
2. Versioning is optional. Click **Create bucket**.

### Step 1.7 — Confirm the bucket exists

1. You should see your bucket in the bucket list. Click its **name** to open it.

---

## Phase 2 — Configure CORS on the bucket

Browsers enforce **CORS**: your admin page (e.g. `https://app.example.com`) must be **explicitly allowed** to send a **PUT** request to S3. Without this step, upload often fails **after** the app returns a presigned URL.

### Step 2.1 — Open CORS settings

1. Open your bucket (S3 → bucket name).
2. Open the **Permissions** tab.
3. Scroll to **Cross-origin resource sharing (CORS)**.
4. Click **Edit**.

### Step 2.2 — Paste CORS rules

1. Delete any placeholder and paste the JSON below.
2. Replace the example origins with **your real values**:
  - Put your **production admin** site as `https://...` (**no trailing slash**, no path. just scheme + host).
  - If you will test upload from your laptop with `npm run dev`, add `http://localhost:5173`.

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://YOUR-PRODUCTION-ADMIN-DOMAIN.example.com",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

1. Click **Save changes**.

**If you use multiple domains** (e.g. staging and production), add each as a separate string inside `AllowedOrigins`.

---

## Phase 3 — Bucket policy (public read for `stimuli/*` only)

This lets **participants** load media by URL (the same URL you store as **Media URL** on a stimulus).

### Step 3.1 — Open bucket policy

1. Still on the bucket **Permissions** tab.
2. Scroll to **Bucket policy**.
3. Click **Edit**.

### Step 3.2 — Paste the policy

1. Paste the JSON below.
2. Replace `**YOUR_BUCKET_NAME`** (in `Resource`) with your **exact** bucket name.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadStimuliPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/stimuli/*"
    }
  ]
}
```

1. Click **Save changes**.
2. If AWS shows an error about **public access blocked**, go back to **Permissions** → **Block public access (bucket settings)** → **Edit**, allow public access for **bucket policies** as needed, save, then retry saving the bucket policy.

### Step 3.3 — What this policy does (sanity check)

- **Who:** `Principal: "*"` means **anyone on the internet** can perform the listed action **only** on keys matching `stimuli/*`.
- **What:** `s3:GetObject` is **download / read** only. It does **not** let strangers upload or delete.
- **Uploads** still require a **presigned URL** from your authenticated admin API.

---

## Phase 4 — IAM: policy that allows the server to create uploads

The API must call AWS to **sign** a PUT URL. That requires `**s3:PutObject`** on your bucket’s `stimuli/*` prefix.

### Step 4.1 — Open IAM Policies

1. In the top search bar, type **IAM** and open **IAM**.
2. In the left menu, click **Policies**.
3. Click **Create policy**.

### Step 4.2 — Create policy from JSON

1. Click the **JSON** tab.
2. Paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StimuliUploadPutOnly",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/stimuli/*"
    }
  ]
}
```

1. Replace `**YOUR_BUCKET_NAME**` with your bucket name.
2. Click **Next**.

### Step 4.3 — Name and create the policy

1. **Policy name:** e.g. `DetectingArtificialStimuliPut`.
2. **Description (optional):** e.g. `Presigned PUT uploads for detecting-the-artificial stimuli`.
3. Click **Create policy**.

---

## Phase 5 — IAM: role for the application server (recommended for production)

Use this when the Node API runs on **EC2** or **Elastic Beanstalk**.

### Step 5.1 — Start creating a role

1. In IAM, left menu → **Roles**.
2. Click **Create role**.

### Step 5.2 — Trusted entity

1. **Trusted entity type:** **AWS service**.
2. **Use case:** choose **EC2** (Elastic Beanstalk launches EC2 instances).
3. Click **Next**.

### Step 5.3 — Add permissions

1. In the search box, type the **policy name** you created (e.g. `DetectingArtificialStimuliPut`).
2. Check the box next to that policy.
3. Click **Next**.

### Step 5.4 — Name the role

1. **Role name:** e.g. `detecting-artificial-api-role`.
2. Click **Create role**.

### Step 5.5 — Attach this role to Elastic Beanstalk (when you use EB)

1. Open **Elastic Beanstalk** in the console (search “Elastic Beanstalk”).
2. Click your **environment** (not only the application).
3. In the left menu, click **Configuration**.
4. Find the **Instances** category (sometimes under **Updates, monitoring, and more** → **Edit** on the **Security** card, depending on console version).
5. Look for **EC2 instance profile** or **IAM instance profile**.
6. Choose the role you created (e.g. `detecting-artificial-api-role`).
7. Click **Apply** / **Save** and wait until the environment **health** is **Ok** (EB may replace instances).

If you do **not** use Elastic Beanstalk, attach the same role to whatever runs the API (for example the EC2 instance profile or the task role in ECS).

---

## Phase 6 — Environment variables on the server

### Elastic Beanstalk: where to set variables

1. **Elastic Beanstalk** → your **environment** → **Configuration**.
2. Open **Software** (or **Updates, monitoring, and more** → **Environment properties**).
3. Under **Environment properties**, add each name/value pair (`AWS_REGION`, `AWS_S3_BUCKET`, etc.).
4. **Apply** changes and wait for the deployment to finish.
5. **Restart** application servers if the console offers it, so all processes pick up new values.

### Local development (optional)

1. Copy `backend/.env.example` into `backend/.env`.
2. Set `AWS_REGION`, `AWS_S3_BUCKET`, and **access keys** for a user that has the same `s3:PutObject` policy on `stimuli/*`.

---

## Phase 7 — Verify Stimuli upload end-to-end

1. Ensure the **API** is running with the env vars above and (in production) the **IAM instance profile** attached.
2. Sign in to the **admin** UI → **Stimuli** → **Stimuli upload**.
3. Choose a small **JPEG** or **MP3** → **Upload and get URL**.
4. **Expected:** a **public URL** appears. Open it in a new browser tab; the file should display or download.
5. Go to **Image** / **Audio** / **Video** → paste that URL into **Media URL** → complete **Source description** → **Create stimulus**.

### If something fails


| Symptom                                                       | What to check                                                                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Message about upload **not configured**                       | `AWS_REGION` and `AWS_S3_BUCKET` set on the **server** that handles `/admin/stimuli/upload/presign`. Typo in names. Restart app after changes. |
| Presign works, browser **PUT** fails (CORS error in devtools) | S3 **CORS** `AllowedOrigins` must include your **exact** admin origin (scheme + host + port). No trailing slash.                               |
| Presign works, browser **PUT** returns **403** and the PUT URL contains `x-amz-checksum` or `x-amz-sdk-checksum` | The backend must generate presigned URLs **without** automatic CRC32 query parameters (browsers do not send matching checksum headers). Use a current backend build; the API configures the S3 client with `requestChecksumCalculation: WHEN_REQUIRED`. Redeploy and try again. |
| URL opens but **403 Access Denied**                           | **Bucket policy** missing or wrong bucket name; **Block public access** still blocking policy; object key not under `stimuli/`.                |
| **403** on presign or server error                            | IAM role or keys missing **s3:PutObject** on `arn:aws:s3:::BUCKET/stimuli/*`. Role not attached to EC2/Beanstalk instance.                   |


**Browser devtools:** Press F12 → **Network** tab. Find the **PUT** request to `amazonaws.com`. Red status and a CORS message point to Phase 2.

---

## Full production checklist (beyond uploads)

1. **RDS PostgreSQL** — Create a database in the **same VPC** strategy as the app; note endpoint, port, database name, user, password.
2. `DATABASE_URL` — Set on the server (Elastic Beanstalk environment properties), e.g. `postgres://USER:PASSWORD@HOST:5432/DBNAME` (use your team’s secret handling; avoid logging the password).
3. **Security groups** — Allow the app servers to reach RDS on **5432** from the EB security group only.
4. **Migrations** — Run `npm run migrate:up` (or your process) against production **once** as part of deploy (documented in [database migrations](database-migrations.md)).
5. **HTTPS** — Put the user-facing site behind **HTTPS** (load balancer / CloudFront); update CORS origins to `https://...`.

---

## Elastic Beanstalk — full stack (API + web + RDS)

This section documents the **shape of a complete deploy** used for this project: **two** Elastic Beanstalk **Docker** environments in the **same AWS region** as S3 and RDS, **single-instance** (no Application Load Balancer), **no NAT Gateway**. Exact names vary by account; a reference layout is: application `dta`, API environment `dta-api-prod`, web environment `dta-web-prod`, region `us-east-2`.

### Why two environments

- **API** runs the Node server (`backend/Dockerfile`). It uses `DATABASE_URL`, S3 env vars, and (on EC2) an **instance profile** for S3 — same as Phases 1–6 above.
- **Web** runs **nginx** (`web/Dockerfile`) serving the Vite build and **proxying** `/api/*` to the API. The frontend code calls `/api/...`; in dev, Vite rewrites `/api` to the backend (see [Local setup](local-setup.md)). In production, nginx must do the equivalent: `location /api/` proxies to `API_UPSTREAM` with a path rewrite so upstream routes stay `/studies`, `/participant`, `/admin`, … (not `/api/studies`). The `web/nginx.conf.template` uses `proxy_pass` to the API origin with that rewrite.

Set **environment property** on the **web** environment only:

- `API_UPSTREAM` — base URL of the API EB environment, **no trailing slash**, e.g. `http://dta-api-prod.eba-xxxx.us-east-2.elasticbeanstalk.com`.

### Containers in this repo

| Path | Role |
|------|------|
| `backend/Dockerfile` | Production API image: `npm ci --omit=dev`, `node index.js`, listens on `PORT` (use `3000` consistently with Dockerrun). |
| `web/Dockerfile` | nginx + static files under `/usr/share/nginx/html` (from `frontend` build output copied to `web/dist` at image build time). |
| `web/docker-entrypoint.sh` | Substitutes `API_UPSTREAM` into the nginx config at container start. |
| `web/nginx.conf.template` | nginx site config (not committed with secrets). |

### ECR and CPU architecture

Push images to **ECR** repositories (e.g. `dta-api`, `dta-web`). Elastic Beanstalk **x86_64** instances pull **linux/amd64** images. Build on Apple Silicon with **`docker buildx build --platform linux/amd64`** (or equivalent) so pulls do not fail with “no matching manifest for linux/amd64”.

### Elastic Beanstalk EC2 role and ECR

The **EC2 instance profile** attached to each Beanstalk environment must be allowed to **pull from ECR**. If deploy logs show `ecr:GetAuthorizationToken` **AccessDenied**, attach **`AmazonEC2ContainerRegistryReadOnly`** (or equivalent) to the **`aws-elasticbeanstalk-ec2-role`** (or whichever instance profile EB uses). The **API** instance profile still needs S3 permissions for stimuli uploads.

### Deploy bundles (`Dockerrun.aws.json`)

Each environment deploy uses a small zip containing **`Dockerrun.aws.json`** (single-container) pointing at the ECR image tag and container port (**3000** API, **80** web). Elastic Beanstalk stores the bundle in an account **staging bucket** (commonly named like `elasticbeanstalk-<region>-<account-id>`) when creating an application version. Do not commit local zips or a stray repo-root `Dockerrun.aws.json` — see root `.gitignore`.

### RDS (same VPC)

- Place **RDS** in the **same VPC** as the EB instances (typical: RDS in private subnets; EB instances in **public** subnets with a public IP so they can reach **ECR** and the internet **without a NAT gateway**).
- **Security group:** allow **PostgreSQL 5432** from the **API EB** instance security group to the **RDS** security group.
- Set **`DATABASE_URL`** on the **API** environment only. For RDS TLS from Node, you may need query parameters on the URL (see [Database migrations](database-migrations.md)).

### End-to-end checks

1. **API URL:** `GET /studies` (and `/health`) should respond (not necessarily `GET /`, which may 404).
2. **Web URL:** browser loads the SPA; `GET /api/studies` through the **web** hostname returns JSON from Express (proxied), e.g. `{"success":true,"data":[]}` after migrations.

### CORS (S3 uploads)

When the admin UI is served from the **web** EB URL, add that origin (scheme + host, no path) to the S3 bucket **CORS** `AllowedOrigins`.

### CI/CD

Automated deploy from GitHub (e.g. merge to `main`); when enabled, document triggers and secrets in [CI/CD](cicd.md). Docker assets above are what any pipeline should build and push.

---

## Related

- [Local setup](local-setup.md) — run API + frontend locally.
- [CI/CD](cicd.md)
- [Architecture overview](../architecture/overview.md)
- [API endpoints](../api/endpoints.md) — `POST /admin/stimuli/upload/presign`

