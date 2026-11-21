# E-ProRate

E-ProRate is a service for private peer feedback. Sign in with LinkedIn to create an account or return to your existing one. Add your own work history to rate colleagues whose dates overlap at the same company. The React client and NestJS API share one origin, and PostgreSQL stores the account and feedback data.

[Launch plan](E-ProRate_Launch_Plan.md) · [Original investigation](E-ProRate_Adjustment_Plan.md)

## Run locally

Use the Node version in `.nvmrc`. Docker Compose starts a development-only PostgreSQL instance. You can also use an existing development database with a dedicated `DATABASE_URL`.

```sh
nvm use
npm ci --prefix client
npm ci --prefix server
docker compose up -d --wait db
cp server/.env.example server/.env
npm run build --prefix server
npm run db:migrate --prefix server
```

Enter your LinkedIn OpenID Connect app's client ID and secret in `server/.env`. Register `http://localhost:4028/api/auth/linkedin/callback` as its OAuth redirect URL. LinkedIn credentials are needed for live sign-in. The landing page and tests can run with an empty LinkedIn configuration.

Run the API and client in separate terminals.

```sh
npm run dev --prefix server
npm start --prefix client
```

Open `http://localhost:4028`. Vite sends requests under `/api` to the NestJS server on port `3000`. For same-origin production-mode serving, build the client and run the compiled server from the `server` package. The process serves `client/build` by default.

## Administration

Run these commands from the repository root after building the server.

| Task | Command |
| --- | --- |
| Create a single-use participant invite | `npm run pilot:admin --prefix server -- invite` |
| Create a single-use operator invite | `npm run pilot:admin --prefix server -- invite --operator` |
| Prune expired sessions, OAuth attempts, invites, and rate-limit buckets | `npm run pilot:admin --prefix server -- prune` |
| Match a spelling variant to an existing company | `npm run pilot:admin --prefix server -- link-company-name "Company" "Company Inc."` |
| View aggregate activity counts | `npm run pilot:admin --prefix server -- metrics` |
| Fulfill an authenticated account removal request | `npm run pilot:admin --prefix server -- remove-account <user-id>` |

Participant invitations are optional. Accepting a valid single-use invitation links it to the verified LinkedIn account used to sign in. If the member already has an E-ProRate account, their account and work history are reused. Treat invite links like credentials and share each directly with its intended recipient. They expire after seven days. Operator invitations can create an operator account on first sign-in and do not promote an existing participant.

After signing in, the dashboard shows whether you need to add work history or can already rate a colleague. It also shows your directory visibility and new ratings to read. Opt into the directory to let other participants find you. An operator can open **Moderation** to review reports and attribution, hide or reinstate feedback, and pause new submissions. Ask the participant for the account reference shown on their dashboard and confirm the request before running the removal command. It permanently removes the account, sessions, work history, and ratings to or from that account.

