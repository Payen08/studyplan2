alter table public.tasks
  add column if not exists source text not null default 'manual',
  add column if not exists completion_summary text not null default '',
  add column if not exists confidence integer,
  add column if not exists unresolved_issues text not null default '';

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check check(source in ('manual','ai','plan','review'));
alter table public.tasks drop constraint if exists tasks_confidence_check;
alter table public.tasks add constraint tasks_confidence_check check(confidence is null or confidence between 1 and 5);

alter table public.notes alter column folder_id drop not null;
alter table public.notes drop constraint if exists notes_source_check;
alter table public.notes add constraint notes_source_check check(source in ('web','obsidian','legacy','daily_note','novaforge'));

alter table public.mistakes
  add column if not exists user_answer text not null default '',
  add column if not exists correct_answer text not null default '',
  add column if not exists evidence text not null default '',
  add column if not exists trap_type text not null default '';

create unique index if not exists mistakes_user_legacy_unique
  on public.mistakes(user_id, legacy_id) where legacy_id is not null;

create table if not exists public.third_party_content_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository text not null,
  commit_sha text not null,
  imported_at timestamptz not null default now(),
  license_status text not null check(license_status in ('licensed','local_only','blocked')),
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(user_id, repository, commit_sha, content_hash)
);

alter table public.third_party_content_sources enable row level security;
drop policy if exists third_party_content_sources_own_rows on public.third_party_content_sources;
create policy third_party_content_sources_own_rows on public.third_party_content_sources
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists trg_third_party_content_sources_updated_at on public.third_party_content_sources;
create trigger trg_third_party_content_sources_updated_at before update on public.third_party_content_sources
  for each row execute function public.touch_updated_at();
