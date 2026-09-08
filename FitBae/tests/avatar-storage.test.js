import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const owner = "11111111-1111-4111-8111-111111111111";
const partner = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";
const picture = `${owner}/avatar-test.jpg`;
let db;

before(async () => {
  db = new PGlite();
  // Emulate Supabase's managed schemas and JWT identity locally. All app tables,
  // policies, functions and triggers below come from the actual migrations.
  await db.exec(`
    create role authenticated;
    create role anon;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated, anon;
  `);
  const core = await readFile(new URL("../supabase/migrations/202609060001_core_schema_and_rls.sql", import.meta.url), "utf8");
  // gen_random_uuid is native to PostgreSQL; this harness needs no pgcrypto.
  await db.exec(core.replace("create extension if not exists pgcrypto;", ""));
  // Reproduce the inspected legacy installation before applying the core again.
  await db.exec(`alter table public.exercise_logs drop column equipment_id, drop column actual_value, drop column actual_unit;
    alter table public.exercise_logs add column equipment text;
    alter table public.partner_notes add column pinned boolean default false;
    create policy "Profiles are searchable by authenticated users" on public.profiles for select to authenticated using (true);
    create policy "Users can manage their own notes" on public.partner_notes for all using (auth.uid() in (author_id, recipient_id));
    create policy "Users can manage their own reactions" on public.partner_reactions for all using (auth.uid() in (sender_id, recipient_id));`);
  await db.exec(core.replace("create extension if not exists pgcrypto;", ""));
  await db.exec(await readFile(new URL("../supabase/migrations/202609080001_profile_avatars.sql", import.meta.url), "utf8"));
  await db.exec("set timezone = 'UTC'; alter table public.partner_notes alter column created_at type timestamp without time zone using created_at at time zone 'UTC'");
  await db.exec(await readFile(new URL("../supabase/migrations/202609080002_training_and_chat.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609080003_legacy_access_compatibility.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202609080004_partner_message_scope.sql", import.meta.url), "utf8"));
  await db.exec("grant select, insert, update, delete on all tables in schema public to authenticated");
  for (const id of [owner, partner, stranger]) {
    await db.query("insert into auth.users (id, raw_user_meta_data) values ($1, $2)", [id, { fitbae_avatar: { type: "upload", path: `${id}/avatar-test.jpg` }, private_test_field: "not shared" }]);
  }
});

beforeEach(async () => {
  await db.exec("reset role; truncate storage.objects, public.partnerships, public.partner_notes, public.partner_reactions, public.workout_sessions, public.exercise_logs, public.profiles");
  await asUser(owner);
  await db.query("insert into storage.objects (bucket_id, name) values ('avatar-photos', $1)", [picture]);
});

after(async () => { await db?.close(); });

async function asUser(userId, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec(role === "anon" ? "set role anon" : "set role authenticated");
}

async function invite() {
  await asUser(owner);
  const { rows } = await db.query("insert into public.partnerships (requester_id, recipient_id) values ($1, $2) returning id", [owner, partner]);
  return rows[0].id;
}

test("avatar objects are owner-only before consent and cannot be overwritten by another user", async () => {
  assert.equal((await db.query("select * from storage.objects")).rows.length, 1);
  await asUser(stranger);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await assert.rejects(db.query("insert into storage.objects (bucket_id, name) values ('avatar-photos', $1)", [picture]), /row-level security/);
  assert.equal((await db.query("delete from storage.objects returning id")).rows.length, 0);
  assert.equal((await db.query("update storage.objects set name = 'changed' returning id")).rows.length, 0);
  assert.equal((await db.query("select public.get_partner_avatar($1) as avatar", [owner])).rows[0].avatar, null);
});

