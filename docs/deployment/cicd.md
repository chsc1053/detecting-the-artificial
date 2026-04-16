# CI/CD Pipeline

## GitHub Actions — deploy to Elastic Beanstalk

Workflow file: [`.github/workflows/deploy-main.yml`](../../.github/workflows/deploy-main.yml).

| Item | Detail |
|------|--------|
| **Trigger** | Push to branch `main` (including merges). |
| **GitHub Environment** | The deploy job sets **`environment: env`** (see the workflow file). |
| **Auth** | **OIDC** to AWS — `AWS_ROLE_ARN` must be an IAM role whose **trust policy** allows GitHub's token for this repository (see **AWS IAM role (OIDC)** below — include both **`main`** and **`environment:env`** `sub` claims when using `environment: env`). Store `AWS_ROLE_ARN` as an **Environment** secret on `env` (recommended) or as a **repository** secret. No long-lived AWS access keys in GitHub. |
| **Images** | Builds **linux/amd64** Docker images for API (`backend/Dockerfile`) and web (`web/Dockerfile`), pushes to **ECR** with tag `${{ github.sha }}`. |
| **Deploy** | Zips `Dockerrun.aws.json` per environment, uploads to S3 bucket **`EB_S3_BUCKET`**, creates an EB application version, updates **API** then **web** environments. Version labels include the git SHA and **`github.run_id`** so re-running the workflow does not fail with “version already exists”. |
| **Concurrency** | Single flight per branch group `deploy-main`; a newer run cancels an in-progress one. |

### Required GitHub configuration

This workflow **pins a GitHub Environment by name** on the deploy job (`environment: env` in [`.github/workflows/deploy-main.yml`](../../.github/workflows/deploy-main.yml)). Treat that as the source of truth for deploy configuration unless you change the YAML.

**Setup**

1. In GitHub: **Settings → Environments → New environment** — create an environment named **`env`** (must match the workflow exactly), or rename the `environment:` value in the workflow to match an environment you use (e.g. `production`).
2. On that environment, add **Environment variables** for every name in the table below (`AWS_REGION`, `AWS_ACCOUNT_ID`, …). Repository **Actions → Variables** are optional here: once `environment:` is set, **Environment variables override** repository variables with the same name when the job runs.
3. Add **Environment secret** `AWS_ROLE_ARN` on the same environment (recommended), or keep it as a repository secret if you prefer.

**Secret**

| Name | Purpose |
|------|---------|
| `AWS_ROLE_ARN` | ARN of the IAM role assumed by the workflow (OIDC). Prefer an **Environment** secret on the job’s GitHub Environment (`env`); a **repository** secret also works. |

**Variables** (define on the GitHub Environment named in the workflow, e.g. `env`)

| Name | Example | Purpose |
|------|---------|---------|
| `AWS_REGION` | `us-east-2` | Region for ECR, S3, Elastic Beanstalk. |
| `AWS_ACCOUNT_ID` | `123456789012` | Account ID in ECR image URIs. |
| `ECR_API_REPO` | `dta-api` | ECR repository name for the API image. |
| `ECR_WEB_REPO` | `dta-web` | ECR repository name for the web image. |
| `EB_APP_NAME` | `dta` | Elastic Beanstalk **application** name. |
| `EB_API_ENV_NAME` | `dta-api-prod` | API **environment** name. |
| `EB_WEB_ENV_NAME` | `dta-web-prod` | Web **environment** name. |
| `EB_S3_BUCKET` | `elasticbeanstalk-us-east-2-123456789012` | Bucket where the workflow uploads deploy zips before `create-application-version`. Usually the account's Elastic Beanstalk staging bucket (`elasticbeanstalk-<region>-<account-id>`). |

### AWS IAM role (OIDC) — trust policy

**Identity provider:** IAM must include an OIDC provider for `https://token.actions.githubusercontent.com` with audience `sts.amazonaws.com` (create once per account if missing).

**Why two `sub` patterns:** Pushes to `main` use a subject like `repo:OWNER/REPO:ref:refs/heads/main`. Jobs that set **`environment: env`** (this workflow) receive a different subject: `repo:OWNER/REPO:environment:env`. Include **both** conditions (two `Statement` entries) so branch-only tooling and environment-scoped deploys both work.

Replace `AWS_ACCOUNT_ID`, `OWNER`, and `REPO`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubActionsMainBranch",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    },
    {
      "Sid": "GitHubActionsDeployEnvironment",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:environment:env"
        }
      }
    }
  ]
}
```

For example, this repository (`chsc1053/detecting-the-artificial`) with GitHub Environment **`env`**, the two `sub` values are:

- `repo:chsc1053/detecting-the-artificial:ref:refs/heads/main`
- `repo:chsc1053/detecting-the-artificial:environment:env`

**Permissions on the role:** allow at least **ECR** push to the API and web repos, **S3** `PutObject` (and read if needed) on `EB_S3_BUCKET`, and **Elastic Beanstalk** `CreateApplicationVersion`, `UpdateEnvironment`, and describe/list as needed (broader managed policies are common for a first setup).

### After a successful deploy

1. GitHub → **Actions** → latest **Deploy to Elastic Beanstalk** run should be green.
2. Confirm EB application versions on both environments reference the new image tag (`git` SHA).
3. Smoke-test the site (replace with your web URL): `GET /` and `GET /api/studies` on the **web** hostname (see [AWS deployment](aws-deployment.md) — end-to-end checks).

### What the workflow does *not* do

- **Database migrations** — run separately against RDS (see [Database migrations](database-migrations.md)). After schema changes, deploy API as usual; consider running migrations before or immediately after the API deploy step in your process.
- **Create ECR repositories** — ensure `ECR_API_REPO` and `ECR_WEB_REPO` exist in `AWS_REGION` before the first run.
- **Wait for EB environment health** — `update-environment` returns when the update is *started*; confirm **health** in the Elastic Beanstalk console or CLI if a deploy looks stuck.

### Elastic Beanstalk / runtime configuration

Environment properties (e.g. `DATABASE_URL`, `API_UPSTREAM`, S3 vars) stay in **Elastic Beanstalk** configuration, not in the workflow. See [AWS deployment](aws-deployment.md).

## Related

- [Local setup](local-setup.md)
- [AWS deployment](aws-deployment.md)
