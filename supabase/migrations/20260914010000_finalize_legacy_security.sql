-- Run only after every legacy sync ID has been migrated and verified.
drop policy if exists study_progress_select_all on public.study_progress;
drop policy if exists study_progress_insert_all on public.study_progress;
drop policy if exists study_progress_update_all on public.study_progress;
revoke all on table public.study_progress from anon;
create policy study_progress_authenticated_read_legacy on public.study_progress for select to authenticated using (true);
