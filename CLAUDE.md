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
- **PDF**: pdfjs-dist v5.5.207 (rendering/thumbnails), pdf-lib (page extraction), jsPDF + jspdf-autotable (PDF export)
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
│   ├── upload/page.tsx   # Split-pane PDF upload workflow (day-scoped records + PDF page extraction)
│   ├── cashflow/page.tsx  # Cumulative cash flow chart (Cost vs Spent per project)
│   ├── cost-codes/page.tsx # Cost code (masraf merkezi) tracking — find missing cost codes
│   ├── error.tsx         # Error boundary
│   └── global-error.tsx  # Global error boundary
├── globals.css           # Tailwind config + CSS variables (light/dark)
├── api/
│   ├── auth/
│   │   ├── login/route.ts   # POST - cookie-based auth
│   │   └── logout/route.ts  # POST - clears auth cookie
│   ├── auto-match/
│   │   ├── ocr/route.js     # POST - downloads PDF from SharePoint + Mistral OCR → returns markdown per page
│   │   ├── match/route.js   # POST - DeepSeek Reasoner matching (OCR pages + records → match matrix)
│   │   └── pdf/route.js     # GET - proxy to download scanned PDF from SharePoint for client rendering
│   ├── cashflow/route.js    # GET - monthly aggregated cash flow from view_muhasebe_konsolide
│   ├── costs/route.js       # GET - fetches from PostgreSQL view
│   ├── cost-codes/
│   │   ├── classify/route.js  # POST - AI cost code classification via DeepSeek Reasoner
│   │   └── save/route.js      # POST - writes cost codes to SharePoint Excel files via Graph Workbook API
│   └── documents/
│       ├── route.js         # GET - fetches document records from view_muhasebe_konsolide (supports ?includeMissingDocs=true to skip doc filter)
│       ├── check/route.js     # POST - checks document existence in SharePoint via Graph API
│       ├── thumbnail/route.js # GET - fetches SharePoint document thumbnail via Graph API
│       └── upload/route.js    # POST - uploads PDF files to SharePoint, returns metadata (id, timestamps, createdBy)
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
- **Documents view**: `public.view_muhasebe_konsolide` — columns used: `uniquecode`, `doc`, `date`, `projekodu`, `source`, `carifirma`, `aciklama`, `usd_degeri`, `partner`, `islemturu`, `cost`, `giris_tutar`, `cikis_tutar`, `parabirimi`, `masrafmerkezi`, `forgotten_cost`
  - `doc` column contains full SharePoint URLs for PDF documents
  - `islemturu` is a transaction type classification (TAH-CA, BN-CA, BN-CZ, KS-CA, KS-CZ, or blank)
  - `cost` is a numeric classification (not a dollar amount) — used for filtering cost/payment-related records
  - `giris_tutar` / `cikis_tutar` are incoming/outgoing amounts in local currency (`parabirimi`). Values can be negative in DB — use `Math.abs()` for display.
  - `parabirimi` is the currency code (e.g., USD, TRY, IQD)
  - `masrafmerkezi` is a 4-level cost code assigned by accountants. Required when `islemturu` is TAH-CA, KS-CZ, or BN-CZ.
  - `forgotten_cost` is a numeric column for unclassified cost amounts — used in cash flow calculations for records with empty `masrafmerkezi`

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

- `DEEPSEEK_API_KEY` — API key for DeepSeek Reasoner (AI cost code classification + auto-match), set in wrangler.jsonc `vars`
- `MISTRAL_API_KEY` — API key for Mistral OCR (scanned PDF text extraction for auto-match), set in wrangler.jsonc `vars`

## SharePoint Integration

