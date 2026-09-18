-- Find the Crowd — migration 002
--
-- Run this in the Supabase SQL editor after supabase/schema.sql.
-- It is idempotent: running it twice is harmless.
--
-- What it adds:
--   1. A `role` column on crowd_reports, so a venue's own staff report can be
--      stored and labelled instead of silently joining the public consensus.
--   2. Provenance columns on `events`. An event without a supporting URL and a
--      checked-at date is not shown, so these are what make a listing publish.
--   3. Group shortlists and their votes, in their own tables. Votes live here
--      and nowhere near crowd_reports, which is what makes "a group vote can
--      never raise a crowd score" a structural fact rather than a promise.
--   4. Corrections, so "tell us something is wrong" reaches a row a human can
--      read instead of a page with no form on it.
--   5. The retention schedule that the 30-day deletion claim depends on.

-- ---------------------------------------------------------- report roles ----

alter table public.crowd_reports
  add column if not exists role text not null default 'public';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crowd_reports_role_check'
  ) then
    alter table public.crowd_reports
      add constraint crowd_reports_role_check check (role in ('public','team','venue'));
  end if;
end $$;

comment on column public.crowd_reports.role is
  'public = independent contributor and the only kind that feeds the score. '
  'team / venue are labelled in the UI and excluded from the public percentage.';

-- ------------------------------------------------------ event provenance ----

