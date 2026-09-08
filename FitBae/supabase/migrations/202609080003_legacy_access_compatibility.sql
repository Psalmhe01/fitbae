begin;
set local lock_timeout = '5s';

-- Existing installations used descriptive equipment text. Keep that original
-- column untouched; new sessions use the catalog identifier alongside it.
alter table public.exercise_logs add column if not exists equipment_id text;

-- Permissive RLS policies are ORed together. Merely adding the core policies
-- would leave the old all-profile read and message-forgery paths open.
-- Only replace the exact legacy policies inspected in the existing app.
do $$
declare required record;
begin
  for required in select * from (values
    ('profiles', 'profiles_own_select'), ('profiles', 'profiles_own_insert'),
    ('profiles', 'profiles_own_update'), ('profiles', 'profiles_own_delete'),
    ('workout_plans', 'workout_plans_own_all'), ('workout_sessions', 'workout_sessions_own_all'),
    ('exercise_logs', 'exercise_logs_own_all'),
    ('partnerships', 'partnerships_involved_select'), ('partnerships', 'partnerships_request'),
    ('partnerships', 'partnerships_involved_update'), ('partnerships', 'partnerships_involved_delete'),
    ('partner_notes', 'partner_notes_involved_select'), ('partner_notes', 'partner_notes_author_insert'),
    ('partner_notes', 'partner_notes_recipient_update'),
    ('partner_reactions', 'partner_reactions_involved_select'), ('partner_reactions', 'partner_reactions_sender_insert'),
    ('partner_reactions', 'partner_reactions_recipient_update')
  ) as expected(table_name, policy_name)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = required.table_name and policyname = required.policy_name) then
      raise exception 'Apply the core migration before replacing legacy access policies.';
    end if;
  end loop;
end;
$$;

drop policy if exists "Profiles are searchable by authenticated users" on public.profiles;
drop policy if exists "Users can manage their own profile" on public.profiles;
drop policy if exists "Users can manage their own plans" on public.workout_plans;
drop policy if exists "Users manage their own sessions" on public.workout_sessions;
drop policy if exists "Users manage their own exercise logs" on public.exercise_logs;
drop policy if exists "Users can manage their own partnerships" on public.partnerships;
drop policy if exists "Users can manage their own notes" on public.partner_notes;
drop policy if exists "Users can manage their own reactions" on public.partner_reactions;

-- Covers additional legacy columns too (for example pinned and session links).
create or replace function public.guard_partner_note_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if (to_jsonb(new) - 'seen') is distinct from (to_jsonb(old) - 'seen') then
    raise exception 'Only the read receipt may be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_partner_reaction_read_receipt on public.partner_reactions;
create trigger enforce_partner_reaction_read_receipt before update on public.partner_reactions
for each row execute function public.guard_partner_note_update();

-- Owner-only logs must also point at that owner's session. A caller cannot
-- attach their own row to another person's workout by knowing its UUID.
create or replace function public.guard_exercise_log_session_owner()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and (new.user_id is distinct from auth.uid() or not exists (
    select 1 from public.workout_sessions s where s.id = new.session_id and s.user_id = auth.uid()
  )) then
    raise exception 'Exercise logs must belong to your own workout session.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_exercise_log_session_owner on public.exercise_logs;
create trigger enforce_exercise_log_session_owner before insert or update on public.exercise_logs
for each row execute function public.guard_exercise_log_session_owner();

notify pgrst, 'reload schema';
commit;
