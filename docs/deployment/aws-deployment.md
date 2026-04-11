# AWS Deployment

Step-by-step production deployment is not documented in this repository yet. The target stack is outlined below.

## Planned Stack

- Elastic Beanstalk with Docker for the application.
- PostgreSQL on RDS; S3 for media storage.
- Environment variables and secrets via Elastic Beanstalk configuration (no secrets in repo).

## Related

- [Local setup](local-setup.md)
- [CI/CD](cicd.md)
- [Architecture overview](../architecture/overview.md)
