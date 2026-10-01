-- Phase 3: catalogue foundation. Apply after both Phase 2 migrations.
create table public.categories (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 description text, doodle_icon text not null default 'grocery', is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint categories_doodle_check check (doodle_icon in ('produce','grocery','clothing','electronics','household','beverages','personal-care','snacks'))
);
create table public.suppliers (
 id uuid primary key default gen_random_uuid(), name text not null unique, contact_person text, phone text,
 email text, address text, notes text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint suppliers_email_check check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null, sku text not null unique, barcode text unique,
 category_id uuid not null references public.categories(id), supplier_id uuid references public.suppliers(id),
 unit text not null default 'piece', opening_stock numeric(12,3) not null default 0 check (opening_stock >= 0),
 current_stock numeric(12,3) not null default 0 check (current_stock >= 0),
 low_stock_threshold numeric(12,3) not null default 0 check (low_stock_threshold >= 0),
 cost_price numeric(12,2) not null default 0 check (cost_price >= 0), selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint products_opening_equals_current check (opening_stock = current_stock)
);
create index products_search_idx on public.products using gin (to_tsvector('simple', name || ' ' || sku || ' ' || coalesce(barcode,'')));
create index products_category_idx on public.products(category_id);
create trigger categories_updated before update on public.categories for each row execute procedure public.set_updated_at();
create trigger suppliers_updated before update on public.suppliers for each row execute procedure public.set_updated_at();
create trigger products_updated before update on public.products for each row execute procedure public.set_updated_at();
alter table public.categories enable row level security; alter table public.suppliers enable row level security; alter table public.products enable row level security;
revoke all on public.categories, public.suppliers, public.products from anon, authenticated;
create policy categories_read on public.categories for select to authenticated using (is_active or public.is_manager());
create policy suppliers_read on public.suppliers for select to authenticated using (is_active or public.is_manager());
create policy categories_manager_write on public.categories for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy suppliers_manager_write on public.suppliers for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy products_manager_write on public.products for all to authenticated using (public.is_manager()) with check (public.is_manager());
-- Staff get a deliberately non-financial projection. They have no select grant on products.
create view public.active_products_staff as select id, name, sku, barcode, category_id, supplier_id, unit, current_stock, low_stock_threshold, selling_price, is_active, created_at, updated_at from public.products where is_active = true;
grant select on public.categories, public.suppliers, public.active_products_staff to authenticated;
insert into public.categories (name, description, doodle_icon) values
 ('Fruits & Vegetables','Fresh market goods','produce'),('Grocery','Everyday essentials','grocery'),('Clothing','Apparel and accessories','clothing'),('Electronics','Devices and accessories','electronics'),('Household','Home essentials','household'),('Beverages','Drinks and refreshment','beverages'),('Personal Care','Care and wellness','personal-care'),('Snacks','Quick bites and treats','snacks');
