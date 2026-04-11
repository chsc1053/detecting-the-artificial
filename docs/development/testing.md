# Testing Guidelines

There is no automated test suite in this repository yet.

## Planned Scope

- Unit tests for utilities and pure logic; integration tests for API endpoints.
- Frontend: component tests where valuable; avoid brittle UI tests.
- Naming: `*.test.js` or `*.spec.js`; run via npm scripts.
- Edge cases and error states; no committed credentials in test env.

## Related

- [Backend architecture](../architecture/backend.md)
- [Frontend architecture](../architecture/frontend.md)
