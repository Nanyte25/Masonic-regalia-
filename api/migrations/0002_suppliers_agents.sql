-- Outbox of business events that automation agents consume (poll with ?after=<id>).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- order.paid | order.status_changed | quote.created | po.created | po.updated
  subject_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  country TEXT,
  lead_days INTEGER,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_products (
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  sku TEXT,
  unit_cost INTEGER,            -- EUR cents ex VAT
  PRIMARY KEY (supplier_id, product_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  order_id TEXT,                -- customer order it fulfils, if any
  status TEXT NOT NULL DEFAULT 'draft', -- awaiting_approval | draft | sent | confirmed | shipped | received | cancelled
  lines TEXT NOT NULL,          -- JSON [{product_id, qty, unit_cost, personalisation}]
  total_cost INTEGER NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,     -- 'agent' or admin user id
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS po_status ON purchase_orders(status);