test("only the invited partner can accept, then read but not delete their partner's photo", async () => {
  const id = await invite();
  await assert.rejects(db.query("update public.partnerships set status = 'accepted' where id = $1", [id]), /Only the invited partner/);
  await asUser(partner);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await db.query("update public.partnerships set status = 'accepted' where id = $1", [id]);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 1);
  assert.deepEqual((await db.query("select public.get_partner_avatar($1) as avatar", [owner])).rows[0].avatar, { type: "upload", path: picture });
  assert.equal((await db.query("delete from storage.objects returning id")).rows.length, 0);
  await db.query("delete from public.partnerships where id = $1", [id]);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  assert.equal((await db.query("select public.get_partner_avatar($1) as avatar", [owner])).rows[0].avatar, null);
});

test("pre-accepted invitations and participant changes cannot bypass partner consent", async () => {
  await assert.rejects(db.query("insert into public.partnerships (requester_id, recipient_id, status) values ($1, $2, 'accepted')", [owner, partner]), /must be pending/);
  const id = await invite();
  await asUser(partner);
  await assert.rejects(db.query("update public.partnerships set requester_id = $1, status = 'accepted' where id = $2", [stranger, id]), /Only the invited partner/);
  await db.query("update public.partnerships set status = 'accepted' where id = $1", [id]);
  await asUser(owner);
  await assert.rejects(db.query("update public.partnerships set recipient_id = $1 where id = $2", [stranger, id]), /Only the invited partner/);
});

test("declined invitations can be re-sent but require consent again", async () => {
  const id = await invite();
  await asUser(partner);
  await db.query("update public.partnerships set status = 'declined' where id = $1", [id]);
  await db.query("update public.partnerships set status = 'pending', requester_id = $1, recipient_id = $2 where id = $3", [partner, owner, id]);
  await assert.rejects(db.query("update public.partnerships set status = 'accepted' where id = $1", [id]), /Only the invited partner/);
  await asUser(owner);
  await db.query("update public.partnerships set status = 'accepted' where id = $1", [id]);
});

test("anonymous clients cannot read files or call the partner avatar function", async () => {
  await asUser("", "anon");
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await assert.rejects(db.query("select public.get_partner_avatar($1)", [owner]), /permission denied/);
});

test("chat timestamps have offsets and recipients can acknowledge but not rewrite a message", async () => {
  const id = await invite();
  await asUser(partner);
  await db.query("update public.partnerships set status = 'accepted' where id = $1", [id]);
  await asUser(owner);
  const { rows } = await db.query("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $2, 'Original note') returning id", [owner, partner]);
  await asUser(partner);
  await db.query("update public.partner_notes set seen = true where id = $1", [rows[0].id]);
  await assert.rejects(db.query("update public.partner_notes set content = 'Forged' where id = $1", [rows[0].id]), /Only the read receipt/);
  const type = await db.query("select data_type from information_schema.columns where table_schema = 'public' and table_name = 'partner_notes' and column_name = 'created_at'");
  assert.equal(type.rows[0].data_type, "timestamp with time zone");
});

test("workout saves are idempotent and preserve non-rep units and notes", async () => {
  const save = "select public.finalize_workout($1::jsonb, $2::jsonb, $3::uuid) as id";
  const payload = { duration_seconds: 300, notes: "Keep this note", finished_at: "2026-09-08T18:30:00Z" };
  const logs = [{ exercise_name: "Plank", set_number: 1, actual_reps: 0, actual_value: 45, actual_unit: "seconds", skipped: false }];
  const key = "44444444-4444-4444-8444-444444444444";
  const first = await db.query(save, [payload, logs, key]);
  const retry = await db.query(save, [payload, logs, key]);
  assert.equal(first.rows[0].id, retry.rows[0].id);
  assert.equal((await db.query("select * from public.workout_sessions")).rows.length, 1);
  const result = await db.query("select actual_value::text, actual_unit, actual_reps from public.exercise_logs");
  assert.deepEqual(result.rows, [{ actual_value: "45", actual_unit: "seconds", actual_reps: 0 }]);
  assert.equal((await db.query("select notes from public.workout_sessions")).rows[0].notes, "Keep this note");
  await asUser(stranger);
  assert.equal((await db.query("select * from public.workout_sessions")).rows.length, 0);
  assert.equal((await db.query("select * from public.exercise_logs")).rows.length, 0);
});

