-- Phase 4 compatibility: opening_stock is immutable initial quantity;
-- current_stock changes only through the stock-operation RPC.
alter table public.products
  drop constraint if exists products_opening_equals_current;

-- Preserve all other product checks, including non-negative current stock.
