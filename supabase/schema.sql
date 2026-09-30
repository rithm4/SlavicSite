-- EUROVYPCUC: conturi de client, comenzi, istoricul statusurilor și documente.
-- Se rulează o singură dată: Supabase → SQL Editor → New query → lipiți tot fișierul → Run.
-- Regula de bază: fiecare firmă își vede doar datele ei; administratorii (tabelul admins) văd tot.

-- ---------- Profilul firmei (câte unul pentru fiecare cont) ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  cui text not null default '',
  reg_com text not null default '',
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profilul se creează singur la înregistrare, din datele trimise de formular.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, cui, reg_com, contact_person, phone, email, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'cui', ''),
    coalesce(new.raw_user_meta_data ->> 'reg_com', ''),
    coalesce(new.raw_user_meta_data ->> 'contact_person', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Administratori ----------

create table public.admins (
  user_id uuid primary key references auth.users on delete cascade
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- ---------- Adrese de livrare salvate ----------

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null default '',
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Comenzi ----------

create type public.order_status as enum ('noua', 'achitata', 'productie', 'gata', 'livrata', 'anulata');

create sequence public.invoice_counter;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid references auth.users on delete set null,
  issued_at timestamptz not null default now(),
  delivery_date date,
  draft jsonb not null,
  quote jsonb not null,
  total numeric(12, 2) not null,
  status public.order_status not null default 'noua',
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, issued_at desc);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders on delete cascade,
  status public.order_status not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Comanda se salvează doar prin această funcție: numărul facturii proforme îl dă serverul
-- (EV-anul-numărul, prefixul e cel din src/config/company.ts), iar comanda se leagă de cont
-- dacă clientul e autentificat. Merge și fără cont (comandă ca vizitator).
create function public.create_order(p_draft jsonb, p_quote jsonb) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  insert into public.orders (number, user_id, delivery_date, draft, quote, total)
  values (
    'EV-' || extract(year from now())::int || '-' || lpad(nextval('public.invoice_counter')::text, 4, '0'),
    auth.uid(),
    nullif(p_draft ->> 'date', '')::date,
    p_draft,
    p_quote,
    (p_quote ->> 'total')::numeric
  )
  returning * into o;
  insert into public.order_events (order_id, status) values (o.id, 'noua');
  return o;
end $$;

-- Câte comenzi sunt programate pe fiecare zi (pentru calendar), fără date despre clienți.
create function public.booked_counts() returns table (day date, orders bigint)
language sql stable security definer set search_path = public as $$
  select delivery_date, count(*)
  from public.orders
  where delivery_date >= current_date and status <> 'anulata'
  group by delivery_date
$$;

-- Schimbarea statusului, doar de către administratori; fiecare schimbare rămâne în istoric.
create function public.set_order_status(p_order uuid, p_status public.order_status, p_note text default '')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Doar administratorii pot schimba statusul comenzilor.';
  end if;
  update public.orders set status = p_status, updated_at = now() where id = p_order;
  insert into public.order_events (order_id, status, note) values (p_order, p_status, coalesce(p_note, ''));
end $$;

-- Mutarea datei, doar de către administratori; în istoricul clientului apare data nouă.
create function public.reschedule_order(p_order uuid, p_date date, p_note text default '')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Doar administratorii pot muta comenzile.';
  end if;
  update public.orders
  set delivery_date = p_date,
      draft = jsonb_set(draft, '{date}', to_jsonb(p_date::text)),
      updated_at = now()
  where id = p_order;
  insert into public.order_events (order_id, status, note)
  select id, status, coalesce(nullif(p_note, ''), 'Data mutată pe ' || to_char(p_date, 'DD.MM.YYYY'))
  from public.orders where id = p_order;
end $$;

-- Zile închise pentru comenzi noi (revizie, inventar); formularul de comandă nu le mai oferă.
create table public.closed_days (
  day date primary key,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- Notele echipei pe comenzi; clientul nu le vede.
create table public.order_notes (
  order_id uuid primary key references public.orders on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- Mesajele din pagina de contacte: le trimite oricine (și fără cont), le citește doar echipa.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  company text not null default '' check (length(company) <= 200),
  contact text not null check (length(contact) between 3 and 200),
  body text not null check (length(body) between 1 and 4000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

grant execute on function public.reschedule_order(uuid, date, text) to authenticated;
grant execute on function public.create_order(jsonb, jsonb) to anon, authenticated;
grant execute on function public.booked_counts() to anon, authenticated;
grant execute on function public.set_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- Documente (facturi, certificate ISPM 15) ----------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  order_number text,
  kind text not null check (kind in ('factura', 'certificat', 'alt')),
  title text not null,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ---------- Reguli de acces ----------

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.documents enable row level security;
alter table public.closed_days enable row level security;
alter table public.order_notes enable row level security;
alter table public.messages enable row level security;

create policy "zile închise: le vede oricine" on public.closed_days
  for select using (true);
create policy "zile închise: le schimbă adminul" on public.closed_days
  for all using (public.is_admin()) with check (public.is_admin());

create policy "note interne: doar adminii" on public.order_notes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "mesaje: le trimite oricine" on public.messages
  for insert to anon, authenticated with check (handled = false);
create policy "mesaje: le citește și le bifează adminul" on public.messages
  for select using (public.is_admin());
create policy "mesaje: le actualizează adminul" on public.messages
  for update using (public.is_admin()) with check (public.is_admin());

create policy "profil: propriu sau admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profil: doar propriul se modifică" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "adrese: doar proprii" on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "comenzi: proprii sau admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

create policy "istoric: al comenzilor proprii sau admin" on public.order_events
  for select using (
    public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "documente: proprii sau admin" on public.documents
  for select using (user_id = auth.uid() or public.is_admin());
create policy "documente: adaugă adminul" on public.documents
  for insert with check (public.is_admin());
create policy "documente: șterge adminul" on public.documents
  for delete using (public.is_admin());

-- Fișierele stau în documents/<id-ul clientului>/…
create policy "fișiere: proprii sau admin" on storage.objects
  for select using (
    bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "fișiere: încarcă adminul" on storage.objects
  for insert with check (bucket_id = 'documents' and public.is_admin());
create policy "fișiere: șterge adminul" on storage.objects
  for delete using (bucket_id = 'documents' and public.is_admin());
