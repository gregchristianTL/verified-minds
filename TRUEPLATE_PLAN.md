# TruePlate — Comprehensive Build Plan

## What we're building

A World Mini App where **verified humans passively build a library of real food delivery data** — photos of what actually arrived and screenshots of what they actually paid — and **AI agents pay USDC micropayments (x402) to crawl and query the index.** Contributors earn WLD/USDC royalties whenever their data gets used, creating a passive income stream from a growing personal archive.

The product is three things:
1. **A food quality index** — what does delivery food *actually* look like when it arrives? (vs. menu marketing photos)
2. **A local price transparency index** — what do things *actually* cost on delivery apps? (including hidden markups, fees, and surge pricing that platforms add to offset their costs)
3. **A demand-driven marketplace** — humans see what agents are searching for and can earn multiplied royalties by filling data gaps, plus earn instant payouts for quick confirmations of things they already know

### Three ways to earn

| Mode | What you do | Payout | Timing |
|------|-------------|--------|--------|
| **Passive library** | Upload food photos + receipt screenshots from deliveries you already order | Royalties each time agents query your data | Async — earn for months after a single upload |
| **Demand-driven uploads** | See what cuisines/restaurants agents are querying but data is sparse → upload those next time you order | 2-5x royalty multiplier on in-demand data | Next time you order — no rush |
| **Quick confirms** | Agents need a human to verify something ("Is this price still accurate?" "Is this restaurant still open?") → tap to confirm from recent experience | Small instant WLD/USDC payout | Seconds — no new order required |

**Tagline:** *Truth you can taste.*

**30-second pitch:**
> Food delivery is massive everywhere World is strong — but in most of those markets, there's no honest record of what food actually looks like when delivered, or what it really costs after platform markups and fees. TruePlate lets World ID–verified people upload photos of their deliveries and receipt screenshots to build a personal data library that earns passively whenever agents query it. Humans can see what agents are searching for and earn multiplied payouts by filling gaps. They can also earn instantly by confirming things they already know — "You ordered from here last week, is this price still right?" The data compounds: price markup patterns, quality trends, platform comparisons. Verified human signal where no trusted open data exists.

---

## Why this matters (the research)

### Market opportunity
- World App has **~38M users** concentrated in Kenya, Nigeria, Argentina, Mexico, Colombia, Brazil, Indonesia, Malaysia, Singapore
- Food delivery is massive in ALL these markets: Africa **$14.5B**, SEA **$17.1B GMV**, Indonesia alone **$4.6B**, Brazil's iFood does **110M+ orders/month**
- **There is no Yelp equivalent in most emerging markets.** Reviews are gamed, delivery photos don't exist as structured data, all-in pricing with fees is opaque
- Dominant platforms per region: Glovo/Chowdeck (Africa), Rappi/iFood/PedidosYa (LatAm), Grab/Gojek/foodpanda (SEA)

### The data gap is real
- No OAuth access to consumer order history from any delivery platform (all APIs are merchant-facing)
- No structured dataset of: actual delivery photos, real total cost with all fees, delivery time accuracy, menu-vs-reality comparison
- In emerging markets, people discover food via app defaults, Instagram, WhatsApp, word of mouth — no trustworthy aggregated quality data

### Demand (honest)
- **Strongest near-term buyers:** ML training data teams, brand QA, fraud analytics, price comparison services
- **Forward-looking buyers:** AI food ordering agents (FeedMe, NOM, GOBBL, ChewIQ) — real but still frontier
- **Pricing comps:** Yelp API charges $0.025/query; restaurant data scrapers charge $0.75-80/1K results
- **Risk:** Platforms own the moment of truth internally. Our moat is World ID Sybil resistance + independence + cross-platform aggregation
- **Key value prop for agents:** The price markup index is uniquely valuable — "Glovo charges 25% more than the restaurant menu for this dish" is structural data no platform will ever publish

### The price transparency angle
- Delivery platforms routinely mark up menu prices 15-30% to offset platform costs — this is invisible to consumers
- A crowd-sourced index of **actual delivery prices vs. listed restaurant prices** is data that literally doesn't exist
- This data is structurally stable (markup patterns persist for months) which addresses staleness concerns
- Useful for: price comparison agents, consumer advocacy, restaurant owners who don't know what platforms charge their customers, market researchers

### Economics per human (passive royalty model)
- Contributors don't earn per-report — they earn **passively when agents query data they contributed**
- Recent contributions earn more per query than old ones (freshness weighting)
- Notification: "Your photos of Mama Oliech were used in 7 agent queries this week — earned KSh 18"
- $2.50/week USD is meaningful in World's core markets (Kenya: covers daily necessities; Argentina: USD-stable earnings; Indonesia: PPP ~$5.50+ equivalent)
- Nigeria: households spend 59% of income on food; earning back delivery markup by photographing what arrived is compelling
- **Payments NOT available in Indonesia and Philippines** via World Pay — plan for alternative earnings distribution

