# Verified Minds

Turn your expertise into an AI agent that earns for you.

Verified Minds is a platform where users verify with **World ID**, go through a voice interview to extract their domain knowledge, and have a custom AI agent created that can be queried by anyone for **$0.05 USDC** via the **x402** micropayment protocol.

## Architecture

```
World ID Verify -> Voice Interview (OpenAI Realtime) -> Knowledge Extraction -> Expert Agent (ADIN Engine) -> Marketplace -> Paid Queries (x402 + USDC)
```

- **Framework:** Next.js 15, React 19, TypeScript
- **Database:** Neon PostgreSQL (serverless) + Drizzle ORM
- **AI:** OpenAI Realtime (interview), AI SDK + GPT-4o (agent engine)
- **Identity:** World ID (IDKit browser + MiniKit World App)
- **Payments:** x402 protocol, USDC on Base Sepolia
- **Notifications:** XMTP (optional wallet-to-wallet DMs)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in required values (see below)

# Run database migrations
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

The app runs at `http://localhost:3030`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for Realtime interview + ADIN engine |
| `NEXT_PUBLIC_WORLD_APP_ID` | Yes | World ID app ID (register at developer.worldcoin.org) |
| `NEXT_PUBLIC_WORLD_ACTION` | No | World action name (default: `verify-expertise`) |
| `SESSION_SECRET` | Prod | Encryption key for session cookies (min 32 chars) |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (get one at neon.tech) |
| `X402_PAY_TO` | Yes | Wallet address to receive USDC payments |
| `X402_NETWORK` | No | Payment network (default: `base-sepolia`) |
| `FACILITATOR_URL` | No | x402 facilitator URL |
| `ADIN_API_KEY` | Prod | API key for v1 agent API endpoints |
| `XMTP_PRIVATE_KEY` | No | Wallet key for sending XMTP earnings notifications |

## Scripts

```bash
npm run dev          # Development server (port 3030)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run tests (Vitest)
npm run test:watch   # Watch mode tests
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Drizzle Studio (DB browser)
```

## API Endpoints

### Public
- `GET /api/agents` -- Machine-readable directory of live expert agents
- `GET /api/expertise/marketplace` -- List live experts
- `GET /api/expertise/marketplace/:id` -- Single expert listing
- `POST /api/expertise/query` -- Query an expert (x402 payment required)

### Authenticated (session cookie)
- `POST /api/expertise/verify` -- World ID verification
- `POST /api/expertise/verify/demo` -- Demo login (development only)
- `GET /api/expertise/profiles` -- Get authenticated user's profile
- `POST/GET/PATCH /api/expertise/sessions` -- Extraction sessions
- `GET /api/expertise/earnings` -- Earnings and transactions
- `POST /api/expertise/tools/*` -- Interview tools
- `POST /api/auth/openai-realtime` -- OpenAI Realtime SDP handshake

### API Key Protected
- `POST /api/v1/chat` -- Chat with the ADIN engine
- `GET/POST /api/v1/agents` -- List/create custom agents

## Security

- **Session management:** iron-session signed HTTP-only cookies
- **IDOR protection:** All authenticated routes validate profile ownership
- **SSRF protection:** URL fetching blocked for private IPs, localhost, metadata endpoints
- **Rate limiting:** In-memory per-IP limits on auth and LLM-consuming endpoints
- **Security headers:** CSP, X-Frame-Options, X-Content-Type-Options, HSTS
- **Input validation:** Zod schemas on all API route inputs
- **Environment gating:** Demo endpoints disabled in production
