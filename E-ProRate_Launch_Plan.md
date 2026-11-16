# E-ProRate launch plan

## Goal and first release

Launch E-ProRate on an HTTPS domain with a public landing page and an invite-only pilot. Two invited colleagues should be able to sign in with LinkedIn, add their own work history, and exchange private ratings when their employment dates overlap at the same company. A participant can report a rating, and an operator can review and hide it.

## How the service works

```mermaid
flowchart TD
    Invite["Open an invitation"] --> SignIn["Sign in with LinkedIn"]
    SignIn --> History["Add your work history"]
    History --> Find["Find a colleague in the pilot"]
    Find --> Check{"Same company and overlapping dates?"}
    Check -->|Yes| Rate["Submit a private rating with your name or anonymously"]
    Check -->|No| Explain["Show why a rating is unavailable"]
    Rate --> Receive["Colleague reads the rating in Received"]
    Receive -->|If reported| Moderate["Operator reviews and can hide the rating"]
```

Both colleagues add their own employment dates. E-ProRate checks the dates against each other, and LinkedIn handles account sign-in. The author sees their submission in **Given**. The recipient sees the feedback in **Received**, with the author's identity hidden when anonymous mode is selected. Authorized staff can review attribution to resolve a report.

## How we’ll build it

```mermaid
flowchart LR
    Foundation["CI, database and production hosting"] --> Auth["Secure sign-in and invites"]
    Auth --> Core["Work history and private ratings"]
    Core --> Launch["Moderation and live pilot"]
    Launch --> Learn["Review results before expanding"]
```

The existing React app provides the screens. The NestJS API handles sign-in, checks who can submit or view each rating, and applies the overlap rule. PostgreSQL stores accounts, work histories, ratings, and reports. The pilot uses the Heroku client app as its public HTTPS origin. The client forwards API requests to a separate Heroku app, which stores pilot data in Neon PostgreSQL.