### Positioning by market
- **Africa + LatAm:** Passive earnings-led ("your food diary that pays you in USDC")
- **SEA:** Lifestyle + authenticity ("your food content, with purpose and pay")
- **US/EU:** Price transparency + accountability ("see the real cost of delivery")

---

## Technical stack

| Layer | Hackathon | Production |
|-------|-----------|------------|
| Framework | **Next.js 15** App Router + TypeScript + Tailwind CSS | Same |
| World ID | **`@worldcoin/minikit-js`** (MiniKit in World App) + **`@worldcoin/idkit`** (browser) | + MiniKit v2 for unified |
| Auth | **Wallet Auth + SIWE** (MiniKit) + NextAuth | Same |
| x402 | **`@x402/next`** + **`@x402/core`** + **`@x402/evm`** | + World AgentKit hooks |
| DB | **SQLite** (Turso/libsql) or Neon Postgres free tier | PostgreSQL + TimescaleDB |
| Cache | In-memory / Upstash Redis free | Redis |
| Storage | Vercel Blob | R2/S3 |
| AI Vision | OpenAI GPT-4o (screenshot OCR) | Multi-provider + fallbacks |
| FX Rates | Frankfurter API (free, ECB-based) | Open Exchange Rates |
| i18n | **next-intl** | Same |
| Maps | Leaflet or MapLibre (free) | Same |
| Hosting | **Vercel** | Same |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                       │
│  World App WebView │ Coinbase Wallet │ Browser        │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                  NEXT.JS 15 APP                       │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  React UI   │  │  API Routes  │  │  x402 Gate  │ │
│  │  + Tailwind │  │  + Actions   │  │  (@x402/next)│ │
│  └─────────────┘  └──────┬───────┘  └──────┬──────┘ │
│                          │                  │         │
│  ┌───────────────────────▼──────────────────▼──────┐ │
│  │              SERVER SERVICES                      │ │
│  │  World ID Verify │ Vision OCR │ Consensus Engine │ │
│  │  FX Rates        │ Restaurant Resolution          │ │
│  └──────────────────────────┬───────────────────────┘ │
│                             │                          │
│  ┌──────────────────────────▼──────────────────────┐  │
│  │              DATA LAYER                          │  │
│  │  SQLite/Postgres │ Object Storage │ Redis Cache  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │              PAYMENT LAYER                        │  │
│  │  x402 Facilitator │ USDC on Base Sepolia         │  │
│  │  Earnings Ledger  │ World Pay (where available)  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Data model

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  world_id_nullifier TEXT UNIQUE NOT NULL, -- World ID commitment
  wallet_address TEXT,
  locale TEXT DEFAULT 'en',
  display_currency TEXT DEFAULT 'USD',     -- ISO 4217
  reputation_score REAL DEFAULT 1.0,
  total_earnings_usdc TEXT DEFAULT '0',    -- decimal string
  pending_earnings_usdc TEXT DEFAULT '0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Platforms
```sql
CREATE TABLE platforms (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,              -- 'doordash', 'glovo', 'rappi', etc.
  display_name TEXT NOT NULL,
  markets TEXT NOT NULL,                  -- JSON array of country codes
  logo_url TEXT
);
```

