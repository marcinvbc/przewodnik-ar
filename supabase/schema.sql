-- =====================================================================
--  Lekcja AR – baza danych i pliki (Supabase)
--  Wklej całość w: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- 1) Tabela lekcji ------------------------------------------------------
create table if not exists public.lekcje (
  id          uuid primary key default gen_random_uuid(),
  kod         text unique not null,                       -- 6-znakowy kod do dołączania (np. K7M2QX)
  wlasciciel  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tytul       text not null default 'Nowa lekcja',
  materialy   jsonb not null default '[]'::jsonb,         -- lista wgranych plików (slajdy, wideo, modele…)
  plan        jsonb,                                      -- sceny ułożone przez AI / automatycznie
  utworzono   timestamptz not null default now(),
  zmieniono   timestamptz not null default now()
);

alter table public.lekcje enable row level security;

-- nauczyciel widzi i edytuje tylko swoje lekcje
drop policy if exists "lekcje_select_wlasne" on public.lekcje;
drop policy if exists "lekcje_insert_wlasne" on public.lekcje;
drop policy if exists "lekcje_update_wlasne" on public.lekcje;
drop policy if exists "lekcje_delete_wlasne" on public.lekcje;
create policy "lekcje_select_wlasne" on public.lekcje for select to authenticated using (auth.uid() = wlasciciel);
create policy "lekcje_insert_wlasne" on public.lekcje for insert to authenticated with check (auth.uid() = wlasciciel);
create policy "lekcje_update_wlasne" on public.lekcje for update to authenticated using (auth.uid() = wlasciciel);
create policy "lekcje_delete_wlasne" on public.lekcje for delete to authenticated using (auth.uid() = wlasciciel);

-- uczniowie (bez logowania) mogą pobrać JEDNĄ lekcję – tylko znając jej kod
create or replace function public.lekcja_po_kodzie(p_kod text)
returns table (kod text, tytul text, materialy jsonb, plan jsonb)
language sql
security definer
set search_path = public
as $$
  select l.kod, l.tytul, l.materialy, l.plan
  from public.lekcje l
  where l.kod = upper(trim(p_kod))
  limit 1;
$$;
revoke all on function public.lekcja_po_kodzie(text) from public;
grant execute on function public.lekcja_po_kodzie(text) to anon, authenticated;

-- 2) Pliki lekcji (Storage) ---------------------------------------------
-- publiczny odczyt (uczniowie pobierają slajdy/wideo/modele), zapis tylko zalogowany nauczyciel,
-- każdy nauczyciel pisze wyłącznie do swojego folderu: <id_nauczyciela>/<id_lekcji>/plik
insert into storage.buckets (id, name, public, file_size_limit)
values ('lekcje', 'lekcje', true, 52428800)   -- 50 MB na plik (limit darmowego planu)
on conflict (id) do update set public = true;

drop policy if exists "lekcje_pliki_insert" on storage.objects;
drop policy if exists "lekcje_pliki_update" on storage.objects;
drop policy if exists "lekcje_pliki_delete" on storage.objects;
drop policy if exists "lekcje_pliki_select" on storage.objects;
create policy "lekcje_pliki_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'lekcje' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lekcje_pliki_update" on storage.objects for update to authenticated
  using (bucket_id = 'lekcje' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lekcje_pliki_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'lekcje' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lekcje_pliki_select" on storage.objects for select to authenticated
  using (bucket_id = 'lekcje' and (storage.foldername(name))[1] = auth.uid()::text);
