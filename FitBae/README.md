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

## Profile pictures

Preferences includes eight built-in avatars, initials, the original Google profile picture (when available), and JPEG/PNG/WebP uploads. Uploaded photos are cropped, resized to 512 × 512, and re-encoded as JPEG in the browser before upload; original image metadata is not retained. The selected choice is saved in auth user metadata and appears in the account menu and profile.

Apply `supabase/migrations/202609080001_profile_avatars.sql` to enable photo uploads and partner avatars. It creates the private `avatar-photos` bucket, owner upload/delete policies, owner/accepted-partner read access, and a function that returns only a connected partner's avatar choice. It also prevents pre-accepted invitations, self-acceptance, and changing the participants of an accepted connection. Existing accepted relationships are left intact.

Images are displayed through five-minute signed URLs. Disconnecting blocks new reads immediately, but an already issued URL can remain usable until it expires. Built-in avatar selection works without this migration, but uploads do not. Replaced photos are removed only after the new choice is saved; a failed metadata save attempts to clean up the new upload. Review any pre-existing storage policies before deployment, since permissive policies can grant broader access.

## Data and security

The included migration creates the expected tables, ownership policies, privacy-limited partner functions, and an idempotent transaction for saving a workout with all of its set logs. Apply it before testing partner discovery or deploying. Existing installs should review it against their current schema before running it in production.

Do not commit `.env`, service-role keys, database passwords, or a production Gemini key. The root `.gitignore` excludes the legacy plaintext password filename found during the audit; move any real credential to a secret manager and rotate it if it was ever exposed.
