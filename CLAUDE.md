# GORKEM Project Cost Dashboard

Internal web application for GORKEM company to display live accounting/cost data from a PostgreSQL database. Tracks construction project expenses across multiple projects, categories, and sources (ANK/BAG offices).

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, webpack bundler) with React 19
- **Language**: TypeScript (components) + JavaScript (API routes, DB layer)
- **Styling**: Tailwind CSS v4 with shadcn/ui (New York style, neutral base color)
- **Charts**: Recharts v3
- **Data Fetching**: SWR (client-side) with 60s deduping interval
- **Database**: PostgreSQL via `pg` driver through Cloudflare Hyperdrive
- **Hosting**: Cloudflare Workers via @opennextjs/cloudflare
- **Icons**: lucide-react
- **Fonts**: Geist Sans + Geist Mono

## Project Structure

```
app/
├── layout.tsx            # Root layout (fonts, global styles)
├── login/page.tsx        # Login page (public, no auth required)
├── (protected)/          # Route group with server-side auth check
│   ├── layout.tsx        # Auth guard - checks cookie, redirects to /login
│   ├── page.tsx          # Main dashboard (Cost Metrics) - client component
│   ├── received/page.tsx # Placeholder - "Coming Soon"
│   ├── balances/page.tsx # Placeholder - "Coming Soon"
│   ├── study/page.tsx    # Placeholder - "Coming Soon"
│   ├── issues/page.tsx   # Document management - SharePoint check/upload with filters
│   ├── error.tsx         # Error boundary
│   └── global-error.tsx  # Global error boundary
├── globals.css           # Tailwind config + CSS variables (light/dark)
├── api/
│   ├── auth/
│   │   ├── login/route.ts   # POST - cookie-based auth
│   │   └── logout/route.ts  # POST - clears auth cookie
│   ├── costs/route.js       # GET - fetches from PostgreSQL view
│   └── documents/
│       ├── route.js         # GET - fetches document records from view_muhasebe_konsolide
│       ├── check/route.js   # POST - checks document existence in SharePoint via Graph API
│       └── upload/route.js  # POST - uploads PDF files to SharePoint
components/
├── dashboard/
│   ├── NavHeader.tsx         # Sticky nav with sliding pill indicator, mobile menu, logout
│   ├── Header.tsx            # Legacy header (unused in current layout)
│   ├── MetricCard.tsx        # Stat card with gradient accents
│   ├── ChartCard.tsx         # Chart wrapper with multi-select filters (Year/Source/Project/Category)
│   ├── CostCharts.tsx        # 4 chart types: CategoryDistribution (Pie), Trends (Stacked Bar), TopExpenses (Horizontal Bar), StackedProject (Composed)
│   ├── CostSummaryTable.tsx  # Fixed spreadsheet-style table split by ANK/BAG with grand totals
│   └── DataGrid.tsx          # Filterable data table with pagination (50 rows/page), memoized rows
├── ui/                       # shadcn/ui primitives (button, card, table, select, badge, dialog, etc.)
│   └── multi-select.tsx      # Custom multi-select component
lib/
├── db.js                 # PostgreSQL per-request Client via Hyperdrive
├── sharepoint.js         # SharePoint Graph API integration (auth, folder listing, upload)
├── types.ts              # CostRecord, ChartDataPoint, YearlyDataPoint interfaces
└── utils.ts              # cn() (tailwind-merge) + formatCurrency (USD)
wrangler.jsonc            # Cloudflare Workers config + Hyperdrive binding
open-next.config.ts       # OpenNext adapter config
patches/
└── wrangler+4.69.0.patch # Windows fix: strips ?module from wasm file paths
```

## Database