### Deliveries (the library — each upload is one delivery)
```sql
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform_id TEXT REFERENCES platforms(id),
  restaurant_id TEXT REFERENCES restaurants(id),
  restaurant_raw_name TEXT NOT NULL,

  -- Photos (the core library assets)
  food_photo_url TEXT NOT NULL,           -- what actually arrived
  receipt_screenshot_url TEXT,            -- app order/receipt screenshot

  -- Extracted data (from receipt screenshot via AI vision, or manual)
  order_items_json TEXT,                  -- structured: [{name, qty, price}]
  subtotal_minor INTEGER,                -- food cost before fees
  fees_json TEXT,                         -- [{type: "delivery"|"service"|"small_order", amount}]
  total_amount_minor INTEGER,            -- what the human actually paid
  currency TEXT NOT NULL,                -- ISO 4217
  platform_markup_pct REAL,              -- computed: (delivery_total - estimated_menu_total) / menu_total

  -- Quality signal
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  condition_tags TEXT,                   -- JSON array: ["wrong_items", "cold", "great_packaging"]

  -- Context
  geo_lat REAL,
  geo_lng REAL,
  geo_accuracy_m REAL,
  delivered_at DATETIME NOT NULL,         -- when the delivery arrived

  -- Processing state
  extraction_confidence REAL,            -- AI vision confidence on receipt parse
  moderation_status TEXT DEFAULT 'pending',
  query_hit_count INTEGER DEFAULT 0,     -- how many times agents used this data
  last_queried_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Restaurants (deduplicated)
```sql
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  normalized_name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  cuisine_tags TEXT,                      -- JSON array
  geo_lat REAL,
  geo_lng REAL,
  avg_platform_markup_pct REAL,          -- aggregated from deliveries
  merged_into_id TEXT REFERENCES restaurants(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Price index (aggregated markup/pricing data per restaurant per platform)
```sql
CREATE TABLE price_index (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  avg_total_minor INTEGER,               -- average total paid
  avg_markup_pct REAL,                   -- average platform markup
  median_total_minor INTEGER,
  sample_count INTEGER NOT NULL,
  currency TEXT NOT NULL,
  time_bucket TEXT NOT NULL,             -- e.g. '2026-W12' or '2026-03'
  last_updated_at DATETIME NOT NULL
);
```

### Quality index (aggregated quality per restaurant)
```sql
CREATE TABLE quality_index (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  avg_condition REAL NOT NULL,           -- 1-5 weighted by freshness
  confidence REAL NOT NULL,              -- based on sample count + recency
  sample_count INTEGER NOT NULL,
  common_tags TEXT,                      -- JSON: most frequent condition tags
  time_bucket TEXT NOT NULL,
  last_updated_at DATETIME NOT NULL
);
```

### Agent queries (x402 log + royalty attribution)
```sql
CREATE TABLE agent_queries (
  id TEXT PRIMARY KEY,
  payer_address TEXT,
  endpoint TEXT NOT NULL,
  query_params TEXT,
  price_usdc TEXT NOT NULL,
  payment_tx TEXT,
  settlement_status TEXT DEFAULT 'pending',
  -- Which deliveries were hit by this query (for royalty distribution)
  delivery_ids_hit TEXT,                 -- JSON array of delivery IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Royalties (passive earnings from library usage)
```sql
CREATE TABLE royalties (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  agent_query_id TEXT NOT NULL REFERENCES agent_queries(id),
  delivery_id TEXT NOT NULL REFERENCES deliveries(id),
  amount_usdc TEXT NOT NULL,             -- share of the query payment
  freshness_multiplier REAL NOT NULL,    -- recent data earns more
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Demand signals (what agents are asking for)
```sql
CREATE TABLE demand_signals (
  id TEXT PRIMARY KEY,
  query_category TEXT NOT NULL,          -- 'cuisine', 'restaurant', 'area', 'price_check'
  query_value TEXT NOT NULL,             -- 'thai', 'mikes_pizza', '10003', etc.
  geo_lat REAL,
  geo_lng REAL,
  geo_radius_km REAL,
  query_count_7d INTEGER DEFAULT 0,      -- how many agent queries in last 7 days
  supply_count_30d INTEGER DEFAULT 0,    -- how many deliveries match in last 30 days
  gap_score REAL GENERATED ALWAYS AS    -- high gap = high demand, low supply
    (CAST(query_count_7d AS REAL) / MAX(supply_count_30d, 1)) STORED,
  royalty_multiplier REAL DEFAULT 1.0,   -- 1x normal, 2-5x for high-demand gaps
  updated_at DATETIME NOT NULL
);
```

**How demand signals work:**
- Every x402 agent query is categorized (cuisine type, restaurant, area, price check)
- Aggregate into rolling 7-day demand counts per category per geo area
- Compare against supply (existing library uploads matching that query)
- High demand / low supply = high gap score = higher royalty multiplier
- Surface to humans: "Thai food near you: 47 agent queries, only 3 uploads — earn 3x"

### Quick confirms (lightweight verification bounties)
```sql
CREATE TABLE confirm_requests (
  id TEXT PRIMARY KEY,
  source_query_id TEXT REFERENCES agent_queries(id),
  question_type TEXT NOT NULL,           -- 'price_check', 'still_open', 'menu_accurate', 'quality_check'
  question_text TEXT NOT NULL,           -- "Is the large pizza at Mike's still $18.99?"
  restaurant_id TEXT REFERENCES restaurants(id),
  geo_lat REAL,
  geo_lng REAL,
  eligible_after DATETIME,              -- only show to users who ordered from here after this date
  expires_at DATETIME NOT NULL,          -- window to respond
  reward_usdc TEXT NOT NULL,             -- instant payout for confirming
  status TEXT DEFAULT 'open',            -- 'open', 'confirmed', 'denied', 'expired'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE confirmations (
  id TEXT PRIMARY KEY,
  confirm_request_id TEXT NOT NULL REFERENCES confirm_requests(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  response TEXT NOT NULL,                -- 'yes', 'no', 'not_sure'
  response_detail TEXT,                  -- optional: "price went up to $21.99"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**How quick confirms work:**
- Agent queries something → data exists but is 3 weeks old → system generates a confirm request
- Route to humans who ordered from that restaurant recently (we know from their library)
- "You ordered from Mike's Pizza 5 days ago. Is the large pepperoni still $18.99?" → tap Yes/No/Not sure
- Multiple confirms from different humans = higher confidence → agent gets better answer
- Instant small payout (e.g. $0.01-0.05 USDC) for the confirmation — no waiting for royalties
- **Timing constraint:** Confirms have expiry windows (e.g. 4 hours). This is NOT for "should I order right now?" — it's for "is this data still accurate?" which is less time-sensitive.

### Staleness & freshness model
Royalty distribution uses exponential freshness decay:

```
freshness_weight = e^(-λ × days_since_delivery) × demand_multiplier
```

- **λ = 0.01** → half-life ~69 days (quality data stays relevant for months)
- **λ = 0.03** → half-life ~23 days (price data needs to be fresher)
- **demand_multiplier** = 1x-5x based on gap_score from demand_signals table
- Each delivery's share of a query payment = `freshness_weight / sum(all_freshness_weights_in_result)`
- This naturally incentivizes ongoing uploads without making old data worthless
- Structural insights (markup patterns) use the slower decay; spot prices use faster decay
- In-demand uploads earn disproportionately more — the demand signal is the growth engine

---

## World Mini App integration (from official docs)

### Setup
```bash
npx @worldcoin/create-mini-app@latest trueplate
# OR manual:
npm install @worldcoin/minikit-js
```

### Root layout — MiniKitProvider
```tsx
// src/app/layout.tsx
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <MiniKitProvider>
        <body>{children}</body>
      </MiniKitProvider>
    </html>
  );
}
```

### Detecting World App vs browser
```tsx
import { MiniKit } from "@worldcoin/minikit-js";

