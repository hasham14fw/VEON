# HORIZON 1440 — self-hosting export

This ZIP contains the branded HORIZON 1440 application source, local fonts and logos, reference PDFs, database migrations and a Cloudflare Workers deployment configuration. Exported 28 September 2026 from source revision 1a24912663345e5cda6479770d835bbacf993bf8, with the independent-hosting adaptations described below.

## Hosting requirements

Use **Cloudflare Workers + D1**, not a static-only web host, ordinary cPanel file upload, or Cloudflare Pages static hosting. The application needs server APIs and persistent SQL storage. Hosting costs depend on your Cloudflare plan and usage. Node.js >=22.13 and pnpm 11.25 are required to build. Dependencies are pinned in pnpm-lock.yaml; preserve this file.

## Set up and publish

1. Extract this ZIP. Open a terminal in the HORIZON-1440 folder.
2. Install Node.js and pnpm, then run:

   ```sh
   npm install -g pnpm@11.25.0
   pnpm install --frozen-lockfile
   pnpm exec wrangler login
   pnpm exec wrangler d1 create horizon-1440-db
   ```
3. Copy the returned database_id into `wrangler.jsonc`, replacing the all-zero placeholder. Keep the binding name `DB`. You may change the Worker name and database name; use matching names in subsequent commands.
4. Create the database tables and build:

   ```sh
   pnpm db:remote
   pnpm typecheck
   pnpm test
   pnpm build
   ```
5. Set the login credentials as secrets. Use printable ASCII characters, a username without a colon, and a long random unique password. Do not place passwords in the source or frontend files. Run these commands and enter the values at the prompts:

   ```sh
   pnpm exec wrangler secret put HORIZON_USERNAME --config wrangler.jsonc
   pnpm exec wrangler secret put HORIZON_PASSWORD --config wrangler.jsonc
   pnpm deploy
   ```

   Wrangler may offer to create the Worker when setting the first secret. Accept that, then set both secrets before deploying the application. If necessary, deploy once to create it, set both secrets, and deploy again; the application returns 503 until both secrets exist.
6. Open the HTTPS workers.dev URL printed by Wrangler. Your browser prompts for the username and password. To use your own domain, add a Custom Domain to this Worker in the Cloudflare dashboard (Workers & Pages > HORIZON 1440 > Settings > Domains & Routes). Use HTTPS.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and replace the sample password. Then:

```sh
pnpm db:local
pnpm dev
```

For testing the built production worker locally, run `pnpm build` then `pnpm preview`. Development tooling may handle assets differently; check authentication on the built worker before going online. Local D1 data is separate from the remote database.

## Access and data

The independent export replaces ChatGPT-specific authentication with HTTP Basic authentication at the Worker entrypoint and API layer. All requests, including static assets and reference PDFs, pass through the Worker first. Missing secrets deny access. This is a single-owner workspace with one shared login, not individual user accounts or SSO. Browser-managed Basic authentication has no application logout button; close the browser session to clear cached credentials. For team use, implement individual identities and roles before sharing credentials.

Your existing hosted Site is unchanged. This export creates a **new empty database**: it does not contain saved production situations, audit records, local testing records, passwords, API tokens or database backups. Illustrative example cases are included as application fixtures. Migrate any required existing records separately through a controlled database export/import.

## Current functionality and limits

Includes the five markets and Global Situations, scenario matrices, assessment and evidence workflows, market-instrument configuration, board briefs, VEON branding and the moon display. Market feeds are not activated merely by deploying this ZIP. Live providers, subscriptions, scheduler ingestion and notifications still require integration; see `docs/IMPLEMENTATION.md`. The moon feature includes cached 2026–2027 data and requires maintenance beyond its supported coverage.

`docs/BRAND-IMPLEMENTATION.md` records the supplied brand specifications. Font licenses are included. VEON artwork and uploaded reference reports are included for this authorized project; this export grants no wider redistribution rights. Third-party dependencies retain their respective licenses.

## Deployment references

- https://developers.cloudflare.com/workers/vite-plugin/get-started/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/d1/reference/migrations/

Use the bundled, tested dependency versions: current framework documentation may describe a newer deployment path. No external deployment has been performed on your behalf.