- **Auth**: Microsoft Graph API with client credentials flow (OAuth2)
- **Drive**: "Documentation" library on `gorkem.sharepoint.com`
- **Check flow**: `searchBasedCheck()` groups doc URLs by exact parent folder path, then uses `children` endpoint (not `search`) to list each folder's contents. Returns `{ results, stats }` with per-scope metadata and aggregate counts. Uses `children` instead of `search` because Graph API search index misses files in large folders.
- **Upload flow**: Simple PUT upload via Graph API (`< 4MB`), auto-creates folders, supports overwrite of existing files
- **Excel write flow**: Graph Workbook API with persistent sessions (`persistChanges: true`). Create session → unprotect sheet → read rows → write cell via PATCH → close session. Sessions must always be closed (use try/finally).
- **Credentials**: `SP_TENANT_ID`, `SP_CLIENT_ID`, `SP_CLIENT_SECRET`, `SP_DRIVE_ID` in wrangler.jsonc `vars`

## Issues Page (`/issues`)

- **Purpose**: Check which accounting documents exist in SharePoint, upload missing ones
- **Filters**: Year, Month (client-side), Source, Project, Partner, Trans. Type (`islemturu`), Cost (>0 / <=0), Status — all client-side filtered
- **Quick filters**:
  - **Urgent 1 / Acil 1**: Combo filter — Partner=GORKEM + Cost>0 + Missing + Above $10K
  - **Urgent 2 / Acil 2**: Combo filter — Partner=GORKEM + Cost>0 + Missing + $5K-$10K
  - Show Missing, Above $10K, $5K-$10K, Below $5K (amounts are negative in DB)
- **Language**: EN/TR toggle with full translations via static `translations` object (default: TR)
- **Summary cards**: 4 cards (Total Records, Checked, Uploaded, Missing) with partner breakdown rows (GORKEM, RSCC, Others, Total). Each row has 3 sub-columns: Head Office (ANK for GORKEM, ERB for RSCC), BAG (common), Total. Missing card shows `(XX%)` ratios per sub-column.
  - **Cost checkbox**: "Show only Cost & Payment Related" checkbox above cards filters card metrics to records with `cost > 0` (does not affect table).
- **Table columns**: #, Date, Code, Project, Source, Partner, Vendor (hidden lg), Description (hidden xl), Amount, Trans. Type (hidden lg), Cost (hidden lg), Status, Action
- **Activity log**: Shown after SharePoint check — displays per-scope listing results with API call counts
- **Batched check**: Doc URLs are split into batches of 10,000 (`BATCH_SIZE`) to avoid Cloudflare Worker 30s timeout. Results accumulate locally and are pushed to state only after ALL batches complete (prevents premature "missing" indicators). Auto-check runs for all cases (including "All Months").
- **Sticky layout**: Filter bar uses `sticky top-16 z-20`, thead uses `sticky z-10` with dynamic `top` based on filter bar height. Table wrapper uses `overflow-x-clip` (not `overflow-x-auto`) to avoid breaking sticky positioning.
- **Partner values**: Can be GORKEM, RSCC, blank, or other. Blank values use `__blank` sentinel for radix SelectItem compatibility.
- **Source mapping**: ANK = Ankara (GORKEM HQ), ERB = Erbil (RSCC HQ), BAG = Baghdad (shared)
- **PDF export**: Uses jsPDF + jspdf-autotable. Loads DejaVu Sans TTF from jsdelivr CDN for Turkish character support, with ASCII sanitize fallback if font fails to load. Columns: #, Date, Code, Project, Source, Partner, Vendor, Description, Giris, Cikis, Trans. Type, Status (Yuklu/Eksik with colors).

## Upload Page (`/upload`)

