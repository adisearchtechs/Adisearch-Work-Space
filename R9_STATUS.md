# R9 Status

R9 release hardening is released. Production `master` is deployed and healthy through merge commit `7448bcc80c47eac5ad9d5807c382d309f67924fe`, which fixed Vercel browser-public Supabase configuration through PR #72. The stable application URL renders the configured sign-in surface and `/api/health` returns HTTP 200.

The Production Launch Completion milestone now tracks the remaining operational gates in the Adisearch Workspace project:

- enable and verify Supabase hosted Auth leaked-password protection where the active plan permits;
- configure production monitoring and prove alert delivery;
- complete a non-destructive backup restoration and rollback drill;
- configure and verify only the approved Resend, OpenAI, and GitHub App production credentials;
- confirm GitHub branch-protection settings outside repository code.

These items remain open until external configuration and evidence exist. They must not be marked complete from repository changes alone.