Start from the restored `codex/restored-main` checkout at `1da60e2`. The TypeScript client and NestJS server build. The server has a LinkedIn sign-in scaffold and a health endpoint. Search, profiles, eligibility, and rating submission still use demo data or browser-only logic. The `main-server` branch has in-memory prototypes whose endpoints allow unauthorized profile writes and forged rating authors. Use the restored default branch as the implementation baseline. [Original investigation](E-ProRate_Adjustment_Plan.md) · [Restored source](https://github.com/MicroSaaSs/EmployeeRating/commit/1da60e2236aeb0e61a6467ff7e1c88a83263c746)

| Phase | Outcome | Depends on |
| --- | --- | --- |
| 1. Foundation | Reproducible setup, PostgreSQL, and production hosting | Restored baseline |
| 2. Sign-in and invitations | An invited participant can sign in securely in production | Phase 1 |
| 3. Work history and ratings | Two eligible participants can exchange private ratings | Phase 2 |
| 4. Launch | Moderation works and the pilot is live on the production domain | Phase 3 |
| 5. Evaluate and expand | Decide whether to open the next cohort or revise the product | Pilot results |

## Phase 1. Set up the foundation

- [ ] **Make builds reproducible.** Pin a supported Node version for both packages and CI. Regenerate the client lockfile from the current manifest, generate a server lockfile, and commit both. Run `npm ci`, both builds, and the client TypeScript check in CI. Update the README with the actual client and server startup commands.
- [ ] **Add PostgreSQL and migrations.** Use one database per environment and versioned SQL migrations applied by the server CLI. Start with `users`, `sessions`, `oauth_attempts`, and `invites`. Add the ratings tables in Phase 3. Use stable internal user IDs and a unique LinkedIn issuer/subject pair for account lookup within the environment.
- [ ] **Bring up production over HTTPS.** Deploy the Vite build to `e-prorate-client` and NestJS to `e-prorate-api`. Route `/api/*` to NestJS and let the remaining application paths fall back to Vite's `index.html`. Use the same `/api` path through a Vite proxy in development. Keep database credentials and LinkedIn secrets on the server through the hosting provider's secret store.
- [ ] **Set up deployment access.** Choose the hosting account and domain, name the person responsible for pilot support, and configure the LinkedIn app with the OpenID Connect product. Register the full production client URL for `/api/auth/linkedin/callback` and document the required settings, including `DATABASE_URL`, `CLIENT_APP_URL`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `LINKEDIN_REDIRECT_URI`.

**Exit check** — From a clean checkout, CI builds both packages and applies migrations to an empty database. The production client serves the UI and `/api/health` over HTTPS. A direct visit to a client route loads the app, and missing API routes return API errors.

## Phase 2. Make sign-in and invitations work

- [ ] **Harden the LinkedIn callback.** Bind a short-lived, single-use OAuth `state` value to the browser that starts sign-in. Reject missing, mismatched, expired, and replayed values. Use LinkedIn’s confidential authorization-code flow and validate the ID token signature, issuer, audience, subject, and expiry. LinkedIn’s documented web sign-in flow uses state for this callback. Use the configured callback and client URLs so local sign-in returns to port `4028` and production returns to the Heroku client origin. [LinkedIn OpenID Connect guide](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) · [LinkedIn authorization-code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) · [OAuth security best practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [ ] **Make PostgreSQL the session authority.** Issue a fresh, expiring session after login, store a digest of the session identifier, and revoke the session on logout. Use an `HttpOnly`, `SameSite=Lax` cookie with `Secure` on HTTPS. Return only the display fields needed by the UI from `/api/auth/session`, remove the browser `localStorage` session copy, and strip OAuth codes, provider tokens, and session IDs from logs. Use same-origin requests and reject cross-origin state-changing requests.
- [ ] **Enforce invitations on the server.** Give the operator a way to issue expiring, single-use invite links. Redeem each link atomically when the invited person completes sign-in. Allow returning participants to sign in directly. Route authenticated users to onboarding or their dashboard and provide a clear recovery message for expired invites and failed sign-in.
- [ ] **Cover the failure paths.** Add integration checks for invalid OAuth state, session expiry and logout, invitation reuse, and access to protected endpoints without a valid session. Complete a real LinkedIn sign-in in production with a test participant.

**Exit check** — A person with an invite can sign in with LinkedIn, reload, stay signed in after an API restart, and log out. A reused invite or unauthenticated API call grants no access. Verify that both local storage and response bodies are free of session identifiers and provider tokens.

## Phase 3. Complete the core rating flow

1. **Work history.**
   - [ ] Let participants add, edit, and remove their own employer, title, start date, and optional end date. Store structured dates and a canonical company ID. Let an operator resolve ambiguous company names during the pilot. Label the entries as self-reported. LinkedIn sign-in supplies account and basic profile information. [LinkedIn OpenID Connect guide](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
   - [ ] Replace the simulated LinkedIn work-history UI with this data. Show only the directory fields participants agree to share. Seed demo accounts in local development only.
2. **Eligibility and navigation.**
   - [ ] Search the pilot directory by name and use stable routes such as `/professionals/:id` and `/professionals/:id/rate`. Load the selected participant from the API and handle hidden, missing, and ineligible profiles.
   - [ ] On the server, require both active pilot accounts to have overlapping date ranges for the same company. Treat an open end date as today and use inclusive date boundaries for the pilot. Reject self-ratings and non-overlapping history. Save the minimum eligibility evidence and rule version with the rating for staff review. Treat overlap as an eligibility signal based on the participants' reports.
3. **Private rating submission and visibility.**
   - [ ] Persist the overall score, category scores, written feedback, and author visibility choice. Derive the author from the session and validate the payload. Enforce one rating per author and recipient in PostgreSQL. Allow the author to edit the existing rating and recheck eligibility when its content changes. Save the rating and its eligibility evidence atomically so retries and concurrent requests cannot create duplicates.
   - [ ] Populate the existing Given and Received views from the API. Give the author access to their own submission and the recipient access to ratings addressed to them. For anonymous ratings, omit the author ID and identifying details from recipient responses and restrict attribution to authorized dispute reviewers. Allow each participant to inspect another person's data only through explicitly permitted fields. Remove fixture scores and simulated submission success from the pilot UI.
   - [ ] Test eligible and ineligible date ranges, concurrent submission, forged author IDs, access by an unrelated account, and anonymous response fields.

**Exit check** — In the production smoke test, two invited users with overlapping work history complete the flow from search to persisted rating and see the correct Given and Received views after reload. A third user cannot read their private rating. A user with disjoint dates cannot submit one by calling the API directly.

## Phase 4. Launch the production pilot

- [ ] **Put moderation in place.** Add a report action to each received rating, an internal queue, and a way to hide or reinstate content with audited decisions. Restrict staff access by role. Add basic invite and write rate limits and an operator control to pause new submissions while preserving access to existing ones.
- [ ] **Publish the landing page and pilot rules.** Adapt the existing sign-in page to explain the pilot, give returning participants a sign-in entry point, and link the privacy notice and support contact. Explain who can see each rating, what anonymous mode hides, how to report content, and how participants can request account and data removal. Give the operator a procedure to handle removal requests and revoke access.
- [ ] **Prepare production.** Set up the domain, TLS, production LinkedIn app and exact callback, database migrations, and backups. Exercise a backup restore in an isolated database. Add health and error alerts, redacted logs, and a short rollback checklist with the prior application release and database recovery steps.
- [ ] **Release to one cohort.** Run the production smoke check with test accounts first. Check the public landing page, invitation, LinkedIn sign-in, eligibility, rating visibility, reporting, and logout. Then invite one group of colleagues who have worked together so participants have a reasonable chance of finding a match.

**Exit check** — The landing page is reachable on the production HTTPS domain. Pilot participants can complete the full flow. The operator can receive and resolve a report, pause submissions, and restore from a tested backup.

## Phase 5. Decide what to expand

- [ ] **Measure the pilot.** Review invite redemption, LinkedIn sign-in success, work-history completion, the share of activated users who find an eligible colleague, ratings submitted and viewed, and report volume and response times. Use aggregate counts and omit feedback text from analytics. A proposed first checkpoint is three distinct colleague pairs completing the flow and each pilot report receiving an operator response before inviting a second cohort.
- [ ] **Fix the largest drop-off.** Use short participant interviews and the pilot counts to decide whether to improve onboarding, employer matching, or the feedback experience. Confirm that participants understand rating visibility and self-reported eligibility.
- [ ] **Treat broader visibility as its own release.** Before publishing profiles or ratings about people outside the pilot, define how subjects are notified, distinguish people with similar names, require explicit confirmation before attaching a claim, test dispute and takedown handling, and decide which data may appear in public. Consider consents and visibility before offering recruiter access. Revisit subscriptions, analytics exports, notifications, PWA, and Telegram once the core flow shows repeat use.

## Implementation status

The workspace contains both lockfiles, the CI workflow, versioned PostgreSQL migrations, the pilot screens, and a deployable container configuration. Local checks covered clean installs, both builds, client type checking, signed ID-token validation with test keys, and the invite, rating, privacy, and moderation flows against PostgreSQL.

The operator's **Pilot operations** screen supports creating and revoking participant invitations and reviewing aggregate pilot activity. The report includes invitation redemptions, sign-ins, participation and eligibility, ratings opened, and the time to first moderation decision.

Participants can see the outcome of reports they filed. Operators can review resolved reports with their decision history and the rating as it appeared when reported. A later report keeps its own record.

Operators can suspend or restore a participant's access and review the access history. Suspension revokes existing sessions and takes the participant out of the directory while preserving ratings and reports.

Production uses `e-prorate-client` and `e-prorate-api` on Heroku with the existing Eco dyno subscription. Local development uses its own database and callback. The production client proxies `/api/*` to the API, which holds the Neon and LinkedIn credentials. See the [Heroku deployment instructions](README.md#deploy-on-heroku).