- **Purpose**: Efficient daily workflow — load a multi-page PDF, select specific pages per record, extract & upload to SharePoint
- **Language**: EN/TR toggle (default: TR)
- **Date selection**: Year + Month + Day (all required) — fetches day-scoped records from `/api/documents?year=X&month=Y&day=Z`
- **Layout**: Split-pane with fixed height `h-[calc(100vh-280px)]`. Left panel (40%) = scrollable record cards. Right panel (60%) = PDF operations (sticky removed, internal scroll).
- **Left panel — Record cards**: Compact single-row cards showing status icon, uniquecode, badges (project/source/partner), islemturu, giris/cikis amounts with parabirimi, eye button (details dialog), document preview button (for uploaded records)
- **Right panel — PDF operations**:
  - Scrollable area (top): PDF drop zone (drag & drop or click, compact inline row when file loaded), selected record card (uniquecode, vendor, amounts, target filename), PDF page thumbnails rendered via pdfjs-dist (canvas at 0.4x scale) with view button for high-res preview (2.0x, dialog at 95vw width), page range text input (e.g., "1-3, 5, 7-9") with `parsePageRange()` helper
  - Pinned bottom bar: Upload button — uses pdf-lib to extract selected pages, POST to `/api/documents/upload`. Always visible, separated by border-t from scrollable content above.
- **Overwrite support**: Upload button stays enabled for already-uploaded documents, allowing re-upload (SharePoint PUT overwrites automatically)
- **Post-upload metadata**: Upload API returns SharePoint item metadata (`id`, `createdDateTime`, `lastModifiedDateTime`, `createdBy`). Client populates `fileMetadata` on success so the document preview icon (FileText) appears immediately without re-check.
- **Document preview**: For records with existing uploads, FileText icon opens a dialog that fetches SharePoint thumbnail via `/api/documents/thumbnail` and links to original document
- **Activity log**: Collapsed by default — user can expand manually. Not auto-opened after check completes.
- **SharePoint auto-check**: Same batched check as Issues page (BATCH_SIZE=10000) — runs automatically after data fetch

### Auto-Match Feature (on Upload Page)

- **Purpose**: Automatically match scanned PDF pages to accounting records using OCR + AI, primarily for 2024 backfill. Scanned PDFs for BAG source are stored in SharePoint at a known path.
- **Scanned PDF location**: `SUBELER/GRJV/COMMON/06.ACCOUNTING/02.REPORTS/{year} Attachments/{MM}-{year}/{day}.pdf` (only BAG, no ANK documents in this path). Day is NOT zero-padded (`1.pdf`, `15.pdf`), month IS zero-padded (`01-2024`).
- **Two-step API pipeline** (split to avoid Cloudflare Worker 30s timeout):
  1. **OCR step** (`POST /api/auto-match/ocr`): Downloads PDF from SharePoint → sends to Mistral OCR API (`mistral-ocr-latest`) as base64 → returns markdown text per page. Uses chunked `arrayBufferToBase64()` for large PDFs.
  2. **Match step** (`POST /api/auto-match/match`): Sends all OCR page markdowns + all day records to DeepSeek Reasoner in a single request → returns match matrix JSON. Fallback to `deepseek-chat` on failure. **This is a single API call (not per-record) but can take 5-15 minutes** for days with many records/pages due to large context + chain-of-thought reasoning.
  3. **PDF proxy** (`GET /api/auto-match/pdf`): Downloads PDF from SharePoint for client-side thumbnail rendering via pdfjs-dist.
- **Matching strategy** (in DeepSeek system prompt): Primary = amounts (giris_tutar/cikis_tutar), Secondary = vendor name (carifirma), Tertiary = description keywords (aciklama)
- **Administrative page skipping**: System prompt instructs AI to skip the first N pages which are always administrative:
  1. Cash Report Summary pages (keywords: CASH REPORT SUMMARY, PROJE KASASI, BANK ACCOUNT, TOTAL IN, TOTAL OUT, NET)
  2. Daily Accounting Report pages (header: GÜNLÜK MUHASEBE RAPORU, or dense tabular rows with Sira/Firma/Proje Kodu/etc.)
  - Processing starts from the first standalone voucher page (GİDER PUSULASI, VİRMAN DEKONTU, bank receipts, invoices, etc.)
