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
│   ├── issues/page.tsx   # Placeholder - "Coming Soon"
│   ├── error.tsx         # Error boundary
│   └── global-error.tsx  # Global error boundary
├── globals.css           # Tailwind config + CSS variables (light/dark)
├── api/
│   ├── auth/
│   │   ├── login/route.ts   # POST - cookie-based auth
│   │   └── logout/route.ts  # POST - clears auth cookie
│   └── costs/route.js       # GET - fetches from PostgreSQL view
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
- Reads from view: `public.view_proje_maliyet_ozeti`
- Schema columns: `rapor_yili`, `proje_kodu`, `source`, `kategori_lvl_1`, `kategori_lvl_2`, `toplam_tutar`
- Values are inverted (`-1 * toplam_tutar`) in the API query to fix sign conventions

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

## Key Patterns

- **Client-side data model**: All cost data fetched once via `/api/costs`, filtered on frontend using multi-select dropdowns per chart
- **Performance**: Memoized components (`memo`, `useMemo`, `useDeferredValue`), lazy row loading in DataGrid (50 rows at a time)
- **Project codes**: 22 known projects (HQ, ADM, SRY, THR, etc.) with hardcoded descriptions and sort order in `CostSummaryTable.tsx`
- **Sources**: Two office sources - ANK (Ankara) and BAG (Baghdad)
- **Categories**: Two-level hierarchy - `kategori_lvl_1` (e.g., MATERIAL COST, COMMON EXPENSES) and `kategori_lvl_2` (e.g., 21.13 - Turkish Staff)
- **Currency**: Formatted as USD with `Intl.NumberFormat`

## Commands

```bash
npm run dev      # Start development server (Turbopack, local Hyperdrive emulation)
npm run build    # Production build (webpack)
npm run start    # Start production server
npm run lint     # ESLint
npm run preview  # Build + local Workers preview
npm run deploy   # Build + deploy to Cloudflare Workers
```

## Deployment

Deployment is **manual** — there is no CI/CD pipeline. Pushing to GitHub does NOT trigger a build or deploy. The full deploy process from the local machine is:

```bash
# 1. Commit and push to GitHub
git add <files>
git commit -m "message"
git push

# 2. Build and deploy to Cloudflare Workers (requires Hyperdrive connection string)
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgresql://..." npm run deploy
```

The Hyperdrive connection string is required at build time because Next.js evaluates server components during the build. The value is stored in `.dev.vars` (git-ignored). Without it, the build will fail with a "no local hyperdrive connection string" error.

`npm run deploy` runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` which:
1. Builds the Next.js app with webpack
2. Bundles it for Cloudflare Workers via OpenNext
3. Uploads assets and the worker bundle via Wrangler

## Branches

- `main` — Cloudflare Workers version (current)
- `vercel-backup` — Original Vercel-compatible code
