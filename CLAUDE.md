# Mandatory infrastructure policy

Read `project-infra.json` and run
`node .project-governance/validate-project-isolation.mjs`
before database, Auth, Storage, migration or deployment changes. One project
must have one dedicated Supabase instance. Never reuse or hardcode credentials.
Stop on any target mismatch.

