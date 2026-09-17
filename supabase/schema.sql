-- Find the Crowd — Ottawa MVP schema
-- Run this in the Supabase SQL editor, then run `npm run seed` to load venues.
--
-- Design principles:
--   * Reporting is anonymous and device-scoped. No account required to report,
--     because requiring one kills the contribution loop Waze depends on.
--   * The public (anon) role can read everything and insert reports. It can
--     never update or delete. Corrections happen through confirms/disputes.
--   * Rate limiting lives in the database, not just the client, because the
--     client is the attacker's machine.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- venues ----

create table if not exists public.venues (
  id            text primary key,
  slug          text unique not null,
  name          text not null,
  kind          text not null check (kind in ('club','bar','pub','live-music','lounge','arena','hall')),
  district      text not null check (district in ('byward','elgin','centretown','lansdowne','hintonburg','little-italy','sandy-hill')),
  address       text not null,
  lat           double precision not null,
  lng           double precision not null,
  blurb         text not null default '',
  capacity_band text not null check (capacity_band in ('small','medium','large')),
  typical_cover integer,
  age_policy    text not null default 'varies',
  -- Set true once a venue has claimed and verified its listing.
  claimed       boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists venues_district_idx on public.venues (district) where active;

-- ---------------------------------------------------------------- events ----

create table if not exists public.events (
  id          text primary key,
  venue_id    text not null references public.venues (id) on delete cascade,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  category    text not null check (category in ('dj','live-band','comedy','sports','market','festival','community')),
  price       integer,
  ticket_url  text,
  -- Where the listing came from. Displayed in the UI; attribution is not optional.
  source      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_venue_idx on public.events (venue_id, starts_at);

-- --------------------------------------------------------- crowd reports ----

create table if not exists public.crowd_reports (
  id           text primary key,
  venue_id     text not null references public.venues (id) on delete cascade,
  -- Anonymous device identifier generated client-side. Not a user account.
  reporter_id  text not null,
  created_at   timestamptz not null default now(),
  crowd        smallint not null check (crowd between 1 and 5),
  line         text not null check (line in ('none','short','long','brutal')),
  cover        integer check (cover >= 0 and cover <= 200),
  -- The Vibe Score input: "would you tell a friend to come here right now?"
  worth_it     boolean not null,
  tags         text[] not null default '{}',
  net_confirms integer not null default 0
);

-- The feed's hot path: every report in the last six hours.
create index if not exists crowd_reports_recent_idx
  on public.crowd_reports (created_at desc);
create index if not exists crowd_reports_venue_recent_idx
  on public.crowd_reports (venue_id, created_at desc);
create index if not exists crowd_reports_reporter_idx
  on public.crowd_reports (reporter_id, venue_id, created_at desc);

-- ------------------------------------------------------- confirms/disputes --

create table if not exists public.report_votes (
  report_id   text not null references public.crowd_reports (id) on delete cascade,
  voter_id    text not null,
  vote        smallint not null check (vote in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (report_id, voter_id)
);

-- Keep the denormalised counter on crowd_reports in step with the votes table.
create or replace function public.sync_net_confirms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crowd_reports r
     set net_confirms = coalesce((
       select sum(v.vote) from public.report_votes v where v.report_id = r.id
     ), 0)
   where r.id = coalesce(new.report_id, old.report_id);
  return null;
end;
$$;

drop trigger if exists report_votes_sync on public.report_votes;
create trigger report_votes_sync
after insert or update or delete on public.report_votes
for each row execute function public.sync_net_confirms();

-- ------------------------------------------------------------ rate limit ----

-- One report per reporter per venue per 20 minutes, enforced server-side.
create or replace function public.enforce_report_cooldown()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
    from public.crowd_reports
   where venue_id = new.venue_id
     and reporter_id = new.reporter_id
     and created_at > now() - interval '20 minutes';

  if recent_count > 0 then
    raise exception 'cooldown: this device already reported here in the last 20 minutes'
      using errcode = 'check_violation';
  end if;

  -- A single device flooding the whole city is the other failure mode.
  select count(*) into recent_count
    from public.crowd_reports
   where reporter_id = new.reporter_id
     and created_at > now() - interval '1 hour';

  if recent_count >= 12 then
    raise exception 'cooldown: too many reports from this device in the last hour'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists crowd_reports_cooldown on public.crowd_reports;
create trigger crowd_reports_cooldown
before insert on public.crowd_reports
for each row execute function public.enforce_report_cooldown();

-- ----------------------------------------------------------------- RLS ------

alter table public.venues        enable row level security;
alter table public.events        enable row level security;
alter table public.crowd_reports enable row level security;
alter table public.report_votes  enable row level security;

drop policy if exists "venues are public" on public.venues;
create policy "venues are public"
  on public.venues for select using (active);

drop policy if exists "events are public" on public.events;
create policy "events are public"
  on public.events for select using (true);

drop policy if exists "reports are public" on public.crowd_reports;
create policy "reports are public"
  on public.crowd_reports for select using (true);

-- Anyone can add a report. Nobody can edit or delete one through the API;
-- the cooldown trigger and the votes table are the correction mechanism.
drop policy if exists "anyone can report" on public.crowd_reports;
create policy "anyone can report"
  on public.crowd_reports for insert with check (
    created_at > now() - interval '5 minutes'
    and created_at < now() + interval '5 minutes'
  );

drop policy if exists "votes are public" on public.report_votes;
create policy "votes are public"
  on public.report_votes for select using (true);

drop policy if exists "anyone can vote" on public.report_votes;
create policy "anyone can vote"
  on public.report_votes for insert with check (true);

-- ------------------------------------------------------------- retention ----

-- Reports stop being useful after a day and become a privacy liability after a
-- week. Schedule this with pg_cron once the Supabase project is live.
create or replace function public.prune_old_reports()
returns void
language sql
as $$
  delete from public.crowd_reports where created_at < now() - interval '30 days';
$$;
