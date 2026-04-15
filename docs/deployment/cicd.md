# CI/CD Pipeline

## GitHub Actions — deploy to Elastic Beanstalk

Workflow file: [`.github/workflows/deploy-main.yml`](../../.github/workflows/deploy-main.yml).

| Item | Detail |
|------|--------|
| **Trigger** | Push to branch `main` (including merges). |
| **Auth** | **OIDC** to AWS — repository secret `AWS_ROLE_ARN` must be an IAM role that trusts `token.actions.githubusercontent.com` for this repo on `refs/heads/main`. No long-lived `AWS_ACCESS_KEY_ID` in GitHub. |
| **Images** | Builds **linux/amd64** Docker images for API (`backend/Dockerfile`) and web (`web/Dockerfile`), pushes to **ECR** with tag `${{ github.sha }}`. |
| **Deploy** | Zips `Dockerrun.aws.json` per environment, uploads to S3 bucket **`EB_S3_BUCKET`**, creates an EB application version, updates **API** then **web** environments. Version labels include the git SHA and **`github.run_id`** so re-running the workflow does not fail with “version already exists”. |
| **Concurrency** | Single flight per branch group `deploy-main`; a newer run cancels an in-progress one. |

### Required GitHub configuration

**Repository secret**

| Name | Purpose |
|------|---------|
| `AWS_ROLE_ARN` | ARN of the IAM role assumed by the workflow (OIDC). |

**Repository variables** (Settings → Secrets and variables → Actions → Variables)

| Name | Example | Purpose |
|------|---------|---------|
| `AWS_REGION` | `us-east-2` | Region for ECR, S3, Elastic Beanstalk. |
| `AWS_ACCOUNT_ID` | `123456789012` | Account ID in ECR image URIs. |
| `ECR_API_REPO` | `dta-api` | ECR repository name for the API image. |
| `ECR_WEB_REPO` | `dta-web` | ECR repository name for the web image. |
| `EB_APP_NAME` | `dta` | Elastic Beanstalk **application** name. |
| `EB_API_ENV_NAME` | `dta-api-prod` | API **environment** name. |
| `EB_WEB_ENV_NAME` | `dta-web-prod` | Web **environment** name. |
| `EB_S3_BUCKET` | `elasticbeanstalk-us-east-2-123456789012` | Bucket where the workflow uploads deploy zips before `create-application-version`. Usually the account’s Elastic Beanstalk staging bucket (`elasticbeanstalk-<region>-<account-id>`). |

### AWS IAM role (OIDC) — trust policy shape

The role’s trust policy should allow `sts:AssumeRoleWithWebIdentity` from the GitHub OIDC provider and restrict **`sub`** to this repository and **`main`**, for example:

`repo:YOUR_ORG_OR_USER/detecting-the-artificial:ref:refs/heads/main`

Attach policies that allow at least: **ECR** push to the two repos, **S3** `PutObject` (and read if needed) on `EB_S3_BUCKET`, and **Elastic Beanstalk** `CreateApplicationVersion`, `UpdateEnvironment`, `DescribeEnvironments` (broader managed policies are common for a first setup).

### What the workflow does *not* do

- **Database migrations** — run separately against RDS (see [Database migrations](database-migrations.md)). After schema changes, deploy API as usual; consider running migrations before or immediately after the API deploy step in your process.
- **Create ECR repositories** — ensure `ECR_API_REPO` and `ECR_WEB_REPO` exist in `AWS_REGION` before the first run.
- **Wait for EB environment health** — `update-environment` returns when the update is *started*; confirm **health** in the Elastic Beanstalk console or CLI if a deploy looks stuck.

### Elastic Beanstalk / runtime configuration

Environment properties (e.g. `DATABASE_URL`, `API_UPSTREAM`, S3 vars) stay in **Elastic Beanstalk** configuration, not in the workflow. See [AWS deployment](aws-deployment.md).

## Related

- [Local setup](local-setup.md)
- [AWS deployment](aws-deployment.md)
