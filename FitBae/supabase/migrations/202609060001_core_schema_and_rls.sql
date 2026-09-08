create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  age integer,
  weight numeric,
  weight_unit text default 'lbs',
  height_cm numeric,
  sex text,
  fitness_goal text not null,
  equipment text[] not null default '{}',
  gym_frequency integer not null check (gym_frequency between 1 and 6),
  workout_duration integer not null check (workout_duration between 20 and 120),
  experience_level text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_json jsonb not null,
  fitness_goal text,
  experience_level text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.workout_plans(id) on delete set null,
  idempotency_key uuid,
  day text,
  workout_type text,
  focus text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'completed',
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.workout_sessions
  add column if not exists idempotency_key uuid;

create unique index if not exists workout_sessions_user_idempotency_idx
  on public.workout_sessions (user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists workout_plans_user_created_idx
  on public.workout_plans (user_id, created_at desc);
create index if not exists workout_sessions_user_finished_idx
  on public.workout_sessions (user_id, finished_at desc);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  equipment_id text,
  set_number integer not null check (set_number > 0),
  planned_reps text,
  actual_reps integer not null default 0 check (actual_reps >= 0),
  actual_value numeric not null default 0 check (actual_value >= 0),
  actual_unit text not null default 'reps',
  weight_lbs numeric not null default 0 check (weight_lbs >= 0),
  rest_seconds integer not null default 0 check (rest_seconds >= 0),
  skipped boolean not null default false,
  completed_at timestamptz not null default now()
);

alter table public.exercise_logs
  add column if not exists equipment_id text,
  add column if not exists actual_value numeric not null default 0,
  add column if not exists actual_unit text not null default 'reps';

update public.exercise_logs
set actual_value = actual_reps
where actual_unit = 'reps' and actual_value = 0 and actual_reps > 0;

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create unique index if not exists partnerships_pair_idx
  on public.partnerships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists partnerships_requester_status_idx
  on public.partnerships (requester_id, status, created_at desc);
create index if not exists partnerships_recipient_status_idx
  on public.partnerships (recipient_id, status, created_at desc);

create table if not exists public.partner_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_reactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'heart',
  message text,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_session_set_idx
  on public.exercise_logs (session_id, set_number);
create index if not exists partner_notes_recipient_created_idx
  on public.partner_notes (recipient_id, created_at desc);
create index if not exists partner_reactions_recipient_seen_idx
  on public.partner_reactions (recipient_id, seen, created_at desc);

alter table public.profiles enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.partnerships enable row level security;
alter table public.partner_notes enable row level security;
alter table public.partner_reactions enable row level security;

drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles for select
  using (auth.uid() = user_id);
drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles for insert
  with check (auth.uid() = user_id);
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists profiles_own_delete on public.profiles;
create policy profiles_own_delete on public.profiles for delete
  using (auth.uid() = user_id);

drop policy if exists workout_plans_own_all on public.workout_plans;
create policy workout_plans_own_all on public.workout_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists workout_sessions_own_all on public.workout_sessions;
create policy workout_sessions_own_all on public.workout_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists exercise_logs_own_all on public.exercise_logs;
create policy exercise_logs_own_all on public.exercise_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists partnerships_involved_select on public.partnerships;
create policy partnerships_involved_select on public.partnerships for select
  using (auth.uid() in (requester_id, recipient_id));
drop policy if exists partnerships_request on public.partnerships;
create policy partnerships_request on public.partnerships for insert
  with check (auth.uid() = requester_id and requester_id <> recipient_id);
drop policy if exists partnerships_involved_update on public.partnerships;
create policy partnerships_involved_update on public.partnerships for update
  using (auth.uid() in (requester_id, recipient_id))
  with check (auth.uid() in (requester_id, recipient_id));
drop policy if exists partnerships_involved_delete on public.partnerships;
create policy partnerships_involved_delete on public.partnerships for delete
  using (auth.uid() in (requester_id, recipient_id));

drop policy if exists partner_notes_involved_select on public.partner_notes;
create policy partner_notes_involved_select on public.partner_notes for select
  using (auth.uid() in (author_id, recipient_id));
drop policy if exists partner_notes_author_insert on public.partner_notes;
create policy partner_notes_author_insert on public.partner_notes for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.partnerships p
      where p.status = 'accepted'
        and ((p.requester_id = partner_notes.author_id and p.recipient_id = partner_notes.recipient_id)
          or (p.requester_id = partner_notes.recipient_id and p.recipient_id = partner_notes.author_id))
    )
  );
drop policy if exists partner_notes_recipient_update on public.partner_notes;
create policy partner_notes_recipient_update on public.partner_notes for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

drop policy if exists partner_reactions_involved_select on public.partner_reactions;
create policy partner_reactions_involved_select on public.partner_reactions for select
  using (auth.uid() in (sender_id, recipient_id));
drop policy if exists partner_reactions_sender_insert on public.partner_reactions;
create policy partner_reactions_sender_insert on public.partner_reactions for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.partnerships p
      where p.status = 'accepted'
        and ((p.requester_id = partner_reactions.sender_id and p.recipient_id = partner_reactions.recipient_id)
          or (p.requester_id = partner_reactions.recipient_id and p.recipient_id = partner_reactions.sender_id))
    )
  );
