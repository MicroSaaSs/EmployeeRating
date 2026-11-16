# E-ProRate

E-ProRate is an invite-only pilot for private peer feedback. Participants sign in with LinkedIn, report their own work history, and can rate colleagues when their dates overlap at the same company. The public landing page explains the pilot. The React client and NestJS API share one origin, and PostgreSQL stores the pilot data.

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

## Operate the pilot

Run these commands from the repository root after building the server.

| Task | Command |
| --- | --- |
| Create a single-use participant invite | `npm run pilot:admin --prefix server -- invite` |
| Create a single-use operator invite | `npm run pilot:admin --prefix server -- invite --operator` |
| Prune expired sessions, OAuth attempts, invites, and rate-limit buckets | `npm run pilot:admin --prefix server -- prune` |
| Match a spelling variant to an existing company | `npm run pilot:admin --prefix server -- link-company-name "Company" "Company Inc."` |
| View aggregate pilot counts | `npm run pilot:admin --prefix server -- metrics` |
| Fulfill an authenticated account removal request | `npm run pilot:admin --prefix server -- remove-account <user-id>` |

Treat invite links like credentials and share each directly with its intended participant. They expire after seven days. An unused invite can grant access to anyone who obtains its link. Returning participants use the sign-in button without an invite.

After signing in, add at least one work-history entry, then select **Find eligible colleagues**. The directory can filter by name and rating eligibility. Opt into the directory to let other participants find you. An operator can open **Moderation** to review reports and attribution, hide or reinstate feedback, and pause new submissions. Ask the participant for the account reference shown on their dashboard and confirm the request before running the removal command. It permanently removes the account, sessions, work history, and ratings to or from that account.

In **Pilot operations**, operators can issue or revoke participant invitations and check aggregate onboarding, rating, and report activity. Copy a new link when it is issued and share it privately. An opening is counted once per rating when the recipient opens the Received view. Account counts cover participants with active access. Rating and report counts reflect the records currently on file. Sign-in counts begin when the activity migration is applied.

Use **Pilot operations → Accounts** to look up a participant by name or account reference and suspend or restore access. Suspension revokes sessions, blocks sign-in, and removes the participant from the directory while keeping their existing ratings and reports. Restoration requires a fresh sign-in. Operators can review the recorded reasons and timestamps in the account's access history.

Participants can track their moderation reports in **My ratings → My reports**. Operators can switch between open and resolved reports and see the internal decision history. Each new report preserves the feedback and eligibility evidence at the time it was filed.

## Verify changes

```sh
npm run typecheck --prefix client
npm run build --prefix client
npm run build --prefix server
DATABASE_URL=postgresql://prorate:prorate@127.0.0.1:5432/prorate npm test --prefix server
```

Integration tests use isolated PostgreSQL schemas and a simulated LinkedIn provider. The test database role needs permission to create schemas. CI starts PostgreSQL, applies migrations, builds both packages, and runs the suite.

## Deploy on Heroku

Local development runs through Vite and the local API. Production runs on two Heroku apps with Neon PostgreSQL. The client serves the Vite build and forwards `/api/*` to the NestJS app over HTTPS. The browser uses the client origin for its session cookies and LinkedIn callback.

| Production app | Heroku URL | Build and release |
| --- | --- | --- |
| `e-prorate-client` | https://e-prorate-client-001e23c9f3dd.herokuapp.com | Builds Vite and starts the client web server |
| `e-prorate-api` | https://e-prorate-api-0d22d646f7b1.herokuapp.com | Builds NestJS, applies migrations during release, and starts the API |

1. Set `EPRORATE_HEROKU_ROLE=client` on the client and `EPRORATE_HEROKU_ROLE=api` on the API. Set `CLIENT_APP_URL` on both apps to the client HTTPS origin without its trailing slash. Set `API_UPSTREAM_URL` on the client to the API HTTPS origin. Generate a shared 32-byte hex secret and store it as `CLIENT_PROXY_SECRET` in both apps' Config Vars.
2. On the API, set `DATABASE_URL` to the Neon connection string with `sslmode=verify-full`, `PGSSLMODE=verify-full`, `TRUST_PROXY_HOPS=2`, and `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` to the LinkedIn app's credentials. The database role needs permission to create migration tables. Keep `server/.env.production` local and use Heroku Config Vars at runtime. [Neon connection instructions](https://neon.com/docs/connect/connect-from-any-app)
3. Set `LINKEDIN_REDIRECT_URI` on the API to `https://e-prorate-client-001e23c9f3dd.herokuapp.com/api/auth/linkedin/callback`. Register the same value in the LinkedIn Developer Portal under **Auth → Authorized redirect URLs**. Add `http://localhost:4028/api/auth/linkedin/callback` for local sign-in. Enable `heroku features:enable http-router-no-log-query --app APP_NAME` on both apps. [LinkedIn authorization-code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) · [Heroku log query redaction](https://devcenter.heroku.com/changelog-items/3646)
4. Deploy the same committed source to the API first, then the client, using `git push https://git.heroku.com/APP_NAME.git HEAD:main`. Verify the API release migrations and confirm `/api/health` returns `{"status":"ok"}` on both origins.
5. Generate private links with `heroku run --app e-prorate-api -- 'cd server && node dist/cli.js invite'`. Append `--operator` after `invite` inside the command for the operator's link. Before inviting the pilot cohort, use two test accounts to verify real LinkedIn sign-in, session persistence across an API restart, work history, overlap, anonymous ratings, reporting, moderation, and logout.

## Deploy with the container

1. Prepare an HTTPS origin and managed PostgreSQL database for each environment. Enable LinkedIn OpenID Connect and register `https://YOUR_DOMAIN/api/auth/linkedin/callback` on the corresponding LinkedIn app.
2. Build the container with `docker build --build-arg VITE_SUPPORT_EMAIL=pilot@example.com -t e-prorate .`. Supply the database URL, `CLIENT_APP_URL`, LinkedIn client ID and secret, and callback URL through your host's runtime secret store. Set `TRUST_PROXY_HOPS` to the actual number of trusted hops if the host restricts direct access and overwrites forwarded headers. Use the database provider's TLS connection settings. Omit query strings from proxy access logs for the LinkedIn callback.
3. Use `node dist/cli.js migrate` as the pre-deploy command from the image's server directory. Run the image behind the host's TLS endpoint with port `3000` as the default target. Configure readiness checks on `/api/health`.
4. Set up database backups, retention, alert delivery, and scheduled pruning via `node dist/cli.js prune`. Verify a backup restore in an isolated database. Keep the previous image available for rollback and assess database compatibility before rolling back a release.
5. Redeem real LinkedIn invitations with two test accounts before inviting the pilot cohort. Verify sign-in, session persistence across a restart, work history, overlap, anonymous rating, reporting, moderation, and logout.
