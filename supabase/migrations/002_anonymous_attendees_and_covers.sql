-- Run once in the Supabase SQL editor (choose "Run without RLS"). Safe to run on the current database: it only ADDS things.
-- 1) Attendees join with a QR code and a display name: no account, no email.
-- 2) Events can have a cover image.

alter table attendees alter column user_id drop not null;
alter table attendees add column if not exists token_hash text;            -- sha256 of the secret kept on the attendee's device
alter table complaints add column if not exists attendee_id uuid references attendees(id) on delete set null;
alter table events add column if not exists cover_url text;

create index if not exists complaints_attendee_idx on complaints (attendee_id);

-- let coordinators see attendees join live
do $$ begin
  alter publication supabase_realtime add table attendees;
exception when duplicate_object then null;
end $$;