// In component:
if (MiniKit.isInstalled()) {
  // Running inside World App → use MiniKit commands
} else {
  // Browser / Coinbase Wallet → use IDKit widget
}
```

### World ID verification (client)
```tsx
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

const verifyPayload = {
  action: "verify-reporter",
  signal: userId,
  verification_level: VerificationLevel.Orb,
};

const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

if (finalPayload.status === "error") {
  // Handle error
  return;
}

// Send proof to backend for verification
const res = await fetch("/api/verify-proof", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: finalPayload,
    action: "verify-reporter",
    signal: userId,
  }),
});
```

### World ID verification (server)
```tsx
// src/app/api/verify-proof/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCloudProof, ISuccessResult } from "@worldcoin/minikit-js";

export async function POST(req: NextRequest) {
  const { payload, action, signal } = await req.json();
  const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

  const verifyRes = await verifyCloudProof(payload, app_id, action, signal);

  if (verifyRes.success) {
    // Store user with nullifier_hash as unique ID
    return NextResponse.json({ verified: true }, { status: 200 });
  }
  return NextResponse.json({ verified: false }, { status: 400 });
}
```

### Payments (MiniKit Pay)
```tsx
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

const payload: PayCommandInput = {
  reference: generateUUID(),
  to: process.env.NEXT_PUBLIC_PAY_ADDRESS!,
  tokens: [
    {
      symbol: Tokens.USDC,
      token_amount: tokenToDecimals(0.01, Tokens.USDC).toString(),
    },
  ],
  description: "TruePlate observation reward",
};

const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
```

**Important constraints from docs:**
- Payments NOT available in Indonesia and Philippines
- Minimum transfer ~$0.1 (World App sponsors gas)
- Whitelist recipient addresses in Developer Portal
- No testnet for mini app transactions — develop on mainnet

### Wallet Auth (for sessions)
```tsx
// Recommended: Wallet Auth + SIWE for session management
import { MiniKit } from "@worldcoin/minikit-js";

// Client triggers wallet auth
const result = await MiniKit.commandsAsync.walletAuth({
  nonce: nonceFromServer,
  statement: "Sign in to TruePlate",
});

// Backend verifies SIWE message with verifySiweMessage
```

### Initialization context (useful data from World App)
```tsx
// Available from MiniKit after install:
// - user.walletAddress
// - user.username
// - user.permissions
// - deviceProperties.safeAreaInsets
// - preferredCurrency   ← use for default display currency!
// - launchLocation
```

---

## x402 payment-gated API (from official docs)

### Setup
```bash
npm install @x402/next @x402/core @x402/evm
```

### Shared server config
```tsx
// src/lib/x402/server.ts
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

export const server = new x402ResourceServer(facilitatorClient);
server.register("eip155:*", new ExactEvmScheme());

export const PAY_TO = process.env.X402_PAY_TO as `0x${string}`;
```

### Payment-gated API route (withX402)
```tsx
// src/app/api/v1/restaurant/[id]/consensus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { server, PAY_TO } from "@/lib/x402/server";

const handler = async (req: NextRequest) => {
  const id = req.nextUrl.pathname.split("/").at(-2);
  // Fetch consensus data from DB
  const consensus = await getRestaurantConsensus(id);
  return NextResponse.json(consensus, { status: 200 });
};

