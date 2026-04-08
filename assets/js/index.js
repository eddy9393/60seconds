begin;

create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists coins integer;

alter table public.profiles
add column if not exists daily_seconds_earned integer;

alter table public.profiles
add column if not exists daily_seconds_earned_date date;

update public.profiles
set
  coins = coalesce(coins, 0),
  daily_seconds_earned = coalesce(daily_seconds_earned, 0)
where
  coins is null
  or daily_seconds_earned is null;

alter table public.profiles
alter column coins set default 0;

alter table public.profiles
alter column daily_seconds_earned set default 0;

alter table public.profiles
alter column coins set not null;

alter table public.profiles
alter column daily_seconds_earned set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_coins_non_negative'
  ) then
    alter table public.profiles
    add constraint profiles_coins_non_negative
    check (coins >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_daily_seconds_earned_non_negative'
  ) then
    alter table public.profiles
    add constraint profiles_daily_seconds_earned_non_negative
    check (daily_seconds_earned >= 0);
  end if;
end $$;

create table if not exists public.profile_listening_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  track_id uuid not null,
  reward_date date not null,
  created_at timestamptz not null default now(),
  constraint profile_listening_rewards_user_track_date_key unique (user_id, track_id, reward_date)
);

create index if not exists idx_profile_listening_rewards_user_date
  on public.profile_listening_rewards (user_id, reward_date);

create or replace function public.skip_track_cost()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_coins integer;
  v_new_coins integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return json_build_object(
      'success', false,
      'reason', 'not_authenticated'
    );
  end if;

  select p.coins
  into v_current_coins
  from public.profiles p
  where p.user_id = v_user_id
  for update;

  if v_current_coins is null then
    return json_build_object(
      'success', false,
      'reason', 'profile_not_found'
    );
  end if;

  if v_current_coins < 1 then
    return json_build_object(
      'success', false,
      'reason', 'insufficient_seconds',
      'coins', coalesce(v_current_coins, 0)
    );
  end if;

  update public.profiles
  set coins = coins - 1
  where user_id = v_user_id;

  select p.coins
  into v_new_coins
  from public.profiles p
  where p.user_id = v_user_id;

  return json_build_object(
    'success', true,
    'coins', coalesce(v_new_coins, 0)
  );
end;
$$;

create or replace function public.award_listening_second(p_track_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_today date := current_date;
  v_daily_limit integer := 10;
  v_profile record;
  v_current_daily integer;
  v_current_daily_date date;
  v_new_coins integer;
  v_new_daily integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return json_build_object(
      'success', false,
      'reason', 'not_authenticated'
    );
  end if;

  if p_track_id is null then
    return json_build_object(
      'success', false,
      'reason', 'missing_track_id'
    );
  end if;

  select
    p.user_id,
    p.coins,
    p.daily_seconds_earned,
    p.daily_seconds_earned_date
  into v_profile
  from public.profiles p
  where p.user_id = v_user_id
  for update;

  if v_profile.user_id is null then
    return json_build_object(
      'success', false,
      'reason', 'profile_not_found'
    );
  end if;

  v_current_daily_date := v_profile.daily_seconds_earned_date;
  v_current_daily := coalesce(v_profile.daily_seconds_earned, 0);

  if v_current_daily_date is distinct from v_today then
    v_current_daily := 0;
    v_current_daily_date := v_today;
  end if;

  if exists (
    select 1
    from public.profile_listening_rewards r
    where r.user_id = v_user_id
      and r.track_id = p_track_id
      and r.reward_date = v_today
  ) then
    return json_build_object(
      'success', false,
      'reason', 'already_rewarded_for_track_today',
      'coins', coalesce(v_profile.coins, 0),
      'daily_seconds_earned', v_current_daily,
      'daily_limit', v_daily_limit
    );
  end if;

  if v_current_daily >= v_daily_limit then
    update public.profiles
    set
      daily_seconds_earned = v_current_daily,
      daily_seconds_earned_date = v_today
    where user_id = v_user_id;

    return json_build_object(
      'success', false,
      'reason', 'daily_limit_reached',
      'coins', coalesce(v_profile.coins, 0),
      'daily_seconds_earned', v_current_daily,
      'daily_limit', v_daily_limit
    );
  end if;

  insert into public.profile_listening_rewards (user_id, track_id, reward_date)
  values (v_user_id, p_track_id, v_today)
  on conflict (user_id, track_id, reward_date) do nothing;

  if not found then
    return json_build_object(
      'success', false,
      'reason', 'already_rewarded_for_track_today',
      'coins', coalesce(v_profile.coins, 0),
      'daily_seconds_earned', v_current_daily,
      'daily_limit', v_daily_limit
    );
  end if;

  update public.profiles
  set
    coins = coalesce(coins, 0) + 1,
    daily_seconds_earned = v_current_daily + 1,
    daily_seconds_earned_date = v_today
  where user_id = v_user_id;

  select
    p.coins,
    p.daily_seconds_earned
  into v_new_coins, v_new_daily
  from public.profiles p
  where p.user_id = v_user_id;

  return json_build_object(
    'success', true,
    'coins', coalesce(v_new_coins, 0),
    'daily_seconds_earned', coalesce(v_new_daily, 0),
    'daily_limit', v_daily_limit
  );
end;
$$;

revoke all on function public.skip_track_cost() from public;
revoke all on function public.award_listening_second(uuid) from public;

grant execute on function public.skip_track_cost() to anon, authenticated;
grant execute on function public.award_listening_second(uuid) to anon, authenticated;

alter table public.profile_listening_rewards enable row level security;

drop policy if exists "Users can view their own listening rewards"
on public.profile_listening_rewards;

create policy "Users can view their own listening rewards"
on public.profile_listening_rewards
for select
to authenticated
using (auth.uid() = user_id);

commit;