drop policy if exists partner_reactions_recipient_update on public.partner_reactions;
create policy partner_reactions_recipient_update on public.partner_reactions for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create or replace function public.find_partner_by_email(lookup_email text)
returns table (user_id uuid, name text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select p.user_id, p.name
  from public.profiles p
  where auth.uid() is not null
    and p.user_id <> auth.uid()
    and lower(p.email) = lower(trim(lookup_email))
  limit 1;
$$;

create or replace function public.get_connected_partner()
returns table (user_id uuid, name text, gym_frequency integer, fitness_goal text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select profile.user_id, profile.name, profile.gym_frequency, profile.fitness_goal
  from public.partnerships rel
  join public.profiles profile
    on profile.user_id = case
      when rel.requester_id = auth.uid() then rel.recipient_id
      else rel.requester_id
    end
  where rel.status = 'accepted'
    and auth.uid() in (rel.requester_id, rel.recipient_id)
  order by rel.created_at desc
  limit 1;
$$;

create or replace function public.finalize_workout(
  p_session jsonb,
  p_logs jsonb,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid := nullif(p_session->>'plan_id', '')::uuid;
  v_session_id uuid;
  v_log jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception 'A workout identifier is required';
  end if;
  if coalesce(jsonb_typeof(p_session), 'null') <> 'object' then
    raise exception 'Workout session must be an object';
  end if;
  if coalesce(jsonb_typeof(p_logs), 'null') <> 'array' then
    raise exception 'Workout logs must be an array';
  end if;
  if jsonb_array_length(p_logs) > 200 then
    raise exception 'Workout contains too many set records';
  end if;

  select id into v_session_id
  from public.workout_sessions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_session_id is not null then
    return v_session_id;
  end if;

  if v_plan_id is not null and not exists (
    select 1 from public.workout_plans where id = v_plan_id and user_id = v_user_id
  ) then
    raise exception 'Invalid workout plan';
  end if;

  insert into public.workout_sessions (
    user_id, plan_id, idempotency_key, day, workout_type, focus,
    duration_seconds, status, notes, started_at, finished_at
  ) values (
    v_user_id,
    v_plan_id,
    p_idempotency_key,
    left(p_session->>'day', 40),
    left(p_session->>'workout_type', 120),
    left(p_session->>'focus', 240),
    greatest(0, coalesce((p_session->>'duration_seconds')::integer, 0)),
    'completed',
    nullif(left(p_session->>'notes', 1000), ''),
    coalesce(nullif(p_session->>'started_at', '')::timestamptz, now()),
    coalesce(nullif(p_session->>'finished_at', '')::timestamptz, now())
  )
  on conflict (user_id, idempotency_key) where idempotency_key is not null
  do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select id into v_session_id
    from public.workout_sessions
    where user_id = v_user_id and idempotency_key = p_idempotency_key;
    return v_session_id;
  end if;

  for v_log in select * from jsonb_array_elements(coalesce(p_logs, '[]'::jsonb))
  loop
    insert into public.exercise_logs (
      session_id, user_id, exercise_name, muscle_group, equipment_id,
      set_number, planned_reps, actual_reps, actual_value, actual_unit,
      weight_lbs, rest_seconds, skipped
    ) values (
      v_session_id,
      v_user_id,
      left(v_log->>'exercise_name', 160),
      left(v_log->>'muscle_group', 100),
      nullif(left(v_log->>'equipment_id', 100), ''),
      greatest(1, (v_log->>'set_number')::integer),
      left(v_log->>'planned_reps', 80),
      greatest(0, coalesce((v_log->>'actual_reps')::integer, 0)),
      greatest(0, coalesce((v_log->>'actual_value')::numeric, 0)),
      case
        when v_log->>'actual_unit' in ('reps', 'seconds', 'minutes', 'meters', 'kilometers', 'miles')
          then v_log->>'actual_unit'
        else 'reps'
      end,
      greatest(0, coalesce((v_log->>'weight_lbs')::numeric, 0)),
      greatest(0, coalesce((v_log->>'rest_seconds')::integer, 0)),
      coalesce((v_log->>'skipped')::boolean, false)
    );
  end loop;

  return v_session_id;
end;
$$;

create or replace function public.get_partner_weekly_momentum(p_week_start timestamptz)
returns table (session_count integer, total_minutes integer)
language sql
security definer
set search_path = public, pg_temp
as $$
  with connected_partner as (
    select case
      when rel.requester_id = auth.uid() then rel.recipient_id
      else rel.requester_id
    end as user_id
    from public.partnerships rel
    where rel.status = 'accepted'
      and auth.uid() in (rel.requester_id, rel.recipient_id)
    order by rel.created_at desc
    limit 1
  )
  select
    count(session.id)::integer as session_count,
    coalesce(floor(sum(session.duration_seconds) / 60), 0)::integer as total_minutes
  from connected_partner partner
  left join public.workout_sessions session
    on session.user_id = partner.user_id
    and session.status = 'completed'
    and session.finished_at >= p_week_start
    and session.finished_at < p_week_start + interval '7 days';
$$;

revoke all on function public.find_partner_by_email(text) from public;
revoke all on function public.get_connected_partner() from public;
revoke all on function public.finalize_workout(jsonb, jsonb, uuid) from public;
revoke all on function public.get_partner_weekly_momentum(timestamptz) from public;
grant execute on function public.find_partner_by_email(text) to authenticated;
grant execute on function public.get_connected_partner() to authenticated;
grant execute on function public.finalize_workout(jsonb, jsonb, uuid) to authenticated;
grant execute on function public.get_partner_weekly_momentum(timestamptz) to authenticated;