export const GET = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: "$0.01",
        network: "eip155:84532",  // Base Sepolia
        payTo: PAY_TO,
      },
    ],
    description: "Restaurant consensus data from verified human reporters",
    mimeType: "application/json",
  },
  server,
);
```

### Logging payments (lifecycle hooks)
```tsx
server.onAfterSettle(async (context) => {
  await db.insert(agentQueries).values({
    id: generateUUID(),
    payer_address: context.result.payer,
    endpoint: context.requirements.url,
    price_usdc: context.requirements.amount,
    payment_tx: context.result.transaction,
    settlement_status: "settled",
  });
});
```

### Agent consumer (for demo)
```tsx
// scripts/demo-agent.ts
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const res = await fetchWithPayment("http://localhost:3000/api/v1/restaurant/abc/consensus");
const data = await res.json();
console.log("Agent received:", data);
```

### Testing
- **Network:** Base Sepolia (`eip155:84532`)
- **Facilitator:** `https://x402.org/facilitator`
- **Testnet USDC:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e` on Base Sepolia
- **Faucet:** Base Sepolia ETH from docs.base.org/docs/tools/network-faucets

---

## Currency conversion

### Implementation
```tsx
// src/lib/currency.ts
const FX_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let fxCache: { rates: Record<string, number>; fetched: number } | null = null;

export async function getFxRates(): Promise<Record<string, number>> {
  if (fxCache && Date.now() - fxCache.fetched < FX_CACHE_TTL) {
    return fxCache.rates;
  }
  const res = await fetch("https://api.frankfurter.app/latest?from=USD");
  const data = await res.json();
  fxCache = { rates: data.rates, fetched: Date.now() };
  return data.rates;
}

export function formatDual(
  usdcAmount: number,
  localCurrency: string,
  fxRate: number,
  locale: string,
): { primary: string; secondary: string } {
  const localAmount = usdcAmount * fxRate;
  const primary = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: localCurrency,
    minimumFractionDigits: localCurrency === "IDR" ? 0 : 2,
  }).format(localAmount);
  const secondary = `≈ ${usdcAmount.toFixed(4)} USDC`;
  return { primary, secondary };
}
```

### Supported currencies (priority order)
| Currency | Market | Symbol |
|----------|--------|--------|
| KES | Kenya | KSh |
| NGN | Nigeria | ₦ |
| GHS | Ghana | GH₵ |
| ARS | Argentina | $ |
| MXN | Mexico | $ |
| COP | Colombia | $ |
| BRL | Brazil | R$ |
| IDR | Indonesia | Rp |
| MYR | Malaysia | RM |
| SGD | Singapore | S$ |
| USD | United States | $ |
| EUR | Europe | € |
| GBP | UK | £ |

### User preference
- Default from `MiniKit` context: `preferredCurrency` (available in World App)
- Fallback: geo-detect from locale or IP
- Manual override in settings
- Always display: **local primary, USDC secondary** (`≈`)

---

## Internationalization (i18n)

### Setup with next-intl
```tsx
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "pt-BR", "id"],
  defaultLocale: "en",
});
```

### Middleware
```tsx
// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
```

### Message structure
```
messages/
  en.json
  es.json
  pt-BR.json
  id.json
```

### Namespace keys
```json
{
  "common": {
    "submit": "Submit",
    "cancel": "Cancel",
    "earnings": "Earnings",
    "verified": "Verified"
  },
  "onboarding": {
    "headline": "Truth you can taste",
    "subline": "Earn USDC by reporting what you actually got delivered",
    "verify_cta": "Continue with World ID"
  },
  "dashboard": {
    "total_earned": "Total earned",
    "this_week": "This week",
    "from_queries": "from {count} queries",
    "library_stats": "{deliveries} deliveries · {queries} agent queries",
    "add_cta": "Add a delivery",
    "recent_royalties": "Recent earnings",
    "royalty_notification": "Your {restaurant} photos → {queries} queries → {amount}"
  },
  "upload": {
    "photo_title": "What arrived?",
    "photo_food": "Food photo",
    "photo_receipt": "Receipt screenshot",
    "photo_receipt_hint": "Helps you earn more",
    "context_title": "Quick details",
    "platform_title": "Which app?",
    "restaurant": "Restaurant name",
    "condition": "How was it?",
    "confirm_title": "Looks good?",
    "extracted_total": "We extracted: {total}",
    "added_to_library": "Added to your library",
    "will_earn": "You'll earn when agents query this"
  },
  "library": {
    "title": "Your library",
    "query_hits": "{count} queries",
    "earned_from": "Earned {amount}",
    "no_deliveries": "Upload your first delivery"
  },
  "demand": {
    "title": "In demand near you",
    "queries": "{count} agent queries",
    "uploads": "{count} uploads",
    "earn_multiplier": "Earn {multiplier}x",
    "remind_me": "Remind me next time I order"
  },
  "confirms": {
    "title": "Quick earns",
    "still_accurate": "You ordered from {restaurant} {days} days ago. Is {item} still {price}?",
    "yes": "Yes",
    "no": "No",
    "not_sure": "Not sure",
    "earned_instant": "+{amount} earned"
  },
  "settings": {
    "language": "Language",
    "currency": "Display currency",
    "world_id": "World ID",
    "status_verified": "Verified"
  }
}
```

### Key languages
- **Tier 1 (ship first):** English, Spanish, Portuguese (Brazil), Indonesian
- **Tier 2 (post-hackathon):** French, Swahili, Malay, Japanese, Korean
- **Tier 3:** Arabic (RTL support needed), Nigerian Pidgin

---

## UI design

### Design system
- **Dark mode default** (aligns with World App)
- **Background:** zinc-950 (`#09090b`)
- **Surface:** zinc-900 (`#18181b`) with `border-white/10`
- **Accent:** emerald-500 (`#10b981`) — earnings, success, selected
- **Warning:** amber-400 — pending states
- **Error:** red-400 — issues
- **Typography:** Inter or Geist (variable), Noto Sans fallback for mixed scripts
- **Touch targets:** 44px minimum, 48px for primary buttons

