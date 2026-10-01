-- Phase 6: stored, owner-bound proposals for exactly-once AI confirmation.
create type public.ai_proposal_status as enum ('PENDING','CONFIRMED','CANCELLED','FAILED');
create table public.ai_stock_proposals (
 id uuid primary key default gen_random_uuid(), requested_by uuid not null references public.profiles(id),
 product_id uuid not null references public.products(id), movement_type public.stock_movement_type not null,
 quantity numeric(12,3) not null check (quantity > 0), supplier_id uuid references public.suppliers(id), note text,
 status public.ai_proposal_status not null default 'PENDING', confirmed_movement_id uuid references public.stock_movements(id),
 created_at timestamptz not null default now(), confirmed_at timestamptz
);
alter table public.ai_stock_proposals enable row level security;
revoke all on public.ai_stock_proposals from anon, authenticated;
create policy proposals_read_own on public.ai_stock_proposals for select to authenticated using (requested_by=auth.uid());
create index ai_proposals_owner_status_idx on public.ai_stock_proposals(requested_by,status);
