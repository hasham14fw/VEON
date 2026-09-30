# Export validation

28 September 2026

- TypeScript check passed.
- Production build passed with bundled dependency versions.
- 10 risk-engine tests passed.
- Local D1 migrations applied successfully.
- Built Worker denied unauthenticated page, API and logo requests (401).
- Authenticated page and logo requests succeeded (200).
- Authenticated situations API returned an empty new database (200).

The package excludes installed dependencies, generated builds, all secrets, local database state and repository metadata. Dependencies must be installed before building. Validation reused the existing installed dependency tree; a fresh online dependency installation and deployment to a separate Cloudflare account have not been performed.
