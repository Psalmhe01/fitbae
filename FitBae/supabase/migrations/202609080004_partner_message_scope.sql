begin;
set local lock_timeout = '5s';

-- Fully qualify outer-table columns: the inner partnership also has a
-- recipient_id. An unqualified name can become p.recipient_id = p.recipient_id,
-- admitting unrelated recipients while blocking the invited partner's reply.
drop policy if exists partner_notes_author_insert on public.partner_notes;
create policy partner_notes_author_insert on public.partner_notes for insert to authenticated
with check (
  auth.uid() = partner_notes.author_id
  and exists (
    select 1 from public.partnerships p where p.status = 'accepted'
    and ((p.requester_id = partner_notes.author_id and p.recipient_id = partner_notes.recipient_id)
      or (p.requester_id = partner_notes.recipient_id and p.recipient_id = partner_notes.author_id))
  )
);
drop policy if exists partner_reactions_sender_insert on public.partner_reactions;
create policy partner_reactions_sender_insert on public.partner_reactions for insert to authenticated
with check (
  auth.uid() = partner_reactions.sender_id
  and exists (
    select 1 from public.partnerships p where p.status = 'accepted'
    and ((p.requester_id = partner_reactions.sender_id and p.recipient_id = partner_reactions.recipient_id)
      or (p.requester_id = partner_reactions.recipient_id and p.recipient_id = partner_reactions.sender_id))
  )
);

-- Hosted Supabase may grant anon privileges through its default ACLs in
-- addition to PUBLIC. These functions are only for signed-in app users.
revoke all on function public.find_partner_by_email(text) from public, anon;
revoke all on function public.get_connected_partner() from public, anon;
revoke all on function public.finalize_workout(jsonb, jsonb, uuid) from public, anon;
revoke all on function public.get_partner_weekly_momentum(timestamptz) from public, anon;
grant execute on function public.find_partner_by_email(text) to authenticated;
grant execute on function public.get_connected_partner() to authenticated;
grant execute on function public.finalize_workout(jsonb, jsonb, uuid) to authenticated;
grant execute on function public.get_partner_weekly_momentum(timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