- **Match matrix output**: `[{uniquecode, pages: [1,3], confidence: "high"|"medium"|"low"|"unmatched", reason: "..."}]` — pages are 1-indexed. Many-to-many: one page can match multiple records, one record can span multiple pages.
- **Record fields sent to AI**: uniquecode, carifirma, aciklama, giris_tutar, cikis_tutar, parabirimi, projekodu, islemturu
- **Pricing**: Mistral OCR = $0.002/page. DeepSeek Reasoner = standard token pricing.
- **UI elements**:
  - **Auto-Match button** (violet, Wand2 icon) — appears in date bar after records load. Shows "OCR calisiyor..." then "AI eslestiriyor..." progress.
  - **Confidence badges** on record cards: green (high), amber (medium), red (low), gray (unmatched). Hover shows AI reasoning.
  - **Matched page previews** — mini thumbnails in selected record section showing which pages are matched.
  - **Results summary panel** (violet) — shows matched count, OCR/AI cost, duration, model info, debug toggle for AI reasoning.
  - **Save High Only button** (green) — saves only high-confidence matches.
  - **Save All Matches button** (outlined violet) — saves all non-unmatched records.
  - **Manual override tracking**: When user changes page selection for a record and switches away, the change is saved in `matchOverrides` Map. Badge changes to blue "edited". Save All/Save High uses overrides where they exist, never reverting to AI's original suggestion.
  - **PDF auto-loaded from SharePoint** — drop zone shows "SharePoint PDF" with wand icon when loaded via auto-match.
- **Batch save flow**: Iterates matched records sequentially, for each: pdf-lib extracts pages → POST to `/api/documents/upload`. Marks pages as used, updates file statuses.

### Auto-Match Month Feature (on Upload Page)

- **Purpose**: Process an entire month of BAG documents at once — OCR all days, AI match all days, cache results in localStorage for later review day-by-day.
- **Button**: "Aylik Eslestir" / "Auto-Match Month" (teal, CalendarDays icon) — always visible in date bar. Turns into red "Cancel" button while running.
- **Full pipeline** (client-orchestrated, all via existing API routes):
  1. **Fetch**: GET `/api/documents?year=X&month=Y` (all month records, no day filter)
  2. **SharePoint check**: Batched check (BATCH_SIZE=10000) for all month records
  3. **Filter**: Identify BAG records with missing docs, group by day. Days with 0 missing BAG records are skipped.
  4. **OCR phase**: Sequential calls to `POST /api/auto-match/ocr`, one per day, **1-second gap** between calls (Mistral free tier rate limit). On failure: retry 2 more times with 10-second wait. On 404 (no PDF): log and skip. On 3rd failure: log error and continue.
  5. **DeepSeek phase**: All days sent **concurrently** via `POST /api/auto-match/match` (one Worker invocation per day). DeepSeek context caching makes the shared system prompt 10x cheaper after the first call. On failure: log error and continue (no retry).
  6. **Progressive save**: After each DeepSeek response, results are immediately saved to localStorage. If browser crashes after 15/20 days, those 15 days are preserved.
- **localStorage key**: `monthlyAutoMatch_{year}_{MM}` (e.g., `monthlyAutoMatch_2024_03`)
- **localStorage structure**: `MonthlyMatchData` — `{ year, month, startedAt, completedAt, dayResults: Record<day, MonthlyMatchDayResult>, errors: [], totalOcrCost, totalDeepseekCost, totalOcrPages }`
- **Calendar grid**: Shows all days of the month in a Mon–Sun calendar layout with live status per cell:
  - `no-records` (faint gray): no records exist for this day
  - `no-missing` (light green, ✓): all BAG docs already uploaded
  - `queued` (gray, …): waiting to process
  - `ocr` (amber, pulse animation): currently doing OCR
  - `ocr-retry` (amber, slow pulse, ⟳): retrying OCR after failure
  - `ocr-done` (solid amber, ✓O): OCR done, waiting for AI
  - `no-pdf` (yellow, !P): scanned PDF not found in SharePoint
  - `deepseek` (violet, pulse, AI): AI matching in progress
  - `done` (green, ✓): completed successfully
  - `error` (red, ✗): failed
  - Red badge on cells shows count of missing BAG records
