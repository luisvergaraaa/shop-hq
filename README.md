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

**AI CRM (also in `/hq`)**
- Leads – every inquiry with a stage (New → Contacted → Quoted → Booked → Won/Lost); website bookings and new jobs create leads automatically
- Inbox – paste a text you received; it's filed under the person and a reply is drafted
- Torque (assistant) – ask questions about your leads, jobs and money
- Approvals – every AI draft waits here; open it in Messages, send, tap "I sent it". Nothing is sent automatically
- Automations – drafts for new leads, due follow-ups, unanswered quotes, review requests
- Find leads – pulls local businesses (landscapers, contractors, dealers, delivery, property managers…) across the 309 from Google's business listings into your leads with their phone numbers, ready to dial. Needs `GOOGLE_PLACES_KEY`
- Funnel – leads by stage and by source; Insights – weekly AI summary; Import – paste a spreadsheet of leads

AI needs `ANTHROPIC_API_KEY` (Vercel → Settings → Environment Variables). Without it, drafts use simple templates. Optional: `AI_MODEL`, `REVIEW_LINK` (your Google review link), `CRON_SECRET` (enables the daily auto-check).

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
