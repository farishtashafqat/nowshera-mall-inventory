-- Phase 3 demo catalogue seed. Safe to run more than once.
-- Demo/test data only; it does not alter existing product or supplier records.

insert into public.suppliers (name, contact_person, phone, email, is_active)
values
  ('Fresh Foods Distributors', 'Adeel Khan', '03001234561', 'sales@freshfoods.example', true),
  ('Nowshera Wholesale Traders', 'Sana Iqbal', '03001234562', 'orders@nowsherawholesale.example', true),
  ('Tech Supply Pakistan', 'Hamza Ali', '03001234563', 'support@techsupply.example', true)
on conflict (name) do nothing;

with demo_products (name, sku, barcode, category_name, supplier_name, unit, opening_stock, low_stock_threshold, cost_price, selling_price) as (
  values
    ('Apples — 1 kg', 'FRT-APL-001', '8964001000001', 'Fruits & Vegetables', 'Fresh Foods Distributors', 'kg', 60::numeric, 15::numeric, 210::numeric, 280::numeric),
    ('Bananas — 1 kg', 'FRT-BAN-001', '8964001000002', 'Fruits & Vegetables', 'Fresh Foods Distributors', 'kg', 8::numeric, 15::numeric, 110::numeric, 150::numeric),
    ('Tomatoes — 1 kg', 'FRT-TOM-001', '8964001000003', 'Fruits & Vegetables', 'Fresh Foods Distributors', 'kg', 0::numeric, 10::numeric, 95::numeric, 130::numeric),
    ('Basmati Rice — 5 kg', 'GRC-RIC-005', '8964001000004', 'Grocery', 'Nowshera Wholesale Traders', 'pack', 35::numeric, 8::numeric, 1150::numeric, 1390::numeric),
    ('Cooking Oil — 1 litre', 'GRC-OIL-001', '8964001000005', 'Grocery', 'Nowshera Wholesale Traders', 'bottle', 9::numeric, 12::numeric, 510::numeric, 590::numeric),
    ('Sugar — 1 kg', 'GRC-SUG-001', '8964001000006', 'Grocery', 'Nowshera Wholesale Traders', 'kg', 50::numeric, 10::numeric, 155::numeric, 185::numeric),
    ('Men''s Cotton T-Shirt', 'CLT-MTS-001', '8964001000007', 'Clothing', 'Nowshera Wholesale Traders', 'piece', 24::numeric, 6::numeric, 650::numeric, 950::numeric),
    ('Women''s Casual Shirt', 'CLT-WCS-001', '8964001000008', 'Clothing', 'Nowshera Wholesale Traders', 'piece', 5::numeric, 8::numeric, 890::numeric, 1290::numeric),
    ('Type-C Cable', 'ELEC-CAB-001', '8964001234567', 'Electronics', 'Tech Supply Pakistan', 'piece', 15::numeric, 20::numeric, 210::numeric, 350::numeric),
    ('USB Wall Charger', 'ELEC-CHR-001', '8964001000010', 'Electronics', 'Tech Supply Pakistan', 'piece', 18::numeric, 5::numeric, 780::numeric, 1150::numeric),
    ('LED Bulb 12W', 'ELEC-LED-012', '8964001000011', 'Electronics', 'Tech Supply Pakistan', 'piece', 0::numeric, 10::numeric, 170::numeric, 250::numeric),
    ('Dishwashing Liquid 500ml', 'HOU-DSH-500', '8964001000012', 'Household', 'Nowshera Wholesale Traders', 'bottle', 28::numeric, 8::numeric, 165::numeric, 230::numeric),
    ('Laundry Detergent 1kg', 'HOU-LND-001', '8964001000013', 'Household', 'Nowshera Wholesale Traders', 'pack', 7::numeric, 10::numeric, 310::numeric, 420::numeric),
    ('Mineral Water 1.5L', 'BEV-WTR-150', '8964001000014', 'Beverages', 'Nowshera Wholesale Traders', 'bottle', 72::numeric, 20::numeric, 52::numeric, 70::numeric),
    ('Cola 1.5L', 'BEV-COL-150', '8964001000015', 'Beverages', 'Nowshera Wholesale Traders', 'bottle', 6::numeric, 12::numeric, 115::numeric, 150::numeric),
    ('Shampoo 400ml', 'PCR-SHM-400', '8964001000016', 'Personal Care', 'Nowshera Wholesale Traders', 'bottle', 20::numeric, 5::numeric, 390::numeric, 520::numeric),
    ('Toothpaste 100g', 'PCR-TPT-100', '8964001000017', 'Personal Care', 'Nowshera Wholesale Traders', 'piece', 0::numeric, 8::numeric, 145::numeric, 195::numeric),
    ('Potato Chips 60g', 'SNK-CHP-060', '8964001000018', 'Snacks', 'Nowshera Wholesale Traders', 'pack', 48::numeric, 15::numeric, 48::numeric, 70::numeric),
    ('Chocolate Biscuits 120g', 'SNK-BIS-120', '8964001000019', 'Snacks', 'Nowshera Wholesale Traders', 'pack', 11::numeric, 15::numeric, 76::numeric, 110::numeric),
    ('Salted Peanuts 100g', 'SNK-PNT-100', '8964001000020', 'Snacks', 'Nowshera Wholesale Traders', 'pack', 30::numeric, 8::numeric, 62::numeric, 90::numeric)
)
insert into public.products (name, sku, barcode, category_id, supplier_id, unit, opening_stock, current_stock, low_stock_threshold, cost_price, selling_price, is_active)
select d.name, d.sku, d.barcode, c.id, s.id, d.unit, d.opening_stock, d.opening_stock, d.low_stock_threshold, d.cost_price, d.selling_price, true
from demo_products d
join public.categories c on c.name = d.category_name
left join public.suppliers s on s.name = d.supplier_name
on conflict do nothing;
