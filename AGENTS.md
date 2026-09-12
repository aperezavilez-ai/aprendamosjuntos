# Project isolation rules

Before changing databases, Auth, Storage, environment variables or deployments:

1. Read `project-infra.json`.
2. Run `node .project-governance/validate-project-isolation.mjs`.
3. Do not reuse Supabase URLs, credentials, databases or Storage from another project.
4. Never hardcode secrets in source code, SQL, scripts or documentation.
5. Stop if the configured target differs from `project-infra.json`.
6. Legacy shared projects may not be used as a template for a new project.