- **Progress panel** (teal themed): Phase badge, OCR progress bar, AI progress bar, auto-scrolling log panel with color-coded entries (info/success/warn/error), close button when done.
- **Cancel support**: Cancel button sets `monthlyAbortRef`, checked between OCR calls and before DeepSeek calls. `beforeunload` event warns user before closing tab during processing.
- **"Show Matched Records" button** (emerald, Wand2 icon): Appears after "Bring Data" when localStorage has cached results for the current day. Loads stored matches into `autoMatchResults` state so existing badge/save UI works. Also downloads the correct day's PDF from SharePoint for thumbnails and save capability. Always clears previous day's PDF before loading new one.
- **DeepSeek has NO batch API**: Despite the name "batch", all DeepSeek calls are regular `/v1/chat/completions` requests sent concurrently. DeepSeek does not support `/v1/batches` or `/v1/files` endpoints.

## Cash Flow Page (`/cashflow`)

- **Purpose**: Cumulative cash flow chart per project — shows Cost vs Spent over time
- **Data source**: `view_muhasebe_konsolide` (NOT `view_proje_maliyet_ozeti` — the cost metrics view lacks `islemturu` and monthly granularity)
- **API**: `/api/cashflow?project=XX&source=YY` — returns monthly aggregated data (`yr`, `mo`, `total_cost`, `total_spent`)
- **Chart**: Recharts `LineChart` with two cumulative lines (indigo=Cost, emerald=Spent), full-width
- **Filters**: Project selector (single-select, required), Source (ANK/BAG only — ERB excluded)
- **Summary cards**: Total Cost, Total Spent, Difference
- **Tooltip**: Shows Cost, Spent, and Difference on hover
- **Calculation filters info panel**: Shown below chart, displays exact filters for each line
- **Base filters** (both lines): `partner = 'GORKEM'`, `source != 'ERB'`, `cost > 0`, data from `view_muhasebe_konsolide`
- **Cost line calculation**:
  - `SUM(-1 * usd_degeri)` where `islemturu NOT IN ('KS-CA', 'BN-CA')`
  - Plus **unclassified cost** (records with empty `masrafmerkezi`):
    1. `SUM(-1 * forgotten_cost)` — all transaction types
    2. `SUM(-1 * usd_degeri)` — where `islemturu NOT IN ('KS-CA', 'BN-CA')`
- **Spent line calculation**:
  - `SUM(-1 * usd_degeri)` where `islemturu != 'TAH-CA'`
  - Includes KS-CA and BN-CA (only TAH-CA excluded)
- **Cumulative calc**: Client-side via `useMemo` — iterates monthly data sorted by yr/mo, accumulates running totals
- **SWR**: Conditional fetching — only fetches when a project is selected

## Cost Codes Page (`/cost-codes`)

