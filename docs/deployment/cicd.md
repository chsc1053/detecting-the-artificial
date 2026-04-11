# CI/CD Pipeline

No GitHub Actions workflows are checked in yet. The intended direction is as follows.

## Planned Scope

- GitHub Actions: lint, test, build on push/PR.
- Deploy to AWS Elastic Beanstalk (e.g. on merge to main or tagged release).
- No secrets in workflow logs; use GitHub secrets for AWS credentials and env vars.

## Related

- [Local setup](local-setup.md)
- [AWS deployment](aws-deployment.md)