### Screens

#### 1. Landing / Onboarding
- Hero visual + headline + subline
- Trust strip: "Verified humans" · "USDC earnings" · "Helps your city"
- Primary CTA: "Continue with World ID" (full-width, emerald)
- Detect World App → MiniKit verify; Browser → IDKit widget/QR

#### 2. Dashboard (your library + demand feed)
- **Library stats:** "47 deliveries uploaded · 312 agent queries this month"
- **Passive earnings card:** large local currency amount, USDC subline, "earned this week from 23 queries"
- **Recent royalty notifications:** "Your Mama Oliech photos → 7 queries → KSh 18" with timestamps
- Primary CTA: "Add a delivery" (prominent, above fold)

**Demand feed (what agents want):**
- Scrollable cards showing data gaps in the user's area
- "Thai food near you — 47 queries, 3 uploads — **earn 3x**"
- "Mike's Pizza price check — 12 queries, last upload 3 weeks ago — **earn 5x**"
- Each card shows: category, query volume, supply count, multiplier badge
- Tap → remembers as a "want" so user is reminded next time they order

**Quick confirms (earn now):**
- Inline cards: "You ordered from Mama Oliech 4 days ago. Is the pilau still KSh 650?"
- Tap: Yes / No / Not sure + optional detail field ("went up to KSh 700")
- Instant payout shown after confirm: "+KSh 3 (≈ $0.02 USDC)"
- Only shown for restaurants in the user's library history — contextually relevant

- Your library grid: thumbnails of past uploads, each showing query count badge
- Price insight card: "You've documented that Glovo marks up 22% avg on your orders"

#### 3. Upload flow (2 photos + quick context)
- **Step 1 — Photos:** Food photo (required, what arrived) + receipt screenshot (strongly encouraged, "helps you earn more"). These are the core library assets.
- **Step 2 — Context:** Platform picker (auto-suggest by country), restaurant name (autocomplete), condition rating (1-5 emoji), optional tags. AI vision extracts itemized pricing + fees from the receipt screenshot automatically — user confirms or corrects.
- **Step 3 — Confirm:** Summary card showing extracted data + mini map + "Added to your library"
- Success: "This will start earning when agents query it" — no immediate payout promise

#### 4. Agent demo (for judges)
- Split view: human library | agent crawl
- x402 flow visualization: 402 → Pay USDC → 200 + data
- Restaurant dossier: photo grid from multiple humans, quality trend, price index showing platform markup %, delivery reliability
- Royalty attribution: "This query touched 14 deliveries from 8 humans → royalties distributed"

#### 5. Library browser (your data)
- All your past uploads in a scrollable grid
- Each delivery card shows: photo, restaurant, total paid, platform, date, query hit count
- Tap to expand: full details, extracted receipt data, earnings from this specific delivery
- Filter by: platform, recency, most-queried

#### 5. Settings
- Language selector, currency selector, World ID status, notifications

---

## File structure

