-- Phase 4: immutable stock audit and atomic inventory operations.
create type public.stock_movement_type as enum ('OPENING','STOCK_IN','SALE','DAMAGE');
create type public.stock_movement_source as enum ('FORM','AI');
create table public.stock_movements (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 movement_type public.stock_movement_type not null, quantity numeric(12,3) not null check (quantity > 0),
 stock_before numeric(12,3) not null check (stock_before >= 0), stock_after numeric(12,3) not null check (stock_after >= 0),
 supplier_id uuid references public.suppliers(id), note text, performed_by uuid references public.profiles(id),
 source public.stock_movement_source not null default 'FORM', created_at timestamptz not null default now(),
 constraint stock_movement_supplier_check check ((movement_type = 'STOCK_IN') or supplier_id is null),
 constraint stock_movement_effect_check check ((movement_type in ('OPENING','STOCK_IN') and stock_after = stock_before + quantity) or (movement_type in ('SALE','DAMAGE') and stock_after = stock_before - quantity))
);
create index stock_movements_product_created_idx on public.stock_movements(product_id, created_at desc);
create index stock_movements_created_idx on public.stock_movements(created_at desc);
alter table public.stock_movements enable row level security;
revoke all on public.stock_movements from anon, authenticated;
create policy stock_history_read on public.stock_movements for select to authenticated using (true);
-- Product quantities can only be written by the security-definer RPC below.
revoke update (current_stock, opening_stock) on public.products from authenticated;

create or replace function public.record_stock_operation(
 p_product_id uuid, p_movement_type public.stock_movement_type, p_quantity numeric,
 p_supplier_id uuid default null, p_note text default null, p_source public.stock_movement_source default 'FORM'
) returns public.stock_movements language plpgsql security definer set search_path = public as $$
declare p public.products; before_stock numeric(12,3); after_stock numeric(12,3); m public.stock_movements;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero' using errcode='22023'; end if;
 if p_source = 'FORM' and p_movement_type = 'OPENING' then raise exception 'Opening stock is system-managed' using errcode='22023'; end if;
 select * into p from public.products where id=p_product_id and is_active for update;
 if not found then raise exception 'Active product not found' using errcode='P0002'; end if;
 if p_movement_type='STOCK_IN' and p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and is_active) then raise exception 'Active supplier not found' using errcode='P0002'; end if;
 if p_movement_type='DAMAGE' and coalesce(trim(p_note),'')='' then raise exception 'Damage reason is required' using errcode='22023'; end if;
 before_stock:=p.current_stock;
 if p_movement_type in ('STOCK_IN','OPENING') then after_stock:=before_stock+p_quantity; else after_stock:=before_stock-p_quantity; end if;
 if after_stock < 0 then raise exception 'Cannot remove % units. Only % units are available.',p_quantity,before_stock using errcode='22023'; end if;
 update public.products set current_stock=after_stock where id=p_product_id;
 insert into public.stock_movements(product_id,movement_type,quantity,stock_before,stock_after,supplier_id,note,performed_by,source)
 values(p_product_id,p_movement_type,p_quantity,before_stock,after_stock,p_supplier_id,p_note,auth.uid(),p_source) returning * into m;
 return m;
end $$;
grant execute on function public.record_stock_operation(uuid,public.stock_movement_type,numeric,uuid,text,public.stock_movement_source) to authenticated;
-- Existing catalogue quantities gain exactly one opening audit row.
insert into public.stock_movements(product_id,movement_type,quantity,stock_before,stock_after,note,source)
select p.id,'OPENING',p.opening_stock,0,p.opening_stock,'Phase 3 opening stock backfill','FORM' from public.products p
where p.opening_stock > 0 and not exists(select 1 from public.stock_movements m where m.product_id=p.id and m.movement_type='OPENING');
