# Supplier and fulfilment automation

The goal is to keep orders moving to suppliers and out to customers without you in the loop for routine work, while you stay in control of money and exceptions.

## Recommendation

**Use Claude Agent SDK agents on your existing Cloudflare stack, with an MCP server in front of the shop API, and Cloudflare Workflows for anything that takes days.**

The reasons:
- You already work with the Agent SDK and MCP, so there's no new framework to learn.
- An MCP server lets any agent framework use the same tools. That includes Claude, an OpenAI agent, n8n or LangGraph, so you aren't tied to one vendor.
- A purchase order can live for weeks: sent, confirmed, chased, shipped, received. Cloudflare Workflows (or Temporal, if you outgrow it) keeps that state durable, retries failures, and can sleep until a deadline. That job shouldn't sit inside an agent's context window.
- The guardrails are already enforced by the API rather than by prompts:
  - a spending limit,
  - no refunds or cancellations by agents,
  - an approval queue in `/admin`,
  - a full event log.

```
Stripe ──▶ Shop API (Worker + D1) ──▶ events outbox ──▶ Orchestrator (Cloudflare Workflows / cron)
                    ▲                                         │
                    │  /agent/* (API key)                     ▼
               MCP server  ◀──── tools ──── Agents (Claude Agent SDK)
                                                   │
                                      email / supplier portals / carriers
```

## Agents

| Agent | Triggered by | Does | Needs a human when |
|---|---|---|---|
| **Procurement** | `order.paid`, low stock | Picks a supplier per line (cost, lead time, reliability), raises purchase orders, batches small orders weekly | the PO is over the spending limit |
| **Supplier negotiator** | new PO, quote request | Emails suppliers for price and lead-time quotes, compares replies, counter-offers within set bounds | price exceeds a target margin, or terms change |
| **Fulfilment tracker** | daily, `po.updated` | Chases unconfirmed POs, records supplier dispatch, updates customer order status and tracking | a supplier misses a date by more than 3 days |
| **Customer service** | inbound email, `quote.created` | Drafts lodge quotes from the catalogue and discount rules, answers order-status questions | it's a refund, a complaint, or a custom design |
| **Catalogue and pricing** | weekly | Checks supplier price lists and margins, flags items to reprice | always: it proposes changes, you approve them |

Start with **Procurement** and **Fulfilment tracker**. Together they cover most of the day-to-day work.

## What the API already provides

Every agent call uses `Authorization: Bearer $AGENT_API_KEY`.

| Endpoint | Purpose |
|---|---|
| `GET /agent/events?after=<id>&type=` | Event feed: `order.paid`, `order.status_changed`, `quote.created`, `po.created`, `po.updated`. Store `next` and poll from it. |
| `GET /agent/orders?status=paid` | Orders to fulfil, with personalisation and delivery address |
| `PATCH /agent/orders/:id` | Set `in_production` or `shipped`, plus a tracking number. Refunds and cancellations are refused. |
| `GET/POST /agent/suppliers` | Suppliers, plus their SKU and cost per product |
| `GET/POST /agent/purchase-orders` | Raise a PO. Anything over `AGENT_PO_LIMIT_EUR` (cents, default €500) becomes `awaiting_approval`. |
| `PATCH /agent/purchase-orders/:id` | Move a PO through sent → confirmed → shipped → received. Agents can't move a PO that is waiting for approval. |

You approve or reject held POs in `/admin/`.

## Next steps when you're ready

1. **MCP server** (`agents/mcp/`): a thin wrapper exposing these endpoints as tools. It can run as a second Worker (the Cloudflare Agents SDK includes remote MCP support) or locally over stdio.
2. **Orchestrator**: a Cloudflare Workflow per PO, started from `order.paid`. Steps: choose supplier, raise PO, wait for confirmation (sleep until a deadline, then chase), wait for dispatch, update the customer.
3. **Email**: a dedicated supplier mailbox. Use Resend inbound or the Gmail API so agents can read and draft replies. Keep "send" behind approval at first, then relax it per supplier once trusted.
4. **Evals**: replay past orders through the procurement agent and compare its supplier choices with yours before letting it act.
5. **Observability**: the `events` table is the audit log. Add a weekly digest email of what agents did and what they cost.

Alternatives considered:
- **n8n**: good for simple if-this-then-that flows and quick to start, but weaker at negotiation and judgement calls. It can still call the same MCP tools.
- **LangGraph**: strong control over agent state, but Python-first and a second stack to run.
- **A helpdesk or ERP add-on** (e.g. Odoo): worth it once order volume justifies a full ERP. The API and events here can feed it.
