# Ashlar Regalia

An international online shop for Masonic regalia, jewellery and books, starting with the Irish market.

- **Storefront**: an [Astro](https://astro.build) static site, published to GitHub Pages.
- **API**: a Cloudflare Worker with a D1 (SQLite) database. It handles Stripe card payments, accounts, orders, lodge quotes, the admin area and the automation-agent API.
- **Shared catalogue and pricing** (`shared/`): the browser uses this to show prices, and the API uses it to calculate what is actually charged, so a buyer can't alter prices in their browser.

```
shared/   catalogue.ts (products), pricing.ts (VAT, currency, delivery, lodge discounts)
web/      Astro storefront → GitHub Pages
api/      Cloudflare Worker → Stripe, D1, OAuth, admin, agent API
docs/     design notes (agents.md: supplier automation plan)
```

## What's in it

**Shop**
- Irish Constitution first, plus English and Scottish ranges. Every item is tagged by order (Craft, Royal Arch, Knight Masons, Prince Masons, Preceptory) and by rank.
- A "Find your regalia" picker: choose your order and rank to get the right apron, collar and jewel. It follows the Irish rule that Provincial and Grand Officers wear gilt jewels.
- Search and filters by constitution, order, type and rank. Filtered views can be shared as links.
- Product options (office, metal, size) and personalisation (lodge-number embroidery, engraving) are priced live.
- Buyers must confirm the constitution before adding constitution-specific regalia to the basket.
- Live stock levels and made-to-order lead times.
- Lodge bulk discounts: 5% off 5 or more of an item, 10% off 10 or more.
- Delivery regions: Ireland, EU, UK (including Northern Ireland) and rest of world. Prices are shown in EUR, GBP or USD.
- Irish VAT at 23% is included for Ireland and the EU, and removed for exports.
- Ritual books (sold openly), jewellery, gifts, cases and gloves.
- Lodge quote form, regalia and sizing guide, delivery and returns, privacy and terms templates.

**Payments**
- Stripe Checkout takes cards, Apple Pay and Google Pay. Card data never touches this site.
- Signed webhooks mark orders paid, reduce stock, record the delivery address and the lodge entered at checkout, and email the shop.
- Refunds made in the Stripe dashboard update the order automatically.

**Accounts**
- Register with email and password, or sign in with Google or Facebook. Each button appears only once its keys are set.
- Member area: order history and tracking, lodge and profile details, saved items, lodge quotes, password change, account deletion.
- Guest checkout. Guest orders link to an account when the buyer later registers with the same email.
- Password reset by email (needs Resend).

**Admin** (`/admin/`, for emails listed in `ADMIN_EMAILS`)
- Orders: personalisation details, delivery address, status (to make, being made, shipped) and tracking number. The customer is emailed when an order ships.
- Supplier purchase orders raised by agents, with approve and reject for anything over the spending limit.
- Lodge quote pipeline.

**Automation agents**: see [docs/agents.md](docs/agents.md).

### About Instagram sign-in
Meta's Instagram login only works for Business and Creator accounts, and Meta doesn't approve it as a way for shoppers to sign in. Instagram users sign in with **Facebook**, which uses the same Meta account. The sign-in page says so.

## Monday demo checklist (about 30 minutes)

The storefront deploys as soon as the repo is pushed. The API needs a free Cloudflare account and a Stripe test account.

1. **GitHub Pages**: Settings → Pages → Source: **GitHub Actions**.
2. **Cloudflare** (free): create an API token with the *Edit Cloudflare Workers* template plus *D1 Edit*, and copy your Account ID.
3. **Stripe** (test mode): copy the secret key (`sk_test_…`). Add a webhook endpoint `https://regalia-api.<your-subdomain>.workers.dev/webhook` for these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` and `charge.refunded`. Copy its signing secret (`whsec_…`).
4. In **Settings → Secrets and variables → Actions**, add:

   | Secret | Required | Notes |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | yes | deploys the API and creates the database |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | yes | payments |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | later | redirect URI: `<worker>/auth/oauth/google/callback` |
   | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | later | redirect URI: `<worker>/auth/oauth/facebook/callback` |
   | `RESEND_API_KEY`, `MAIL_FROM`, `SHOP_NOTIFY_EMAIL` | optional | password reset and order emails |
   | `AGENT_API_KEY` | optional | a long random string for automation agents |

   Under **Variables**, set `ADMIN_EMAILS` to your email.
5. Re-run the **Test and deploy** workflow. The API job prints the Worker URL, and the site is built to call it automatically.
6. Register on the site with your admin email, then open `/admin/`.
7. Demo a purchase with Stripe's test card `4242 4242 4242 4242`, any future expiry date and any CVC.

## Local development

```bash
cd api && npm ci
cp .dev.vars.example .dev.vars          # add test keys
npx wrangler d1 migrations apply regalia --local
npx wrangler dev                        # http://localhost:8787

cd ../web && npm ci
echo "PUBLIC_API_URL=http://localhost:8787" > .env
npx astro dev                           # http://localhost:4321
```

For webhooks locally: `stripe listen --forward-to localhost:8787/webhook`.

Tests: `cd api && npx vitest run`. They cover pricing, VAT, discounts, webhook signatures and password hashing.

## Before going live

- Replace the sample catalogue in `shared/catalog.ts` with real products, prices, stock and photos. Check apron and collar specifications against the Grand Lodge of Ireland's rules on clothing and insignia.
- Have a solicitor review `/terms/` and `/privacy/`.
- Update the shop name, email and address in `web/src/site.ts`.
- Decide on VAT for EU consumers: once EU distance sales exceed €10,000 a year, register for OSS and charge each country's own rate. Stripe Tax can automate this.
- Switch Stripe to live keys.
- Add Cloudflare rate limiting on `/auth/*`.
- Use a custom domain (set the `SITE_URL` variable).

The shop is independent and is not affiliated with any Grand Lodge.
