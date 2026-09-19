# Ledger — sales & customer book

Mobile-first app for the shop: daily orders, customer ledgers with dues and payments,
contractor sales, and PDF reports. It installs on phones (PWA), works offline, and syncs
through a shared Google Sheet so 3–4 people see the same data.

React 19 + TypeScript + Vite. No backend server: the Google Sheet (through a small Apps Script)
is the database, and GitHub Pages hosts the app for free.

## Project layout

```
src/
  app/          shell: routing, tab bar, sheet/back-button handling, PWA update prompt
  data/         types, IndexedDB storage, store, actions, ledger maths, stats, backup
  sync/         offline outbox + sync engine, record <-> Sheet row mapping
  features/     orders, customers, contractors, payments, items, reports (PDF), more
  ui/           shared components (Button, Sheet, fields, lists, toast, confirm…)
apps-script/Code.gs      Google Sheet backend (Apps Script web app)
vite-plugins/            service worker generator, local mock of the Sheet backend
.github/workflows/       build + deploy to GitHub Pages
```

## Develop

```bash
npm install
npm run dev
```

- App: http://localhost:8787
- A mock of the Google Sheet backend runs alongside at http://localhost:8788/exec (it runs the
  real `apps-script/Code.gs` against an in-memory sheet). Connect to it from **More → Google Sheet sync**.
  Open http://[::1]:8787 as a second "device" to watch changes sync. The mock sheet is empty after a restart.

```bash
npm test            # ledger maths, Sheet mapping, backup import, PDF generation
npm run typecheck
npm run build       # production build in dist/
```

## How the data works

- **Orders** are Pending, Completed or Cancelled. Only completed orders count as sales and go
  into the customer's ledger.
- **Payments** are separate entries (Cash / UPI / Bank, any amount, any date). A payment taken
  while creating an order is linked to it; payments from the customer page are general.
- **Customer balance** = opening balance + completed orders − payments. Per-order "paid/due"
  applies a linked payment to its own order first; everything else clears the oldest dues first.
- **Contractor**: each customer can have a default contractor, pre-filled on new orders and
  changeable per order. Contractor reports use the contractor on each order.

## Google Sheet backend (one-time)

1. Create a new, blank Google Sheet.
2. **Extensions → Apps Script**. Replace the sample code with all of `apps-script/Code.gs`, and save.
3. **Deploy → New deployment** → gear icon → **Web app**. Execute as: **Me**. Who has access: **Anyone**.
4. **Deploy**, approve the permissions (Google warns the app is unverified: **Advanced → Go to … (unsafe)**; it is your own script).
5. Copy the **Web app URL** (ends in `/exec`).

Tabs (Customers, Contractors, Items, Orders, Payments, Settings) are created when data first arrives.

**Updating `Code.gs` later:** **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**.
This keeps the same URL. A *new deployment* would get a new URL, and every phone would need to reconnect.

## Deploy on GitHub Pages

1. Push to the `main` branch of the GitHub repo.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` tests, builds and publishes on every push to `main`.
   The app is served at `https://<username>.github.io/<repo>/`.

Installed apps pick up a new version automatically: they show "A new version is ready · Reload".

## Connect the phones

1. On one device, open the app → **More → Google Sheet sync**, paste the Web app URL, tap **Connect**.
2. Tap **Copy setup link** and send it only to your team.
3. Each person opens the link, taps **Connect**, then installs the app:
   Android (Chrome) → menu → **Install app**; iPhone (Safari) → Share → **Add to Home Screen**.

**Anyone with the setup link or the `/exec` URL can read and change the data.** If it leaks,
create a new deployment, archive the old one, and share a new setup link.

## PIN lock

**Reports** (including the PDF buttons that lead there), **Google Sheet sync** and **Backup & restore**
ask for a 4-digit PIN. One unlock opens all three until the app is closed (it is kept in
`sessionStorage`); the lock button in those screens' headers locks them again straight away.

This keeps casual users on a shared phone out; it is not real security, because the check runs in
the browser. Only a salted SHA-256 of the PIN is in the code. To change the PIN, see the comment at
the top of `src/app/pinLock.ts`.

## Moving data over from the old `crm.html`

1. Open the old `crm.html` in the browser where it was used → **Items & Backup → Export Full Backup (.json)**.
2. In this app (connected to the Sheet): **More → Backup & restore → Restore backup**. Do this once,
   before the team starts. Paid orders become payment entries; orders marked Due (or not marked)
   show as due; each customer's latest contractor becomes their default.

## Editing directly in the Sheet

Edits typed into the Sheet reach the app on its next sync, and new rows get an id automatically.
Don't edit `_rev` and don't clear rows; to delete, set `deleted` to `TRUE`. In **Orders** and
**Payments**, the name/items/total columns are display copies and edits there are ignored.
Sync conflicts are settled per record: the most recent change wins.