test("an invalid later set rolls back the entire workout transaction", async () => {
  const logs = [{ exercise_name: "Squat", set_number: 1, actual_reps: 8 }, { exercise_name: "Squat", set_number: 2, actual_reps: "invalid" }];
  await assert.rejects(db.query("select public.finalize_workout($1::jsonb, $2::jsonb, $3::uuid)", [{ duration_seconds: 300 }, logs, "55555555-5555-4555-8555-555555555555"]), /invalid input syntax/);
  assert.equal((await db.query("select * from public.workout_sessions")).rows.length, 0);
  assert.equal((await db.query("select * from public.exercise_logs")).rows.length, 0);
});

test("legacy policies no longer expose full profiles or allow forged messages", async () => {
  await db.query("insert into public.profiles (user_id, name, email, fitness_goal, gym_frequency, workout_duration, experience_level, weight) values ($1, 'Test Owner', 'owner@example.test', 'strength', 3, 45, 'beginner', 150)", [owner]);
  await asUser(stranger);
  assert.equal((await db.query("select * from public.profiles")).rows.length, 0);
  // Name/ID lookup remains available without disclosing body measurements.
  assert.deepEqual((await db.query("select * from public.find_partner_by_email('owner@example.test')")).rows, [{ user_id: owner, name: "Test Owner" }]);
  await assert.rejects(db.query("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $2, 'Forged')", [owner, stranger]), /row-level security/);
  await assert.rejects(db.query("insert into public.partner_reactions (sender_id, recipient_id) values ($1, $2)", [owner, stranger]), /row-level security/);
});

test("a recipient cannot edit encouragement or legacy note fields", async () => {
  const id = await invite();
  await asUser(partner);
  await db.query("update public.partnerships set status = 'accepted' where id = $1", [id]);
  await asUser(owner);
  const reaction = await db.query("insert into public.partner_reactions (sender_id, recipient_id, message) values ($1, $2, 'You can do it') returning id", [owner, partner]);
  const note = await db.query("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $2, 'Hello') returning id", [owner, partner]);
  await asUser(partner);
  await db.query("update public.partner_reactions set seen = true where id = $1", [reaction.rows[0].id]);
  await assert.rejects(db.query("update public.partner_reactions set message = 'Changed' where id = $1", [reaction.rows[0].id]), /Only the read receipt/);
  await assert.rejects(db.query("update public.partner_notes set pinned = true where id = $1", [note.rows[0].id]), /Only the read receipt/);
});

test("a set cannot be attached to someone else's workout", async () => {
  const session = await db.query("insert into public.workout_sessions (user_id) values ($1) returning id", [owner]);
  await asUser(stranger);
  await assert.rejects(db.query("insert into public.exercise_logs (session_id, user_id, exercise_name, set_number) values ($1, $2, 'Squat', 1)", [session.rows[0].id, stranger]), /must belong to your own/);
});

test("both partners can send messages and encouragement, but never to unrelated recipients", async () => {
  const id = await invite();
  await asUser(partner);
  await db.query("update public.partnerships set status = 'accepted' where id = $1", [id]);
  for (const [sender, recipient] of [[owner, partner], [partner, owner]]) {
    await asUser(sender);
    await db.query("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $2, 'Hello partner')", [sender, recipient]);
    await db.query("insert into public.partner_reactions (sender_id, recipient_id) values ($1, $2)", [sender, recipient]);
    await assert.rejects(db.query("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $2, 'Wrong recipient')", [sender, stranger]), /row-level security/);
    await assert.rejects(db.query("insert into public.partner_reactions (sender_id, recipient_id) values ($1, $2)", [sender, stranger]), /row-level security/);
  }
});
