-- Demo data for a walkthrough. Apply with:
--   npx wrangler d1 execute regalia --remote --file scripts/seed-demo.sql
INSERT OR IGNORE INTO suppliers (id, name, email, country, lead_days, notes) VALUES
  ('sup_demo_embroidery', 'Demo Embroidery Works', 'orders@embroidery.example', 'IE', 14, 'Aprons and collars, lodge-number embroidery'),
  ('sup_demo_jewels', 'Demo Jewel Casting', 'trade@jewels.example', 'GB', 10, 'Officer and Grand rank jewels, rings');
INSERT OR IGNORE INTO supplier_products (supplier_id, product_id, sku, unit_cost) VALUES
  ('sup_demo_embroidery', 'ie-craft-mm-apron', 'DE-IE-MM', 1800),
  ('sup_demo_embroidery', 'ie-craft-pm-apron', 'DE-IE-PM', 2600),
  ('sup_demo_embroidery', 'ie-prov-apron', 'DE-IE-PROV', 3400),
  ('sup_demo_embroidery', 'ie-craft-officer-collar', 'DE-IE-COL', 1400),
  ('sup_demo_jewels', 'ie-craft-officer-jewel', 'DJ-OFF', 1100),
  ('sup_demo_jewels', 'ring-sq-compass', 'DJ-RING-SC', 7200);
INSERT OR IGNORE INTO purchase_orders (id, supplier_id, status, lines, total_cost, notes, created_by) VALUES
  ('po_demo_restock', 'sup_demo_embroidery', 'awaiting_approval',
   '[{"product_id":"ie-craft-mm-apron","qty":40,"unit_cost":1800}]', 72000,
   'Restock before installation season. Over the agent spending limit.', 'agent');
INSERT OR IGNORE INTO events (type, subject_id, data) VALUES
  ('po.created', 'po_demo_restock', '{"status":"awaiting_approval","total":72000}');
