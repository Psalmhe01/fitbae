begin;

-- Partner-only image access requires actual consent, not just an accepted label.
-- The original update policy allowed either party to accept an invitation or
-- change its participants. Guard transitions even if older policies coexist.
create or replace function public.guard_partnership_consent()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.requester_id is distinct from auth.uid() or new.status <> 'pending' then
      raise exception 'New partner requests must be pending and sent by you.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'A partner request identity cannot be changed.' using errcode = '42501';
  end if;

  if new is not distinct from old then return new; end if;

  if old.status = 'pending' and new.status in ('accepted', 'declined')
    and auth.uid() = old.recipient_id
    and new.requester_id = old.requester_id and new.recipient_id = old.recipient_id then
    return new;
  end if;

  -- Re-inviting after a decline must still require the new recipient's consent.
  if old.status = 'declined' and new.status = 'pending'
    and auth.uid() in (old.requester_id, old.recipient_id)
    and new.requester_id = auth.uid() then
    return new;
  end if;

  raise exception 'Only the invited partner can accept or decline a pending request.' using errcode = '42501';
end;
$$;

drop trigger if exists enforce_partnership_consent on public.partnerships;
create trigger enforce_partnership_consent
before insert or update on public.partnerships
for each row execute function public.guard_partnership_consent();

drop policy if exists partnerships_request on public.partnerships;
create policy partnerships_request on public.partnerships for insert to authenticated
with check (auth.uid() = requester_id and requester_id <> recipient_id and status = 'pending');

-- Preset choices live in each user's auth metadata. Photo files stay private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar-photos', 'avatar-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatar_photos_insert_own on storage.objects;
create policy avatar_photos_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatar-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists avatar_photos_read_own_or_partner on storage.objects;
create policy avatar_photos_read_own_or_partner on storage.objects
for select to authenticated
using (
  bucket_id = 'avatar-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.partnerships p
      where p.status = 'accepted'
        and ((p.requester_id = (select auth.uid()) and p.recipient_id::text = (storage.foldername(name))[1])
          or (p.recipient_id = (select auth.uid()) and p.requester_id::text = (storage.foldername(name))[1]))
    )
  )
);

drop policy if exists avatar_photos_delete_own on storage.objects;
create policy avatar_photos_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatar-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Expose only an accepted partner's chosen avatar, never their auth record.
create or replace function public.get_partner_avatar(p_partner_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select u.raw_user_meta_data->'fitbae_avatar'
  from auth.users u
  where u.id = p_partner_id
    and exists (
      select 1 from public.partnerships p
      where p.status = 'accepted'
        and ((p.requester_id = auth.uid() and p.recipient_id = u.id)
          or (p.recipient_id = auth.uid() and p.requester_id = u.id))
    );
$$;

revoke all on function public.get_partner_avatar(uuid) from public, anon;
grant execute on function public.get_partner_avatar(uuid) to authenticated;

commit;