```
world-hack/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx                    # Providers (MiniKit, i18n, theme)
│   │   │   ├── page.tsx                      # Onboarding / verify
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                  # Home dashboard
│   │   │   ├── upload/
│   │   │   │   ├── layout.tsx                # Upload stepper shell
│   │   │   │   └── page.tsx                  # Upload flow (client component)
│   │   │   ├── library/
│   │   │   │   └── page.tsx                  # Your delivery library browser
│   │   │   ├── agent/
│   │   │   │   └── page.tsx                  # Agent demo view
│   │   │   └── settings/
│   │   │       └── page.tsx                  # Settings
│   │   └── api/
│   │       ├── verify-proof/
│   │       │   └── route.ts                  # World ID cloud verify
│   │       ├── deliveries/
│   │       │   └── route.ts                  # POST upload delivery, GET user's library
│   │       ├── demand/
│   │       │   └── route.ts                  # GET demand signals for user's area
│   │       ├── confirms/
│   │       │   └── route.ts                  # GET pending confirms, POST confirmation
│   │       ├── restaurants/
│   │       │   └── route.ts                  # GET search restaurants
│   │       ├── fx/
│   │       │   └── route.ts                  # GET exchange rates
│   │       ├── extract/
│   │       │   └── route.ts                  # POST screenshot → structured data (vision)
│   │       └── v1/
│   │           ├── restaurant/
│   │           │   └── [id]/
│   │           │       ├── quality/
│   │           │       │   └── route.ts      # GET x402-gated quality index
│   │           │       └── pricing/
│   │           │           └── route.ts      # GET x402-gated price index
│   │           ├── search/
│   │           │   └── route.ts              # GET x402-gated restaurant search
│   │           ├── price-index/
│   │           │   └── route.ts              # GET x402-gated platform markup data
│   │           └── openapi/
│   │               └── route.ts              # OpenAPI spec
│   ├── components/
│   │   ├── ui/                               # Primitives: Button, Card, Sheet, Input, Skeleton
│   │   ├── layout/                           # Screen, AppHeader, SafeArea
│   │   ├── onboarding/                       # VerifyButton, TrustStrip, HowItWorks
│   │   ├── dashboard/                        # EarningsCard, DemandFeed, QuickConfirmCard, RoyaltyNotification
│   │   ├── upload/                            # PlatformGrid, PhotoCapture, ConditionScale, TagChips, SummaryCard
│   │   ├── library/                           # DeliveryGrid, DeliveryCard, QueryBadge, EarningsBreakdown
│   │   ├── demand/                            # DemandCard, GapBadge, MultiplierBadge
│   │   ├── confirms/                         # ConfirmCard, ConfirmResponse, InstantPayout
│   │   ├── agent-demo/                       # ConsensusCard, X402Flow, MockQuery
│   │   └── settings/                         # LanguagePicker, CurrencyPicker
│   ├── lib/
│   │   ├── x402/
│   │   │   └── server.ts                     # x402ResourceServer + facilitator config
│   │   ├── db/
│   │   │   ├── index.ts                      # DB connection
│   │   │   └── schema.ts                     # Tables + types
│   │   ├── currency.ts                       # FX rates + formatDual
│   │   ├── indexer.ts                        # Quality + price index aggregation
│   │   ├── royalties.ts                     # Freshness-weighted royalty distribution
│   │   ├── demand.ts                        # Demand signal computation + gap scoring
│   │   ├── confirms.ts                      # Confirm request generation + routing
│   │   ├── vision.ts                         # Screenshot OCR via AI
│   │   ├── platforms.ts                      # Platform registry + country mapping
│   │   └── providers.tsx                     # Client providers wrapper
│   ├── i18n/
│   │   ├── request.ts                        # next-intl server config
│   │   └── routing.ts                        # Locale definitions
│   └── types/
│       └── index.ts                          # Shared TypeScript types
├── messages/
│   ├── en.json
│   ├── es.json
│   ├── pt-BR.json
│   └── id.json
├── scripts/
│   ├── demo-agent.ts                         # Agent consumer demo script
│   └── seed.ts                               # Seed mock data for demo
├── public/
│   ├── platforms/                             # Platform logos (SVG)
│   └── icons/                                # App icons
├── middleware.ts                              # i18n + x402 proxy
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
└── .env.local
```

---

## Environment variables

```env
# World
NEXT_PUBLIC_APP_ID=app_...                    # World Developer Portal
DEV_PORTAL_API_KEY=...                        # World Developer Portal API key
AUTH_SECRET=...                               # NextAuth / session secret

# x402
X402_PAY_TO=0x...                             # USDC receiving address (Base Sepolia)
FACILITATOR_URL=https://x402.org/facilitator  # x402 facilitator

# AI
OPENAI_API_KEY=sk-...                         # For screenshot OCR

# Optional
AGENT_PRIVATE_KEY=0x...                       # For demo agent script
```

---

## Hackathon execution plan

### Critical path (build in this order)

**Phase 1 — Skeleton + World ID (Day 1, hours 1-4)**
1. Scaffold Next.js 15 app with MiniKit
2. Set up Tailwind with dark theme + emerald accent
3. Set up next-intl with English (add Spanish later)
4. Landing page with World ID verify (MiniKit + IDKit fallback)
5. Wallet Auth + session management
6. Basic dashboard/library shell

**Phase 2 — Upload flow (Day 1, hours 4-8)**
7. Photo capture: food photo + receipt screenshot (file input, client-side resize, upload to Vercel Blob)
8. Platform picker (grid with logos, country auto-suggest)
9. Quick context form (restaurant, condition, optional tags)
10. Receipt screenshot → AI vision extraction (items, fees, total) with user confirmation
11. GPS auto-capture with fallback
12. Confirm + save to DB → "Added to your library"

**Phase 3 — Data layer + indexing (Day 1, hours 8-12)**
13. SQLite/Postgres schema setup (deliveries, restaurants, price_index, quality_index)
14. Deliveries CRUD + library browser
15. Restaurant deduplication (basic fuzzy match)
16. Price index aggregation (platform markup calculation per restaurant)
17. Quality index aggregation (freshness-weighted ratings)
18. Seed script with mock data for demo density