- **Purpose**: Track and manage missing cost codes (masraf merkezi) in accounting records
- **Language**: EN/TR toggle (default: TR)
- **Date selection**: Year + Month (with "All Months" option) — fetches records via `/api/documents?year=X&month=Y&includeMissingDocs=true`
- **No SharePoint check**: This page only displays DB records, no document checking/upload
- **Cost code rule**: Records with `islemturu` in (TAH-CA, KS-CZ, BN-CZ) REQUIRE a cost code (`masrafmerkezi`)
- **Quick filter**: "Show Missing Cost Codes" — filters to records that require but are missing cost codes
- **Summary badges**: Total Records, Requires Cost Code, Missing, Filled, Completion %
- **Table columns**: #, Date, Code, Project, Source, Partner, Vendor, Description, Trans. Type, Cost Code, In, Out, Currency, Cost
- **Visual indicators**: Missing cost code rows highlighted in rose; transaction types requiring codes shown in amber badges; filled cost codes in green; AI-suggested codes in violet with Sparkles icon
- **Filters**: Source, Project, Partner, Trans. Type, Cost (client-side multi-select), date range, text search
- **AI Classification**: DeepSeek API suggests cost codes for missing records
  - **Models**: `deepseek-reasoner` (primary) with automatic fallback to `deepseek-chat` on failure
  - **Pricing**: reasoner — $0.028/1M cache hit, $0.28/1M cache miss, $0.42/1M output; chat — $0.007/1M cache hit, $0.07/1M cache miss, $0.28/1M output
  - Per-row Sparkles button in cost code column calls `/api/cost-codes/classify`; after result, Search icon opens debug dialog
  - "Classify All Missing" button batch-processes all visible filtered missing records sequentially (with abort)
  - **Concurrent requests**: Multiple items can be classified in parallel; duplicate requests for the same item are blocked. Uses `Set<string>` state to track in-flight items.
  - **Duration**: Measured client-side (full round-trip including network + SP list fetch + DeepSeek API call)
  - **Table loading state**: Shows spinner + "Siniflandiriliyor..." text per-row during classification; panel is always closable, process continues in background
  - Debug dialog shows: record info, suggested code with model/duration/fallback badges, AI reasoning, API cost breakdown (tokens + dollars), system message, user message, raw API response
  - **Post-result actions**: Accept, Enter Manually (inline text input), Retry AI, Retry with Info (textarea for additional context sent in re-request)
  - **Post-accept actions**: Change (manual edit), Retry AI, Retry with Info
  - Two SharePoint lists for valid codes: `GIDER GRUPLARI 2022` (old, `XX.XXXXX` format, before 10/2024) and `IQ COST CODES` (new, `XX.XX.XX.XX` format, from 10/2024)
  - SP Site ID: `gorkem.sharepoint.com,a16ee5d5-798f-41f0-9bf4-79e7401c77d0,94f7370c-3990-4c58-951a-766976013138`
  - System prompt includes full cost code list + mandatory rules (fuel, handtools, transport, etc.)
- **Review & Save**: `reviewableItems` derives from `aiResults` (source of truth). Review dialog shows items as undecided/accepted/declined. Save writes accepted codes to SharePoint Excel files one-by-one via `/api/cost-codes/save`. Progress shown per-item with retry for failures.
- **Excel Save** (`/api/cost-codes/save`): Writes cost codes to SharePoint `.xlsm` files via Graph Workbook API
  - **Flow**: Get file → create persistent session → unprotect sheet → get table rows → match row by order number (column 0) → write cost code to 5th column (index 4) → verify read-back → close session
  - **Sheet protection**: Try empty password first, fallback to `Gorkem.2020`
  - **Row matching**: Column 0 (Order/Sıra) must equal the order number extracted from `uniquecode` (last segment parsed as int, e.g. `BAG.ADM.251127.043` → `43`). Order number is unique per daily Excel file. Description matching was removed because DB `aciklama` and Excel descriptions can differ (e.g. DB has "32m3 C30 BETON" vs Excel "32m3 C30 HAZIR BETON").
  - **Target column**: 5th column — `CostCode` (new format) or `Malz./Hiz. Kodu` (old format)
  - **Excel file paths** (two formats based on date cutoff `2024-10-01`):
    - **New (>= 10/2024)**: `SUBELER/GRJV/COMMON/06.ACCOUNTING/01.CASH-REPORTS/{year}/{month}/{day}/{source}/GRJV_CashReport_{source}_{YYYYMMDD}.xlsm`
    - **Old ANK (< 10/2024)**: `MERKEZ/02.MUHASEBE/PROJE-HARCAMALARI/IQ/INFO CENTER/{year}/{month}/{day}/CashReport_TR_IC_{YYYYMMDD}.xlsm`
    - **Old BAG (< 10/2024)**: `SUBELER/IQ/INFO CENTER/06.ACCOUNTING/01.CASH-REPORTS/{year}/{month}/{day}/CashReport_IQ_IC_{YYYYMMDD}.xlsm`
    - ERB not supported for old format
  - **Table**: `Table_KasaHareketleri` in `KASAHAREKETLERI` sheet (same for both formats)

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