- Connects to PostgreSQL via Cloudflare Hyperdrive (binding: `HYPERDRIVE`)
- Per-request `Client` connection (Workers can't share I/O across requests)
- **Cost dashboard view**: `public.view_proje_maliyet_ozeti` — columns: `rapor_yili`, `proje_kodu`, `source`, `kategori_lvl_1`, `kategori_lvl_2`, `toplam_tutar`
  - Values are inverted (`-1 * toplam_tutar`) in the API query to fix sign conventions
- **Documents view**: `public.view_muhasebe_konsolide` — columns used: `uniquecode`, `doc`, `date`, `projekodu`, `source`, `carifirma`, `aciklama`, `usd_degeri`, `partner`, `islemturu`, `cost`
  - `doc` column contains full SharePoint URLs for PDF documents
  - `islemturu` is a transaction type classification (TAH-CA, BN-CA, BN-CZ, KS-CA, KS-CZ, or blank)
  - `cost` is a numeric classification (not a dollar amount) — used for filtering cost/payment-related records

## Authentication

- Simple cookie-based auth (`auth_token` cookie, 24h expiry, httpOnly)
- Users defined in `USERS` var in wrangler.jsonc as JSON object `{"username": "password", ...}`
- Protected routes use `(protected)` route group with server-side cookie check in layout
- No hashing - plaintext password comparison

## Cloudflare Configuration

- **Worker name**: `muhasebe-dashboard`
- **Hyperdrive ID**: `baff2c90c33641ceb02b10d3c86568ff`
- **Custom domain**: `muhasebe.gorkemprojetakip.com.tr`
- **Workers.dev**: `muhasebe-dashboard.mustafaturker.workers.dev`
- **Compatibility flags**: `nodejs_compat`
- **Build**: Uses webpack (not Turbopack) — OpenNext doesn't support Turbopack yet
- **Windows patch**: `patches/wrangler+4.69.0.patch` fixes .wasm?module path issue on Windows

## Environment Variables

For local development, create `.dev.vars`:
```
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://user:pass@host:port/db
USERS={"username":"password"}
```

For production, `USERS` is set as a `vars` binding in `wrangler.jsonc`, and Hyperdrive handles the DB connection.

## SharePoint Integration

- **Auth**: Microsoft Graph API with client credentials flow (OAuth2)
- **Drive**: "Documentation" library on `gorkem.sharepoint.com`
- **Check flow**: `searchBasedCheck()` groups doc URLs by exact parent folder path, then uses `children` endpoint (not `search`) to list each folder's contents. Returns `{ results, stats }` with per-scope metadata and aggregate counts. Uses `children` instead of `search` because Graph API search index misses files in large folders.
- **Upload flow**: Simple PUT upload via Graph API (`< 4MB`), auto-creates folders
- **Credentials**: `SP_TENANT_ID`, `SP_CLIENT_ID`, `SP_CLIENT_SECRET`, `SP_DRIVE_ID` in wrangler.jsonc `vars`

## Issues Page (`/issues`)

- **Purpose**: Check which accounting documents exist in SharePoint, upload missing ones
- **Filters**: Year, Month (client-side), Source, Project, Partner, Trans. Type (`islemturu`), Cost (>0 / <=0), Status — all client-side filtered
- **Quick filters**:
  - **Urgent 1 / Acil 1**: Combo filter — Partner=GORKEM + Cost>0 + Missing + Above $10K
  - **Urgent 2 / Acil 2**: Combo filter — Partner=GORKEM + Cost>0 + Missing + $5K-$10K
  - Show Missing, Above $10K, $5K-$10K, Below $5K (amounts are negative in DB)
- **Language**: EN/TR toggle with full translations via static `translations` object
- **Summary cards**: 4 cards (Total Records, Checked, Uploaded, Missing) with partner breakdown rows (GORKEM, RSCC, Others, Total). Each row has 3 sub-columns: Head Office (ANK for GORKEM, ERB for RSCC), BAG (common), Total. Missing card shows `(XX%)` ratios per sub-column.
  - **Cost checkbox**: "Show only Cost & Payment Related" checkbox above cards filters card metrics to records with `cost > 0` (does not affect table).
- **Table columns**: #, Date, Code, Project, Source, Partner, Vendor (hidden lg), Description (hidden xl), Amount, Trans. Type (hidden lg), Cost (hidden lg), Status, Action
- **Activity log**: Shown after SharePoint check — displays per-scope listing results with API call counts
- **Batched check**: Doc URLs are split into batches of 10,000 (`BATCH_SIZE`) to avoid Cloudflare Worker 30s timeout. Results accumulate locally and are pushed to state only after ALL batches complete (prevents premature "missing" indicators). Auto-check runs for all cases (including "All Months").
- **Sticky layout**: Filter bar uses `sticky top-16 z-20`, thead uses `sticky z-10` with dynamic `top` based on filter bar height. Table wrapper uses `overflow-x-clip` (not `overflow-x-auto`) to avoid breaking sticky positioning.
- **Partner values**: Can be GORKEM, RSCC, blank, or other. Blank values use `__blank` sentinel for radix SelectItem compatibility.
- **Source mapping**: ANK = Ankara (GORKEM HQ), ERB = Erbil (RSCC HQ), BAG = Baghdad (shared)

## Key Patterns

- **Client-side data model**: All cost data fetched once via `/api/costs`, filtered on frontend using multi-select dropdowns per chart
- **Performance**: Memoized components (`memo`, `useMemo`, `useDeferredValue`), lazy row loading in DataGrid (50 rows at a time)
- **Project codes**: 22 known projects (HQ, ADM, SRY, THR, etc.) with hardcoded descriptions and sort order in `CostSummaryTable.tsx`
- **Sources**: Three office sources - ANK (Ankara/GORKEM HQ), ERB (Erbil/RSCC HQ), BAG (Baghdad/shared)
- **Categories**: Two-level hierarchy - `kategori_lvl_1` (e.g., MATERIAL COST, COMMON EXPENSES) and `kategori_lvl_2` (e.g., 21.13 - Turkish Staff)
- **Currency**: Formatted as USD with `Intl.NumberFormat`

## Commands

```bash
npm run dev      # Start development server (Turbopack, local Hyperdrive emulation)
npm run build    # Production build (webpack)
npm run start    # Start production server
npm run lint     # ESLint
npm run preview  # Build + local Workers preview
npm run deploy   # Build + deploy to Cloudflare Workers (needs HYPERDRIVE env var manually)
npm run ship     # Build + deploy with env vars auto-loaded from .dev.vars
```

**When user says "commit push and build"**, run exactly these 3 commands:
```bash
git add <files> && git commit -m "message"
git push
npm run ship
```
Do NOT run extra git status/diff/log commands. Keep it simple and fast.

## Deployment

Deployment is **manual** — there is no CI/CD pipeline. Pushing to GitHub does NOT trigger a build or deploy. The full deploy process from the local machine is:

```bash
# 1. Commit and push to GitHub
git add <files>
git commit -m "message"
git push

# 2. Build and deploy to Cloudflare Workers
npm run ship
```

`npm run ship` automatically reads the Hyperdrive connection string from `.dev.vars` and runs the full deploy pipeline. The connection string is required at build time because Next.js evaluates server components during the build.

Under the hood, `npm run ship` runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` which:
1. Builds the Next.js app with webpack
2. Bundles it for Cloudflare Workers via OpenNext
3. Uploads assets and the worker bundle via Wrangler

## Branches

- `main` — Cloudflare Workers version (current)
- `vercel-backup` — Original Vercel-compatible code
