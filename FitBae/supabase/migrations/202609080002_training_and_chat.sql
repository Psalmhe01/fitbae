begin;
set local lock_timeout = '5s';

-- Older installations used plain timestamps. FitBae writes ISO UTC instants,
-- and the legacy defaults used the database's UTC clock. Retain those instants
-- while making the offset explicit. Refuse to guess on a non-UTC database.
do $$
declare column_info record;
begin
  if current_setting('TimeZone') not in ('UTC', 'Etc/UTC', 'GMT') then
    raise exception 'Review legacy timestamp provenance before migrating a non-UTC database.';
  end if;
  for column_info in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type = 'timestamp without time zone'
      and ((table_name in ('partner_notes', 'partner_reactions', 'partnerships', 'profiles', 'workout_plans') and column_name = 'created_at')
        or (table_name = 'workout_sessions' and column_name in ('started_at', 'finished_at'))
        or (table_name = 'exercise_logs' and column_name = 'completed_at'))
  loop
    execute format('alter table public.%I alter column %I type timestamptz using %I at time zone ''UTC''', column_info.table_name, column_info.column_name, column_info.column_name);
  end loop;
end;
$$;

alter table public.partner_notes alter column created_at set default now();
alter table public.partner_reactions alter column created_at set default now();

-- A recipient can acknowledge a message, not rewrite someone else's words,
-- change its author, move it to another conversation, or forge its timestamp.
create or replace function public.guard_partner_note_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.id is distinct from old.id or new.author_id is distinct from old.author_id
    or new.recipient_id is distinct from old.recipient_id or new.content is distinct from old.content
    or new.created_at is distinct from old.created_at then
    raise exception 'Only the read receipt may be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_partner_note_read_receipt on public.partner_notes;
create trigger enforce_partner_note_read_receipt before update on public.partner_notes
for each row execute function public.guard_partner_note_update();

create index if not exists partner_notes_conversation_created_idx
  on public.partner_notes (author_id, recipient_id, created_at desc, id desc);
create index if not exists exercise_logs_previous_performance_idx
  on public.exercise_logs (user_id, exercise_name, completed_at desc) where skipped = false;

-- Supabase projects can omit this table from the realtime publication.
-- Polling in the client remains a fallback when realtime is disconnected.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables)
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partner_notes') then
    alter publication supabase_realtime add table public.partner_notes;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
