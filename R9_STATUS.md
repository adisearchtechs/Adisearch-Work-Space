# R9 Status

Release-hardening changes are implemented on `remediation-r9-release-hardening` and must be merged only after CI, Browser E2E, and Authenticated E2E all pass on the exact pull-request head.

Known external release gates that cannot be completed from repository code alone:

- GitHub `master` branch protection is not currently enforced by repository settings.
- Vercel has not yet shown a production deployment for the latest `master` commit.
- Supabase hosted Auth leaked-password protection remains disabled.
- Resend, OpenAI, and GitHub App live credentials remain intentionally unverified until configured through their production secret stores.
