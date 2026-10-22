-- Optimus Auction dashboard: shared horse videos, per-lot descriptions,
-- two independent website codebases and installation acknowledgements.
-- All data is private to existing authorized pedigree team members.

create table if not exists public.optimus_auction_horse_profiles (
  normalized_name text primary key check(length(normalized_name) between 1 and 160),
  display_name text not null check(length(display_name) between 1 and 160),
  video_url text not null default '' check(length(video_url) <= 1000),
  updated_at timestamptz not null default now()
);

create table if not exists public.optimus_auction_lot_descriptions (
  owner_id uuid not null,
  pedigree_id text not null,
  description jsonb not null default '{"sections":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(owner_id,pedigree_id),
  constraint auction_lot_pedigree_fk foreign key(owner_id,pedigree_id)
    references public.optimus_pedigrees(owner_id,id) on delete cascade,
  constraint auction_description_valid check(
    jsonb_typeof(description)='object'
    and jsonb_typeof(description->'sections')='array'
    and pg_column_size(description)<65536
  )
);

create table if not exists public.optimus_auction_site_codes (
  owner_id uuid not null,
  pedigree_id text not null,
  site text not null check (site in ('be','auction')),
  base_code text not null default '',
  heights jsonb not null default '[2600,3500,4800,5400,5900,6300,6800]'::jsonb,
  crop integer not null default 265 check(crop between 0 and 20000),
  updated_at timestamptz not null default now(),
  applied_signature text,
  applied_at timestamptz,
  primary key(owner_id,pedigree_id,site),
  constraint auction_site_pedigree_fk foreign key(owner_id,pedigree_id)
    references public.optimus_pedigrees(owner_id,id) on delete cascade,
  constraint auction_height_list_valid check (
    jsonb_typeof(heights)='array' and jsonb_array_length(heights)=7
  ),
  constraint auction_code_size_valid check(octet_length(base_code)<500000)
);

alter table public.optimus_auction_horse_profiles enable row level security;
alter table public.optimus_auction_lot_descriptions enable row level security;
alter table public.optimus_auction_site_codes enable row level security;

create policy "Optimus members select horse videos"
  on public.optimus_auction_horse_profiles for select to authenticated
  using ((select public.optimus_is_pedigree_member()));
create policy "Optimus members insert horse videos"
  on public.optimus_auction_horse_profiles for insert to authenticated
  with check ((select public.optimus_is_pedigree_member()));
create policy "Optimus members update horse videos"
  on public.optimus_auction_horse_profiles for update to authenticated
  using ((select public.optimus_is_pedigree_member()))
  with check ((select public.optimus_is_pedigree_member()));

create policy "Optimus members select lot descriptions"
  on public.optimus_auction_lot_descriptions for select to authenticated
  using ((select public.optimus_is_pedigree_member()));
create policy "Optimus members insert lot descriptions"
  on public.optimus_auction_lot_descriptions for insert to authenticated
  with check ((select public.optimus_is_pedigree_member()));
create policy "Optimus members update lot descriptions"
  on public.optimus_auction_lot_descriptions for update to authenticated
  using ((select public.optimus_is_pedigree_member()))
  with check ((select public.optimus_is_pedigree_member()));

create policy "Optimus members select site code versions"
  on public.optimus_auction_site_codes for select to authenticated
  using ((select public.optimus_is_pedigree_member()));
create policy "Optimus members insert site code versions"
  on public.optimus_auction_site_codes for insert to authenticated
  with check ((select public.optimus_is_pedigree_member()));
create policy "Optimus members update site code versions"
  on public.optimus_auction_site_codes for update to authenticated
  using ((select public.optimus_is_pedigree_member()))
  with check ((select public.optimus_is_pedigree_member()));

grant select,insert,update on public.optimus_auction_horse_profiles to authenticated;
grant select,insert,update on public.optimus_auction_lot_descriptions to authenticated;
grant select,insert,update on public.optimus_auction_site_codes to authenticated;

-- Normalize 'vh' / 'v/h' / 'van het' so e.g. Cacacha vh Schaeck
-- and Cacacha van het Schaeck share one central horse identity.
create or replace function public.optimus_auction_horse_key(input_name text)
returns text language sql immutable set search_path = ''
as $fn$
  select trim(regexp_replace(
    regexp_replace(
      lower(trim(coalesce(input_name,''))),
      '(^|[[:space:]])v/?h([[:space:]]|$)', '\1van het\2', 'g'
    ), '[^a-z0-9]+', ' ', 'g'
  ));
$fn$;

-- The existing pedigree editor keeps working: changing a level or year
-- of an existing named horse automatically propagates it to every team
-- pedigree where that same normalized horse name appears.
create or replace function public.optimus_auction_propagate_pedigree_horse()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
declare
  idx int;
  before_entry jsonb;
  after_entry jsonb;
  item_name text;
  new_level text;
  new_year text;
  previous_level text;
  previous_year text;
  normalized text;
begin
  if pg_trigger_depth() > 1 or new.horses = old.horses then
    return new;
  end if;

  for idx in 0..least(jsonb_array_length(new.horses), jsonb_array_length(old.horses)) - 1 loop
    before_entry := old.horses -> idx;
    after_entry := new.horses -> idx;
    item_name := after_entry ->> 'name';
    if item_name is null or trim(item_name) = '' then continue; end if;
    normalized := public.optimus_auction_horse_key(item_name);
    -- A renamed ancestor must not overwrite a different horse.
    if normalized <> public.optimus_auction_horse_key(before_entry ->> 'name') then
      continue;
    end if;
    new_level := coalesce(after_entry ->> 'level','');
    new_year := coalesce(after_entry ->> 'year','');
    previous_level := coalesce(before_entry ->> 'level','');
    previous_year := coalesce(before_entry ->> 'year','');
    if new_level = previous_level and new_year = previous_year then continue; end if;

    update public.optimus_pedigrees other
    set horses = (
      select jsonb_agg(
        case when public.optimus_auction_horse_key(e.item->>'name') = normalized
          then jsonb_set(jsonb_set(e.item, '{level}',to_jsonb(new_level)), '{year}',to_jsonb(new_year))
          else e.item end
        order by e.ordinality
      )
      from jsonb_array_elements(other.horses) with ordinality as e(item,ordinality)
    ), updated_at = now()
    where (other.owner_id, other.id) <> (new.owner_id, new.id)
      and exists (
        select 1 from jsonb_array_elements(other.horses) as h(item)
        where public.optimus_auction_horse_key(h.item->>'name') = normalized
      );
  end loop;
  return new;
end;
$fn$;

revoke all on function public.optimus_auction_propagate_pedigree_horse() from public;
revoke all on function public.optimus_auction_horse_key(text) from public;
grant execute on function public.optimus_auction_horse_key(text) to authenticated;

drop trigger if exists optimus_auction_shared_horses on public.optimus_pedigrees;
create trigger optimus_auction_shared_horses
  after update of horses on public.optimus_pedigrees
  for each row execute function public.optimus_auction_propagate_pedigree_horse();
