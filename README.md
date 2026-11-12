# Shop HQ

Everything a one-person mobile diagnostic shop needs, in one Next.js app on Vercel.

**Public side**
- `/` – your website: services and prices, how it works, service area, "Book now"
- `/book` – booking form (service, vehicle, concern, time, location, contact)
- `/r/<link>` – the customer's report: trouble codes, your findings, estimate/invoice, and an Approve button

**Your HQ (`/hq`, password protected)**
- Overview – waiting requests, today's route, unpaid total, profit this week, tasks
- Requests – new online bookings; Accept or Decline in one tap
- Calendar – next two weeks of jobs
- Tasks – your to-do list
- Jobs – status steps (Scheduled → En route → Diagnosing → Awaiting approval → Repairing → Complete), trouble codes, line-item estimate, mark paid, call/text/directions buttons
- Customers – searchable by name, phone, vehicle or VIN, with full job history
- Invoices – unpaid and paid
- Weekly report – revenue, expenses, profit, average ticket, 8-week trend
- Expenses – log parts, fuel, tools, subscriptions
- Services & pricing – edit what shows on your website
- Setup – checks your settings and creates the database

## Put it online (about 15 minutes)

1. **GitHub**: create a new repository (e.g. `shop-hq`) and upload all the files in this folder.
2. **Vercel**: sign in with GitHub → **Add New → Project** → pick the `shop-hq` repo → **Deploy**. (The first deploy will work but show "database not set up"; that's expected.)
3. **Database**: in your Vercel project → **Storage** → **Create Database** → **Neon (Postgres)** → connect it to the project. This adds `DATABASE_URL` for you.
4. **Settings**: Project → **Settings → Environment Variables**, add these (see `.env.example`):
   - `ADMIN_EMAIL` – the email you'll log in with
   - `ADMIN_PASSWORD` – a long password (8+ characters)
   - `SHOP_NAME`, `SHOP_PHONE`, `SHOP_AREA`, `SHOP_TAGLINE` – your business details
   - `SHOP_TIMEZONE` – `America/Chicago`
5. **Redeploy**: Deployments → ⋯ on the latest → **Redeploy** (so the new settings take effect).
6. Open `your-site.vercel.app/login`, sign in, go to **Setup**, tap **Set up database**.
7. Go to **Services & pricing** and set your real prices. The starter prices are placeholders.

Optional: add your own domain under Project → Settings → Domains.

## Run it on a computer

```
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```