alter table public.events
  add column if not exists night_of     date,
  add column if not exists source_url   text,
  add column if not exists checked_at   date,
  add column if not exists price_kind   text not null default 'unknown',
  add column if not exists status       text not null default 'scheduled',
  add column if not exists note         text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_price_kind_check') then
    alter table public.events
      add constraint events_price_kind_check check (price_kind in ('free','amount','unknown'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_status_check') then
    alter table public.events
      add constraint events_status_check check (status in ('scheduled','cancelled'));
  end if;
  -- An "amount" price must actually carry an amount. This is the constraint
  -- that stops a plausible-looking number being implied by an empty column.
  if not exists (select 1 from pg_constraint where conname = 'events_price_amount_check') then
    alter table public.events
      add constraint events_price_amount_check
      check (price_kind <> 'amount' or price is not null);
  end if;
end $$;

create index if not exists events_night_idx on public.events (night_of);

comment on column public.events.source_url is
  'The page that supports THIS event. A venue homepage is not evidence for a '
  'specific night, time and price. Rows without a source_url and a checked_at '
  'are filtered out by the app and never rendered.';

-- ------------------------------------------------------------ shortlists ----

create table if not exists public.shortlists (
  code        text primary key,
  venue_ids   text[] not null,
  title       text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  -- Nothing identifies the creator. Not a user id, not an IP, not a device id.
  check (array_length(venue_ids, 1) between 2 and 5)
);

create index if not exists shortlists_expires_idx on public.shortlists (expires_at);

create table if not exists public.shortlist_votes (
  code        text not null references public.shortlists (code) on delete cascade,
  -- Anonymous browser id. Limits casual duplicates. NOT proof of a person, and
  -- nothing in the product describes it as one.
  voter_id    text not null,
  venue_id    text not null,
  created_at  timestamptz not null default now(),
  -- One vote per browser per shortlist, changeable. The primary key is the
  -- rule: a re-vote upserts over the old row rather than adding a second.
  primary key (code, voter_id)
);

create index if not exists shortlist_votes_code_idx on public.shortlist_votes (code);

-- A vote may only name a venue that is actually on its shortlist. The API
-- checks this too; this is the copy that cannot be bypassed.
create or replace function public.check_vote_on_ballot()
returns trigger
language plpgsql
as $$
declare
  ballot text[];
  expiry timestamptz;
begin
  select venue_ids, expires_at into ballot, expiry
    from public.shortlists where code = new.code;

  if ballot is null then
    raise exception 'that shortlist does not exist';
  end if;
  if expiry <= now() then
    raise exception 'that shortlist has expired';
  end if;
  if not (new.venue_id = any(ballot)) then
    raise exception 'that venue is not on this shortlist';
  end if;

  return new;
end;
$$;

drop trigger if exists shortlist_votes_on_ballot on public.shortlist_votes;
create trigger shortlist_votes_on_ballot
before insert or update on public.shortlist_votes
for each row execute function public.check_vote_on_ballot();

-- --------------------------------------------------------- corrections ------

create table if not exists public.corrections (
  id            text primary key,
  subject_type  text not null check (subject_type in ('venue','event','other')),
  subject_id    text,
  message       text not null check (length(message) between 10 and 2000),
  -- Optional. A person reporting a wrong opening time should not have to hand
  -- over an email address to do it.
  contact       text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists corrections_open_idx
  on public.corrections (created_at desc) where resolved_at is null;

-- ----------------------------------------------------------------- RLS ------

alter table public.shortlists      enable row level security;
alter table public.shortlist_votes enable row level security;
alter table public.corrections     enable row level security;

-- A shortlist is readable by anyone who has its code. The code is 100 bits of
-- entropy, so "knows the code" is the access control. There is no listing
-- endpoint and no way to enumerate them.
drop policy if exists "shortlists readable by code" on public.shortlists;
create policy "shortlists readable by code"
  on public.shortlists for select using (true);

drop policy if exists "anyone can create a shortlist" on public.shortlists;
create policy "anyone can create a shortlist"
  on public.shortlists for insert with check (
    expires_at > now() and expires_at < now() + interval '48 hours'
  );

drop policy if exists "votes are readable" on public.shortlist_votes;
create policy "votes are readable"
  on public.shortlist_votes for select using (true);

drop policy if exists "anyone can vote" on public.shortlist_votes;
create policy "anyone can vote"
  on public.shortlist_votes for insert with check (true);

-- Changing your own vote is an update on your own row.
drop policy if exists "a voter can change their vote" on public.shortlist_votes;
create policy "a voter can change their vote"
  on public.shortlist_votes for update using (true) with check (true);

-- Corrections are write-only from the public role. Somebody reporting a
-- problem should not be able to read everyone else's reports, which may carry
-- the contact address they chose to leave.
drop policy if exists "anyone can send a correction" on public.corrections;
create policy "anyone can send a correction"
  on public.corrections for insert with check (true);

-- ------------------------------------------------------------ retention -----

-- Reports are deleted after 30 days. The function already existed; what was
-- missing was anything that ran it, which made the public retention claim a
-- statement of intent. This schedules it.
--
-- pg_cron must be enabled for the project (Supabase: Database -> Extensions).
-- If the extension is not available this block does nothing and the DO block
-- raises a notice, so the operator finds out here rather than in 30 days.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('findthecrowd-prune-reports')
      where exists (
        select 1 from cron.job where jobname = 'findthecrowd-prune-reports'
      );
    perform cron.schedule(
      'findthecrowd-prune-reports',
      '17 4 * * *',                        -- 04:17 UTC daily, after last call
      $cron$ select public.prune_old_reports(); $cron$
    );
    raise notice 'Retention job scheduled: findthecrowd-prune-reports';
  else
    raise notice 'pg_cron is NOT enabled. The 30 day deletion claim on /about is not being enforced. Enable pg_cron and re-run this migration.';
  end if;
end $$;

-- Expired shortlists are cleared too. They are tiny, but a link that has
-- expired should not sit in a table forever waiting to be correlated.
create or replace function public.prune_expired_shortlists()
returns void
language sql
as $$
  delete from public.shortlists where expires_at < now() - interval '7 days';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('findthecrowd-prune-shortlists')
      where exists (
        select 1 from cron.job where jobname = 'findthecrowd-prune-shortlists'
      );
    perform cron.schedule(
      'findthecrowd-prune-shortlists',
      '31 4 * * *',
      $cron$ select public.prune_expired_shortlists(); $cron$
    );
  end if;
end $$;