To import your LinkedIn Experience, open your profile on desktop, choose **More** or **Resources**, then **Save to PDF**. Select the downloaded PDF under **My work history → Import LinkedIn experience**. You can also select `Positions.csv` from the **Positions** data export. Review the company, title, and dates before saving. Dates that give only a month or year use the first day of the starting period and the last day of the ending period, up to today for the current period. Re-imported positions that match your work history are marked **Already saved**. The browser reads the file locally and sends individual entries when you save them. [Save a profile as a PDF](https://www.linkedin.com/help/linkedin/answer/a541960/) · [Download your LinkedIn data](https://www.linkedin.com/help/linkedin/answer/a1339364/)

Members can add or remove their own LinkedIn profile link under **My work history → Directory**. Colleague search accepts names and LinkedIn profile links. Matching uses member-provided links and returns visible, active members. The **Eligible to rate** filter also checks work-history overlap.

**My work history → Import LinkedIn experience → Share LinkedIn tab** uses your normal browser and LinkedIn login:

1. Enter your profile link and select **Open LinkedIn Experience**. This opens the Experience page in a normal new tab.
2. **Share LinkedIn tab** becomes available after step 1. Choose only that tab in the native browser prompt. Windows and entire screens are rejected; audio is disabled.
3. Keep LinkedIn at **100% zoom** for readable text. Drag around the job titles, companies and dates in the preview, excluding logos and the sidebar. Optional zoom controls remain available, with a warning below 85%; shrinking a long history into one screen can lose text.
4. **Continuous — scroll in this preview** is the default. Select **Start reading**, grant the browser's permission to control the shared tab, then scroll over the preview and pause at each job header. There is no need to switch tabs. **Enable scrolling in preview** also lets you enable control before reading. The API forwards real wheel/trackpad gestures and intentionally rejects unattended/synthetic scrolling. Browsers without this feature show a clear fallback. The app requests **no focus change** after tab selection when the browser supports it. **One visible view** remains an optional mode that stops automatically.
   Recognition waits for stable, changed views. It detects date rows and re-reads compact job headers separately at higher resolution so descriptions/media-card captions do not replace job titles. Grouped roles retain their shared employer; locations, skills, compact duration labels and disconnected recommendations are excluded from role fields. Clipped or unreadable date rows prompt another overlapping view instead of adding a false role. Unreadable dated headings remain flagged drafts with required fields to complete, and clearer overlapping captures replace those placeholders. English is the default; English and Russian is also available. Images and recognized text stay in browser memory.
5. Select **Stop and review** at any time, including during recognition. This stops sharing immediately and unlocks draft review. Correct the last recognized view or discard incorrect rows as needed, then select **Review captured roles**. Existing entries are marked **Already saved**. Nothing is added until you save a reviewed entry.

**Stop and review**, **Cancel sharing** during preview, the browser's native stop control, leaving the page, successful handoff to review, a five-minute timeout, or reaching 30 different captured views ends capture and releases its tracks. Draft roles remain available in the current page for review after capture stops. Refreshing or leaving the page discards unsaved captures. Use desktop Chrome or Edge if sharing is unavailable in an embedded browser. Browser permission is required each time; the app cannot silently choose a tab or inspect its cookies/HTML.

The unsuccessful hosted-browser and direct-public-request import routes were removed. No browser worker service, extra LinkedIn login, extension, or browser-launch quota is required for tab sharing. The existing PDF/CSV import remains available. OCR can misread dates or company names, so review is required.

On **Find colleagues**, select **Import colleague from LinkedIn**, or search a profile link and select **Import LinkedIn profile** when it has no directory match. The inline importer prefills that link and offers the same shared-tab reading, preview scrolling, local OCR and editable role review as Work history. Enter the colleague’s name, review the fields and choose **Check shared work dates** or **Save private draft**. A saved LinkedIn PDF remains an alternative. The same reader is also available on **My private colleague drafts**. Closing the inline importer releases its capture. Drafts are separate from your own work history. **Request invitation** shares the colleague's name and profile link with pilot operators. An operator can open **Administration → Requests**, prepare a single-use invitation, and copy it for private sharing. A redeemed invitation remains subject to the normal onboarding and work-history checks.

On **My private colleague drafts**, choose **Edit draft** to reopen a saved draft before requesting an invitation. Correct the name, roles or dates, recheck shared work dates and choose **Save changes**. Exact saved dates and ongoing roles are preserved; the profile link stays fixed so the same record is updated. **Cancel editing** discards unsaved changes. Drafts with an invitation already requested cannot be changed.

Use **Check shared work dates** to compare reviewed colleague dates with your saved history. The product must work without installing browser extensions. The local [extension prototype](extension/README.md) is deferred; work-history tab sharing uses an explicit browser capture permission rather than LinkedIn's basic sign-in permissions. See the access investigation in [the launch plan](E-ProRate_Launch_Plan.md).

In **Administration**, operators can issue or revoke participant invitations and check aggregate onboarding, rating, and report activity. Copy a new link when it is issued and share it privately. An opening is counted once per rating when the recipient opens the Received view. Account counts cover participants with active access. Rating and report counts reflect the records currently on file. Sign-in counts begin when the activity migration is applied.

Use **Administration → Accounts** to look up a participant by name or account reference and suspend or restore access. Suspension revokes sessions, blocks sign-in, and removes the participant from the directory while keeping their existing ratings and reports. Restoration requires a fresh sign-in. Operators can review the recorded reasons and timestamps in the account's access history.

Use **Administration → Companies** to find a company by its primary name or an existing alias. Choose the primary name, enter the spelling variant, and preview the link. Confirm only when both names refer to the same employer. The link updates matching work history entries and applies to future entries under that alias.

Participants can track their moderation reports in **My ratings → My reports**. Operators can switch between open and resolved reports and see the internal decision history. Each new report preserves the feedback and eligibility evidence at the time it was filed.

## Verify changes

```sh
npm run typecheck --prefix client
npm test --prefix client
npm run build --prefix client
npm run build --prefix server
DATABASE_URL=postgresql://prorate:prorate@127.0.0.1:5432/prorate npm test --prefix server
```

Integration tests use isolated PostgreSQL schemas and a simulated LinkedIn provider. The test database role needs permission to create schemas. CI starts PostgreSQL, applies migrations, builds both packages, and runs the suite.

## Deploy on Heroku

Local development runs through Vite and the local API. Production runs on two Heroku apps with Neon PostgreSQL. The client serves the Vite build and forwards `/api/*` to the NestJS app over HTTPS. The browser uses the client origin for its session cookies and LinkedIn callback.

| Production app | GitHub deploy branch | Heroku URL | Build and release |
| --- | --- | --- | --- |
| `e-prorate-client` | `main-client` | https://e-prorate-client-001e23c9f3dd.herokuapp.com | Builds Vite and starts the client web server |
| `e-prorate-api` | `main-server` | https://e-prorate-api-0d22d646f7b1.herokuapp.com | Builds NestJS, applies migrations during release, and starts the API |

1. Set `EPRORATE_HEROKU_ROLE=client` on the client and `EPRORATE_HEROKU_ROLE=api` on the API. Set `CLIENT_APP_URL` on both apps to the client HTTPS origin without its trailing slash. Set `API_UPSTREAM_URL` on the client to the API HTTPS origin. Generate a shared 32-byte hex secret and store it as `CLIENT_PROXY_SECRET` in both apps' Config Vars.
2. Use the direct Neon endpoint. Create the `eprorate` schema as the database role that runs the API and migrations. Set `DATABASE_URL` on the API with `sslmode=verify-full` and the URL-encoded connection option `options=-c%20search_path%3Deprorate`. Set `PGSSLMODE=verify-full`, `TRUST_PROXY_HOPS=2`, `LINKEDIN_CLIENT_ID`, and `LINKEDIN_CLIENT_SECRET` on the API. Keep `server/.env.production` local and use Heroku Config Vars at runtime. [Neon connection instructions](https://neon.com/docs/connect/connect-from-any-app)
3. Set `LINKEDIN_REDIRECT_URI` on the API to `https://e-prorate-client-001e23c9f3dd.herokuapp.com/api/auth/linkedin/callback`. Register the same value in the LinkedIn Developer Portal under **Auth → Authorized redirect URLs**. Add `http://localhost:4028/api/auth/linkedin/callback` for local sign-in. Enable `heroku features:enable http-router-no-log-query --app APP_NAME` on both apps. [LinkedIn authorization-code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) · [Heroku log query redaction](https://devcenter.heroku.com/changelog-items/3646)
4. Connect both apps to the GitHub repository and enable automatic deploys for the branches above. Push the release commit to `main-server` first. Confirm the API release and `/api/health`, then push the same commit to `main-client`. Confirm `/api/health` through the client origin as well.
5. Generate private links with `heroku run --app e-prorate-api -- 'cd server && node dist/cli.js invite'`. Append `--operator` after `invite` inside the command for the operator's link. Before inviting the pilot cohort, use two test accounts to verify real LinkedIn sign-in, session persistence across an API restart, work history, overlap, anonymous ratings, reporting, moderation, and logout.

## Deploy with the container

1. Prepare an HTTPS origin and managed PostgreSQL database for each environment. Enable LinkedIn OpenID Connect and register `https://YOUR_DOMAIN/api/auth/linkedin/callback` on the corresponding LinkedIn app.
2. Build the container with `docker build --build-arg VITE_SUPPORT_EMAIL=support@example.com -t e-prorate .`. Supply the database URL, `CLIENT_APP_URL`, LinkedIn client ID and secret, and callback URL through your host's runtime secret store. Set `TRUST_PROXY_HOPS` to the actual number of trusted hops if the host restricts direct access and overwrites forwarded headers. Use the database provider's TLS connection settings. Omit query strings from proxy access logs for the LinkedIn callback.
3. Use `node dist/cli.js migrate` as the pre-deploy command from the image's server directory. Run the image behind the host's TLS endpoint with port `3000` as the default target. Configure readiness checks on `/api/health`.
4. Set up database backups, retention, alert delivery, and scheduled pruning via `node dist/cli.js prune`. Verify a backup restore in an isolated database. Keep the previous image available for rollback and assess database compatibility before rolling back a release.
5. Redeem real LinkedIn invitations with two test accounts before inviting the pilot cohort. Verify sign-in, session persistence across a restart, work history, overlap, anonymous rating, reporting, moderation, and logout.
