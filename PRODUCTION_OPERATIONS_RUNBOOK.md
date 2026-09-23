# Adisearch Workspace production operations runbook

This runbook defines the minimum operational controls for the Adisearch Workspace production service. It complements `R9_RELEASE_CHECKLIST.md`; it does not replace exact-head CI, authenticated acceptance testing, or provider access controls.

## Authoritative production surfaces

| Surface          | Authority                                                       | Expected state                                                |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| Source           | `adisearchtechs/Adisearch-Work-Space` `master`                  | Protected, reviewed release history                           |
| Application      | `https://circle-eta-bice.vercel.app`                            | Sign-in surface or authenticated workspace response           |
| Readiness        | `https://circle-eta-bice.vercel.app/api/health`                 | HTTP 200 and `{"status":"ok"}` with `Cache-Control: no-store` |
| Database/Auth    | Supabase project `iwehjdgijlviwewbjwnn`                         | `ACTIVE_HEALTHY`; migrations ordered and RLS enabled          |
| Release evidence | GitHub Actions and Vercel deployment for the exact `master` SHA | Required checks successful and deployment `READY`             |

Never paste credentials, session cookies, access tokens, database connection strings, personal data, or service-role keys into issues, logs, screenshots, or release notes.

## Monitoring baseline

The release owner performs these checks after every production deployment. Until an external uptime service is configured, the operating owner also performs them at least weekly.

| Check                  | Pass condition                                                                              | Evidence                          |
| ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------- |
| Stable application URL | HTTP 200 after redirects; page title identifies Adisearch Workspace                         | Timestamp, final URL, status      |
| Readiness endpoint     | HTTP 200; exact minimal JSON body; no-store response                                        | Timestamp and response metadata   |
| Vercel deployment      | Exact `master` SHA is `READY`, `target=production`, and is the current alias target         | Deployment ID and SHA             |
| Vercel runtime errors  | No unexplained fatal/error cluster introduced by the release                                | Time window and reviewed clusters |
| GitHub workflows       | `validate`, `browser-smoke`, and `authenticated-workspace` succeeded on the release head    | Run IDs                           |
| Supabase project       | Project is healthy; Auth, Data API, Storage, Realtime, and database health notices reviewed | Advisor timestamp and findings    |
| Supabase security      | No new database, RLS, grant, or privileged-function warning                                 | Security Advisor result           |
| Supabase performance   | No new unindexed foreign key or release-specific regression                                 | Performance Advisor result        |

Use the current unified Supabase logs interface and ClickHouse SQL. Do not build new automation against the retired `logs.all` Management API endpoint.

## Severity and ownership

| Severity | Example                                                                                      | Response target   | Required action                                                                  |
| -------- | -------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| SEV-1    | Cross-tenant exposure, credential compromise, destructive data loss, total production outage | Immediate         | Contain access, preserve evidence, notify the owner, and begin rollback/recovery |
| SEV-2    | Authentication failure, broken critical workflow, sustained server errors                    | 30 minutes        | Assign incident owner, mitigate or roll back, and publish internal status        |
| SEV-3    | Degraded non-critical feature or isolated error with workaround                              | Same business day | Create a bounded issue and schedule a corrective release                         |
| SEV-4    | Cosmetic defect or low-risk operational improvement                                          | Normal planning   | Record and prioritize in the project backlog                                     |

The person initiating a release is the release owner until another named operator accepts the role. A SEV-1 or SEV-2 incident must have one incident owner and one written timeline; parallel uncoordinated production changes are prohibited.

## Incident response

1. Record the UTC detection time, affected URL or workflow, release SHA, deployment ID, and reporter.
2. Classify severity and appoint the incident owner.
3. Preserve relevant GitHub, Vercel, Supabase, and application evidence without copying secrets or personal data.
4. Contain the affected capability. Revoke exposed credentials before deploying code that depends on them.
5. Decide between forward correction and rollback. Prefer rollback when the last known-good deployment is verified and the current release threatens availability, security, or data integrity.
6. Verify the stable URL, readiness endpoint, authentication, tenant isolation, and the affected user journey after mitigation.
7. Record root cause, customer impact, corrective actions, owners, and due dates in the Workspace.

## Application rollback

1. Identify the most recent known-good Vercel production deployment and confirm its Git SHA previously passed all three required workflows.
2. Record the current failing deployment ID and SHA before changing the alias.
3. Promote or roll back to the known-good deployment through Vercel's protected production controls.
4. Do not force-push, rewrite `master`, disable required checks, or merge an unverified revert.
5. Verify the stable application URL and `/api/health`, then run the critical authenticated journey.
6. Open a corrective pull request from current `master`; repeat exact-head CI and production certification.

## Database recovery

Database rollback is not the same as application rollback. Never restore production merely to reverse a compatible application migration.

1. Stop or restrict writes if continued traffic can worsen corruption.
2. Record the incident time, suspected bad-write window, current migration list, and the recovery point offered by the active Supabase plan.
3. Prefer a forward data correction for bounded, understood errors with auditable predicates.
4. For broad corruption or loss, restore to an isolated project or branch first when provider capabilities permit.
5. Validate organization counts, memberships, issue/project counts, RLS behavior, and critical foreign-key relationships against pre-incident evidence.
6. Obtain explicit owner approval before any production cutover or destructive replacement.
7. After recovery, rotate affected credentials, re-run advisors, and complete authenticated acceptance tests.

If point-in-time recovery or downloadable backups are not available on the active plan, that limitation is a launch risk and must remain recorded on the launch-gate issue.

## Recovery drill

Run a non-destructive recovery drill before closing the operating-workspace launch gate and at least quarterly afterward.

The drill must record:

- scenario and recovery objective;
- participants and owner;
- known-good application deployment;
- available database recovery point or documented plan limitation;
- verification queries and authenticated user journey;
- elapsed detection, decision, rollback, and recovery times;
- failures, follow-up issues, and target dates.

## External service gates

Resend, OpenAI, GitHub App, Slack, calendar, and document-provider capabilities are not considered live because a card or route exists. Each provider requires production credentials in its provider secret store, least-privilege permission review, successful acceptance evidence, and a tested fail-closed path. Unsupported providers must remain visibly unavailable.

## Release evidence record

Every production release update should include:

- pull request and exact head SHA;
- merge SHA and production deployment ID;
- required workflow run IDs;
- database migrations and advisor results;
- stable URL and readiness verification time;
- runtime-error review window;
- unresolved external gates;
- rollback candidate;
- final release decision and owner.
