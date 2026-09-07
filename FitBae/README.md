# FitBae web app

A responsive workout app designed for romantic partners. Each person keeps an individual plan and detailed set history while sharing encouragement and high-level weekly momentum.

## Highlights

- Validated seven-day workout generation with server-side Gemini credentials
- Equipment-aware exercise catalog and one-movement substitution
- Clear form sequences, coaching cues, mistakes, and external demonstration search
- Refresh-safe active workout drafts with honest rep, time, distance, load, and volume tracking
- Couple connection, notes, encouragement, and weekly progress summaries
- Accessible light/dark themes and route-level code splitting

## Local setup

1. Copy `.env.example` to `.env`.
2. Add the Supabase URL and anonymous key.
3. Apply `supabase/migrations/202609060001_core_schema_and_rls.sql` in the Supabase SQL editor, or run `supabase db push` from a linked project.
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
npm run build
# or both
npm run check
```

Tests cover goal normalization, privacy-safe generation context, plan validation, stable identifiers, exercise substitution, equipment filtering, and timed/distance prescriptions.

## Data and security

The included migration creates the expected tables, ownership policies, privacy-limited partner functions, and an idempotent transaction for saving a workout with all of its set logs. Apply it before testing partner discovery or deploying. Existing installs should review it against their current schema before running it in production.

Do not commit `.env`, service-role keys, database passwords, or a production Gemini key. The root `.gitignore` excludes the legacy plaintext password filename found during the audit; move any real credential to a secret manager and rotate it if it was ever exposed.
