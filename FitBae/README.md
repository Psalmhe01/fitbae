# FitBae web app

A responsive workout app designed for romantic partners. Each person keeps an individual plan and detailed set history while sharing encouragement and high-level weekly momentum.

## Highlights

- Validated seven-day workout generation with server-side Gemini credentials
- Equipment-aware exercise catalog and one-movement substitution
- Clear form sequences, coaching cues, mistakes, and external demonstration search
- Refresh-safe active workout drafts with honest rep, time, distance, load, and volume tracking
- Couple connection, notes, encouragement, and weekly progress summaries
- Accessible light/dark themes and route-level code splitting
- Built-in profile avatars and private, cropped photo uploads
- Recoverable page errors and reload-persistent plan day selection
- Email/password sign-in, registration, and password recovery alongside Google
- Chat with explicit time zones, read receipts, retained drafts, retry, and older-message loading
- Exercise library with equipment filters and private device favorites
- Previous-session weights, adjustable set counts, paginated history, best sets, and CSV export

## Local setup

1. Copy `.env.example` to `.env`.
2. Add the Supabase URL and anonymous key.
3. Apply the files in `supabase/migrations/` in date order using the Supabase SQL editor, or run `supabase db push` from a linked project. Existing installations that already applied the core schema only need the new migrations.
4. For local-only plan generation, either run through a platform that serves `api/generate-plan.js`, or explicitly set the development fallback described in `.env.example`.
5. Install and run:

```bash
npm install
npm run dev
```

The browser fallback exposes its Gemini key and is intentionally disabled for production. Deployed environments should set `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` as server variables.

## Verification

```bash
npm test
npm run lint
npm run build
# or all three
npm run check
npm run test:e2e
```

Unit tests cover goal normalization, privacy-safe generation context, plan validation, stable identifiers, exercise substitution, equipment filtering, timed/distance prescriptions, and avatar validation/cropping. Local PostgreSQL tests apply the migrations using PGlite with emulated Supabase-managed schemas and check partner consent, ownership, anonymous access, and disconnect revocation. ESLint catches undefined JSX components that a Vite build alone does not catch.

Browser tests use locally installed Chrome and a mocked Supabase backend; they never sign in to or modify a live account. They cover Plan rendering, load recovery, swaps/undo, mobile layout, avatar persistence, photo uploads and failures, and workout draft recovery. Set `PLAYWRIGHT_CHANNEL` to `msedge` to use installed Edge instead. Failure screenshots and traces are saved in `test-results/`.

The expanded suite also checks email sign-in/recovery, chat ordering and time zones, failed-send retry, previous weights, workout-save failures, library favorites, and history export. A successful build does not prove the live database has the required functions: run the backend verification separately before deploying.

## Email accounts and recovery

Sign in at `/auth`, or register at `/auth?mode=signup`. Keep both Email and Google enabled in Supabase Auth. Add your deployed origin's `/dashboard` and `/auth?mode=reset` URLs to Supabase's allowed redirect URLs, and configure production email delivery before relying on confirmation/reset messages. No admin key is used by browser authentication.

The requested QA profiles are `adminboo@fitbae.test` (AdminBoo) and `adminbabe@fitbae.test` (AdminBabe). Their unique passwords are in the Git-ignored `.env.test-accounts.local`. Use the email addresses to sign in. These are ordinary, pre-confirmed test users with sample plans, not administrators. The `.test` addresses cannot receive password-reset mail. Keep them separate from real personal data.

`scripts/seed-test-accounts.mjs --create` creates only missing marked QA accounts and sample profiles/plans; it never resets an existing password. It requires a server-only service-role/secret key and both test-password variables. `scripts/verify-backend.mjs` checks those logins and the required schema without printing secrets. On this Windows setup, use `node --use-system-ca scripts/verify-backend.mjs` to include the system HTTPS trust store.

## Backend rollout and time zones

The core migration is required even when the original tables already exist: it adds typed exercise values, atomic/idempotent workout saving, and partner functions. Workout saving deliberately retains the draft and reports a setup error if the RPC is absent; it does not fall back to partial writes that could lose time/distance units.

Apply all five migrations in date order after reviewing the existing schema and policies. Run `node --use-system-ca scripts/database.mjs --inspect` to review the schema, then `--apply-all` to apply the complete rollout in one transaction. Individual flags are `--apply-core`, `--apply-avatars`, `--apply-training`, `--apply-compatibility`, and `--apply-message-scope`. The helper uses `SUPABASE_DB_URL` from `.env`, verifies the project identity, trusts the bundled official Supabase CA only for this database connection, and keeps TLS/hostname verification enabled. A failure rolls back the requested rollout. A `28P01` response means database authentication was rejected, not that an application's user password is wrong. Remove the square brackets from Supabase's `[YOUR-PASSWORD]` placeholder when entering a real password.

`202609080002_training_and_chat.sql` converts legacy UTC timestamps to `timestamptz`, protects message read receipts from content edits, and adds indexes/realtime publication support. It refuses to guess on a non-UTC database. It does not blindly shift historical messages by five hours. Preferences lets each user select a display zone; automatic uses the device zone. Training schedules still follow the device's local calendar day.

The legacy compatibility migration retains old equipment descriptions, adds the missing catalog-ID column, replaces specifically identified broad legacy policies, and protects set ownership and read receipts. The message-scope migration explicitly qualifies outer recipient columns so both partners can send to each other, but not to unrelated people. Full profiles are owner-only; partner lookup returns only a name and ID.

Deployment checkpoint (September 8, 2026): all five migrations were applied to the live project. The six existing workouts and 36 set logs were retained. Both QA email/password logins and the required REST functions/columns were verified. `node --use-system-ca scripts/database.mjs --verify-behavior` tests workout saves/retries, time units, two-way chat and privacy as the marked QA users; all its test writes are rolled back. `node --use-system-ca scripts/verify-backend.mjs --storage-smoke` additionally uploads and removes one uniquely named QA image without changing anyone's chosen avatar. A Git push alone never applies SQL migrations to another project.

## Profile pictures

Preferences includes eight built-in avatars, initials, the original Google profile picture (when available), and JPEG/PNG/WebP uploads. Uploaded photos are cropped, resized to 512 × 512, and re-encoded as JPEG in the browser before upload; original image metadata is not retained. The selected choice is saved in auth user metadata and appears in the account menu and profile.

Apply `supabase/migrations/202609080001_profile_avatars.sql` to enable photo uploads and partner avatars. It creates the private `avatar-photos` bucket, owner upload/delete policies, owner/accepted-partner read access, and a function that returns only a connected partner's avatar choice. It also prevents pre-accepted invitations, self-acceptance, and changing the participants of an accepted connection. Existing accepted relationships are left intact.

Images are displayed through five-minute signed URLs. Disconnecting blocks new reads immediately, but an already issued URL can remain usable until it expires. Built-in avatar selection works without this migration, but uploads do not. Replaced photos are removed only after the new choice is saved; a failed metadata save attempts to clean up the new upload. Review any pre-existing storage policies before deployment, since permissive policies can grant broader access.

## Data and security

The included migration creates the expected tables, ownership policies, privacy-limited partner functions, and an idempotent transaction for saving a workout with all of its set logs. Apply it before testing partner discovery or deploying. Existing installs should review it against their current schema before running it in production.

Do not commit `.env`, service-role keys, database passwords, or a production Gemini key. The root `.gitignore` excludes the legacy plaintext password filename found during the audit; move any real credential to a secret manager and rotate it if it was ever exposed.
