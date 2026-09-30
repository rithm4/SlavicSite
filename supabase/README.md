# Conectarea conturilor de client (Supabase)

Până la conectare, cabinetul merge în **mod demonstrativ**: conturile și comenzile se păstrează doar în browserul
în care au fost create. După pașii de mai jos, conturile devin reale: se păstrează pe server, se pot folosi de pe
orice dispozitiv, parola se poate reseta prin e-mail, iar panoul admin e doar pentru voi.

Durează cam 15 minute.

## 1. Proiectul Supabase

1. Creați un cont pe [supabase.com](https://supabase.com) și apăsați **New project**.
2. Regiunea: **Central EU (Frankfurt)**, aproape de România, cu datele în UE.
3. Păstrați parola bazei de date într-un loc sigur (nu o puneți în site).

## 2. Baza de date

1. În proiect: **SQL Editor → New query**.
2. Lipiți tot conținutul fișierului [`schema.sql`](schema.sql) și apăsați **Run**.
   Se creează tabelele (profiluri, adrese, comenzi, istoricul statusurilor, documente), regulile de acces
   și spațiul pentru fișiere.

## 3. Adresele site-ului (pentru e-mailurile de confirmare și de resetare)

**Authentication → URL Configuration**:

- **Site URL**: adresa site-ului publicat, de exemplu `https://UTILIZATOR.github.io/SlavicSite/`
- **Redirect URLs**: adăugați aceeași adresă și `http://localhost:5173/` (pentru lucrul pe calculator).

Opțional, în **Authentication → Email Templates** puteți traduce în română e-mailurile de confirmare și de
resetare a parolei.

## 4. Cheile în site

În **Project Settings → API** găsiți **Project URL** și cheia **anon public**. Cheia anon e publică prin
natura ei; ce vede fiecare client stabilesc regulile din `schema.sql`.

- **Pe calculator**: copiați `.env.example` ca `.env.local` și completați cele două valori.
- **Pe GitHub** (pentru site-ul publicat): depozit → **Settings → Secrets and variables → Actions → Variables**
  → adăugați `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`. La următoarea publicare, site-ul folosește Supabase.

## 5. Contul de administrator

1. Creați-vă un cont obișnuit pe site (**Intră în cont → Cont nou pentru firmă**) și confirmați e-mailul.
2. În Supabase: **Authentication → Users**, copiați **UID**-ul contului.
3. **SQL Editor**, rulați (cu UID-ul vostru):

   ```sql
   insert into public.admins (user_id) values ('UID-UL-CONTULUI');
   ```

Din acest cont vedeți în cabinet linkul **Panou admin**: toate comenzile, schimbarea statusului, lista
clienților și încărcarea facturilor și certificatelor în contul fiecărui client.

## Bine de știut

- Numărul facturii proforme îl dă serverul (EV-anul-numărul), deci nu se mai poate repeta între browsere.
- Totalul comenzii se calculează în browser, după catalog. Înainte de producție, verificați factura proformă,
  ca la orice comandă primită.
- Comenzile făcute fără cont apar tot în panoul admin, cu mențiunea „fără cont”.
- Planul gratuit Supabase ajunge pentru început (50.000 de utilizatori activi pe lună, 500 MB de date,
  1 GB de fișiere). Proiectele gratuite se opresc după o săptămână fără nicio activitate; se repornesc din panou.