**Phase 4 — x402 API + royalties (Day 2, hours 1-4)**
19. x402ResourceServer setup with facilitator
20. `GET /api/v1/restaurant/[id]/quality` with withX402
21. `GET /api/v1/restaurant/[id]/pricing` with withX402
22. `GET /api/v1/price-index` with withX402 (platform markup data)
23. Royalty attribution: on query settle → identify contributing deliveries → distribute to users with freshness weighting
24. Demand signal computation: aggregate queries into demand_signals table
25. Demo agent script that queries and pays
26. OpenAPI spec stub

**Phase 5 — Demand + confirms + polish (Day 2, hours 4-8)**
27. Demand feed on dashboard (trending queries with gap scores + multiplier badges)
28. Quick confirm cards: generate from stale data + route to eligible users
29. Confirm response flow (tap yes/no → instant payout display)
30. Currency conversion display (local + USDC) throughout
31. Dashboard with all three earning modes visible
32. Agent demo page (split view, x402 visualization, royalty attribution + demand loop)
33. Library browser (your uploads, query hit counts, per-delivery earnings)

**Phase 6 — Demo prep (Day 2, hours 8-10)**
34. Second language (Spanish)
35. Seed compelling demo data (multiple restaurants, demand gaps, confirm requests)
36. Record or prepare live demo flow
37. Polish the "wow" moments: receipt extraction + price markup reveal + demand feed + x402 payment + royalty notification
38. Prepare slide: "Agents asked about Thai food 47 times. 3 humans uploaded. Now earning 3x."

### What gets cut if time is tight
- Receipt OCR → manual price input only
- Quick confirms → defer (passive + demand is enough for demo)
- Second language → English only
- Map visualization → text-only location
- Library browser → just dashboard with recent uploads
- Demand feed → just static "in demand" badges on upload confirmation
- Agent demo page → live terminal demo instead

### What must NOT be faked
- **World ID verification** (core thesis)
- **At least one real index** (price or quality) with sample size + freshness weighting
- **x402 payment flow** (at least one endpoint, real 402 → pay → 200)
- **Royalty attribution** (when an agent pays, show which humans' data was used)
- **Demand visibility** (even if simplified — show that humans can see what agents want)
- **Honest confidence/sample-size disclosure** in API responses

---

## Demo script (2 minutes)

**0:00-0:10 — The gap**
"Delivery platforms mark up food prices 15-30%. Nobody tracks what you actually pay, or what the food actually looks like when it arrives."

**0:10-0:35 — Building the library**
Open TruePlate in World App → World ID verified → snap photo of delivered food → screenshot the Glovo receipt → AI extracts: "Chicken biryani KSh 650, delivery fee KSh 150, service fee KSh 80, total KSh 880" → quick condition rating → added to library. "That took 20 seconds."

**0:35-0:55 — The index**
"47 verified humans have uploaded Nairobi Kitchen deliveries across Glovo, Uber Eats, and Bolt Food. Here's what we know: Glovo marks up 27%, Uber Eats 19%, Bolt Food 15%. Average quality: 4.1/5."

**0:55-1:20 — Agent pays to crawl (x402)**
AI agent queries the price index API → HTTP 402 → pays $0.02 USDC → gets structured JSON with platform markup comparison, quality scores, photo samples. "14 humans' data was used in this query. Each one just earned a royalty."

**1:20-1:40 — The demand loop**
Show the dashboard: "Thai food near you — 47 agent queries, only 3 uploads. Earn 3x next time you order Thai." Then a quick confirm card: "You ordered from Mama Oliech 4 days ago. Is the pilau still KSh 650?" → tap Yes → instant payout: "+KSh 3." "Humans see what agents want. Three ways to earn."

**1:40-2:00 — The vision**
"TruePlate: a passive food delivery library built by verified humans. Agents crawl it and pay. Humans earn royalties, fill demand gaps for multiplied payouts, and confirm what they already know for instant rewards. Truth you can taste."

---

## Post-hackathon roadmap

1. **Production DB** (Postgres + Drizzle ORM)
2. **Photo ↔ menu consistency scoring** (CLIP embeddings — "does the delivery match the listing photo?")
3. **Push notifications** ("Your area is being queried heavily — upload more to earn more")
4. **Gmail OAuth** for email receipt parsing (pull order confirmations automatically)
5. **World AgentKit integration** (human-backed agent registry + free-trial modes)
6. **On-chain royalty distribution** (batch USDC payouts, transparent on-chain)
7. **RTL support** (Arabic) + Tier 2 languages
8. **Restaurant deduplication ML** (cross-platform entity resolution)
9. **Price alert feature** ("Glovo raised markup on your favorite restaurant from 20% to 35%")
10. **Expand verticals** (grocery delivery pricing, pharmacy, ride-share quality)
11. **Developer rewards** integration (World Mini App program)
12. **Historical price index** (time-series view of platform markup trends per city)
