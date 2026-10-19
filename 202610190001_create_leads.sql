-- Run ONCE in the Supabase SQL Editor, or apply via `supabase db push`.
-- No customer seed records are inserted. Demo records live in browser memory only.
begin;
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 40),
  company text not null default '' check (char_length(company) <= 160),
  status text not null default 'New' check (status in ('New','Contacted','Won','Lost')),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now()
);
create index leads_user_created_idx on public.leads (user_id, created_at desc, id);
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant select, insert, delete on public.leads to authenticated;
-- Only editable fields can be updated, even if a client crafts a request.
grant update (name,email,phone,company,status,notes) on public.leads to authenticated;
create policy "Owners can read leads" on public.leads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Owners can insert leads" on public.leads for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Owners can update leads" on public.leads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners can delete leads" on public.leads for delete to authenticated
  using ((select auth.uid()) = user_id);
commit;
