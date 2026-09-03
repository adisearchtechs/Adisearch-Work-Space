# R9 Production Release Checklist

This checklist is the production release gate for Adisearch Workspace. A release is not certified until every required item below is either verified or explicitly recorded as an external feature gate.

## Required code and browser certification

- CI passes on the exact release commit.
- Browser E2E passes on the exact release commit.
- Authenticated E2E passes on the exact release commit using the dedicated test identities.
- The release commit is the current `master` head.
- Production builds and CI use Node.js 24.

## Database and security

- All production migrations are applied before release certification.
- Supabase Security Advisor contains no unresolved database/RLS/function warnings.
- The hosted Auth leaked-password-protection warning is tracked separately until the Supabase plan/settings allow it to be enabled.
- Supabase Performance Advisor has no unindexed foreign-key findings introduced by the application schema.
- Do not remove indexes merely because the advisor reports them unused immediately after creation; usage statistics require representative production traffic.

## Production deployment

- A Vercel deployment exists for the exact `master` release SHA.
- That deployment is `READY` and has `target=production`.
- The production aliases resolve to that exact deployment.
- Runtime error clusters are checked after deployment.
- A protected production URL returning Vercel SSO is not considered an application browser test; use the authenticated browser suite for UI certification.

## External feature gates

These do not block the core workspace release when the UI reports them truthfully as unavailable, but they must not be described as live until configured and tested:

- Invitation email delivery: verified Resend sender plus `RESEND_API_KEY` and `INVITATION_FROM_EMAIL`.
- Real Agent model execution: production `OPENAI_API_KEY`.
- GitHub App activation: production GitHub App credentials.
- Supabase leaked-password protection: hosted Auth setting and any required plan entitlement.

## Repository release controls

`master` should be protected in GitHub with pull requests required and these exact checks required before merge:

- `validate`
- `browser-smoke`
- `authenticated-workspace`

Direct force pushes and branch deletion should be disabled. Administrators should not bypass required checks for ordinary production releases.

## Rollback

If production smoke checks fail after a release, promote the most recent known-good Vercel production deployment rather than bypassing CI or rewriting `master`. Follow with a corrective pull request and repeat all three certification workflows.
