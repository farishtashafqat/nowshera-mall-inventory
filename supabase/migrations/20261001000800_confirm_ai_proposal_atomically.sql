-- Phase 6: proposal confirmation lock and status transition are atomic.
create or replace function public.confirm_ai_proposal(p_proposal_id uuid)
returns public.stock_movements language plpgsql security definer set search_path=public as $$
declare proposal public.ai_stock_proposals; movement public.stock_movements;
begin
 select * into proposal from public.ai_stock_proposals where id=p_proposal_id and requested_by=auth.uid() for update;
 if not found then raise exception 'Proposal not found' using errcode='P0002'; end if;
 if proposal.status='CONFIRMED' then select * into movement from public.stock_movements where id=proposal.confirmed_movement_id; return movement; end if;
 if proposal.status<>'PENDING' then raise exception 'Proposal is no longer pending' using errcode='22023'; end if;
 movement:=public.record_stock_operation(proposal.product_id,proposal.movement_type,proposal.quantity,proposal.supplier_id,proposal.note,'AI');
 update public.ai_stock_proposals set status='CONFIRMED',confirmed_movement_id=movement.id,confirmed_at=now() where id=proposal.id;
 return movement;
end $$;
grant execute on function public.confirm_ai_proposal(uuid) to authenticated;

-- Cancellation is a locked PENDING -> CANCELLED transition. A concurrent
-- confirmation therefore cannot apply stock after a successful cancellation.
create or replace function public.cancel_ai_proposal(p_proposal_id uuid)
returns public.ai_stock_proposals language plpgsql security definer set search_path=public as $$
declare proposal public.ai_stock_proposals;
begin
 select * into proposal from public.ai_stock_proposals where id=p_proposal_id and requested_by=auth.uid() for update;
 if not found then raise exception 'Proposal not found' using errcode='P0002'; end if;
 if proposal.status='CANCELLED' then return proposal; end if;
 if proposal.status<>'PENDING' then raise exception 'Proposal is no longer pending' using errcode='22023'; end if;
 update public.ai_stock_proposals set status='CANCELLED' where id=proposal.id returning * into proposal;
 return proposal;
end $$;
grant execute on function public.cancel_ai_proposal(uuid) to authenticated;
