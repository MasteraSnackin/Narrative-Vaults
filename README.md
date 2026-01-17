# Narrative Vaults

<div align="center">

![Narrative Vaults Banner](docs/assets/banner.png)

**A Gamified Pair Trading Platform for Market Narratives**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

[Demo](https://narrativevaults.xyz) | [Documentation](docs/ARCHITECTURE.md) | [API Reference](docs/API_DOCS.md)

</div>

---

## Overview

Narrative Vaults is a decentralized trading platform that transforms pair trading into an engaging, gamified experience. Users deposit into narrative-based vaults that execute automated pair trades on Hyperliquid, earning XP and leveling up to unlock advanced trading strategies.

### Key Features

- **Narrative-Based Trading**: Trade market themes like "AI vs Memes", "SOL vs ETH", or "DeFi vs GameFi"
- **Gamified Experience**: Earn XP for profitable trades, level up to unlock higher leverage narratives
- **Automated Risk Management**: Salt-powered policy controls with automatic drawdown protection
- **Real-Time Updates**: Live P&L tracking via WebSocket connections
- **Social Leaderboards**: Compete with other traders for top rankings

### Built With

| Technology | Purpose |
|------------|---------|
| [Salt Programmable Capital](https://salt.xyz) | Policy-controlled trading accounts & risk management |
| [Pear Protocol](https://pear.garden) | Pair/basket trade execution API |
| [Hyperliquid](https://hyperliquid.xyz) | Perpetual DEX for trade settlement |
| [HyperEVM](https://hyperliquid.xyz) | EVM-compatible blockchain (Chain ID: 998) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  Next.js 14 + TypeScript + TailwindCSS + Wagmi/Viem                │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ REST API + WebSocket
┌─────────────────────────────▼───────────────────────────────────────┐
│                           BACKEND                                    │
│  Node.js + Express + Prisma ORM + Redis                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Salt Service │  │ Pear Service │  │ Hyperliquid  │               │
│  │   (SDK)      │  │   (API)      │  │   Service    │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        HYPERLIQUID                                   │
│              Perpetual DEX on HyperEVM (Chain ID: 998)              │
└─────────────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **PostgreSQL** 14+ (local or hosted)
- **Redis** (optional, for caching/queues)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/narrative-vaults.git
   cd narrative-vaults
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

#### Backend Environment Variables

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Configure the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/narrative_vaults"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Blockchain
HYPEREVM_RPC_URL="https://rpc.hyperliquid.xyz/evm"
BACKEND_WALLET_PRIVATE_KEY="0x..."  # Your backend wallet private key

# Salt Protocol
SALT_FACTORY_ADDRESS="0x..."
SALT_SDK_RPC_URL="https://rpc.hyperliquid.xyz/evm"

# Pear Protocol
PEAR_API_BASE_URL="https://api.pear.garden"
PEAR_API_KEY=""
PEAR_EXECUTION_CONTRACT_ADDRESS="0x..."

# Application
PORT=3001
ADMIN_ADDRESS="0x..."

# Agent
AGENT_LOOP_INTERVAL_MS=30000
```

#### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_CHAIN_ID=998
```

### Database Setup

1. **Run migrations**
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

2. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

3. **Seed the database** (optional, adds test data)
   ```bash
   npm run db:seed
   ```

### Running the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

#### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

---

## Project Structure

```
narrative-vaults/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Database seeding
│   ├── src/
│   │   ├── api/
│   │   │   └── routes.ts       # API endpoints
│   │   ├── agent/
│   │   │   └── agentMainLoop.ts # Automated trading logic
│   │   ├── config/
│   │   │   └── narratives.ts   # Narrative configurations
│   │   ├── middleware/
│   │   │   └── auth.ts         # Wallet authentication
│   │   ├── services/
│   │   │   ├── salt.service.ts       # Salt SDK integration
│   │   │   ├── pear.service.ts       # Pear Protocol API
│   │   │   ├── hyperliquid.service.ts # Hyperliquid WebSocket
│   │   │   ├── deposit.service.ts    # Deposit handling
│   │   │   ├── withdrawal.service.ts # Withdrawal handling
│   │   │   ├── xp.service.ts         # XP & leveling system
│   │   │   ├── vault.service.ts      # Vault calculations
│   │   │   └── websocket.service.ts  # Real-time updates
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   └── index.ts            # Application entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VaultCard.tsx
│   │   │   ├── WalletConnectButton.tsx
│   │   │   ├── XPProgressBar.tsx
│   │   │   ├── LivePnLChart.tsx
│   │   │   └── DepositModal.tsx
│   │   ├── config/
│   │   │   └── wagmi.ts        # Wallet configuration
│   │   ├── hooks/
│   │   │   ├── useApi.ts       # API hooks
│   │   │   └── useWebSocket.ts # WebSocket hooks
│   │   ├── pages/
│   │   │   ├── index.tsx       # Home page
│   │   │   ├── dashboard.tsx   # User dashboard
│   │   │   ├── leaderboard.tsx # Leaderboards
│   │   │   ├── how-it-works.tsx
│   │   │   └── vault/
│   │   │       └── [narrativeId].tsx # Vault detail
│   │   ├── providers/
│   │   │   └── Web3Provider.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── api.ts          # API client
│   │       ├── websocket.ts    # WebSocket client
│   │       └── constants.ts    # Narratives config
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md         # System architecture
│   └── API_DOCS.md            # API documentation
│
└── README.md
```

---

## Available Narratives

| Narrative | Description | Long | Short | Min Level | Leverage |
|-----------|-------------|------|-------|-----------|----------|
| SOL vs ETH | Solana outperformance | SOL | ETH | 1 | 2x |
| AI vs Memes | Fundamentals over hype | FET, RNDR, TAO | DOGE, SHIB, PEPE | 2 | 3x |
| DeFi vs GameFi | Infrastructure over games | UNI, AAVE, MKR | AXS, SAND, MANA | 1 | 2x |
| L2 Wars | Arbitrum dominance | ARB | OP, MATIC | 3 | 4x |
| BTC Dominance | Flight to quality | BTC | ETH, SOL, AVAX | 2 | 3x |

---

## API Reference

### Authentication

All authenticated endpoints require the following headers:

```
x-wallet-address: 0x...
x-signature: 0x...
x-timestamp: 1234567890
```

The signature is created by signing the message: `Sign this message to authenticate with Narrative Vaults: {timestamp}`

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/narratives` | List all narratives | No |
| GET | `/api/vaults` | List active vaults | No |
| GET | `/api/vaults/:id` | Get vault details | No |
| POST | `/api/vaults/:narrativeId/deposit` | Deposit into vault | Yes |
| POST | `/api/vaults/:vaultId/withdraw` | Withdraw from vault | Yes |
| GET | `/api/vaults/:vaultId/position` | Get user's position | Yes |
| GET | `/api/user/:walletAddress` | Get user profile | Yes |
| GET | `/api/leaderboard` | Get leaderboards | No |
| GET | `/api/health` | Health check | No |

For complete API documentation, see [API_DOCS.md](docs/API_DOCS.md).

---

## XP & Leveling System

### XP Earning Mechanisms

| Action | XP Reward |
|--------|-----------|
| Vault profit (per 1%) | 100 XP |
| Daily holding bonus | 10 XP/day |
| First depositor bonus | 50 XP |
| Referral bonus | 25 XP |

### Level Thresholds

| Level | XP Required | Unlocks |
|-------|-------------|---------|
| 1 | 0 | Basic narratives (2x leverage) |
| 2 | 501 | Medium risk narratives (3x leverage) |
| 3 | 2,001 | High risk narratives (4x leverage) |
| 4 | 5,001 | Advanced features |
| 5 | 10,001 | All narratives unlocked |

---

## Security Considerations

- **Private Keys**: Backend wallet keys are stored in environment variables. Use a secrets manager in production.
- **Salt Policies**: All trades are executed through Salt policy accounts with enforced risk limits.
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse.
- **Signature Verification**: All authenticated requests require valid wallet signatures.
- **Emergency Pause**: Admin can pause all vaults in case of critical issues.

---

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend/`
3. Add environment variables
4. Deploy

### Backend (Railway/Render)

1. Connect your GitHub repository
2. Set root directory to `backend/`
3. Add PostgreSQL and Redis addons
4. Configure environment variables
5. Set build command: `npm run build`
6. Set start command: `npm start`

### Database (Supabase/Neon)

1. Create a PostgreSQL database
2. Copy the connection string to `DATABASE_URL`
3. Run migrations: `npx prisma migrate deploy`

---

## Development

### Available Scripts

**Backend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database
npm run lint         # Run ESLint
npm run test         # Run tests
```

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Conventional commits for version control

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Roadmap

- [ ] Mobile-responsive UI improvements
- [ ] Additional narrative strategies
- [ ] Social features (copy trading, vault followers)
- [ ] NFT achievements and badges
- [ ] Multi-chain support
- [ ] Advanced charting with TradingView
- [ ] Telegram/Discord bot integration

---

## Acknowledgements

- [Salt Protocol](https://salt.xyz) - Programmable capital infrastructure
- [Pear Protocol](https://pear.garden) - Pair trading execution
- [Hyperliquid](https://hyperliquid.xyz) - High-performance perpetual DEX
- [ETH Denver 2026](https://ethdenver.com) - Hackathon event

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/narrative-vaults/issues)
- **Discord**: [Join our community](https://discord.gg/narrativevaults)

---

<div align="center">


[Website](https://narrativevaults.xyz) | [Twitter](https://twitter.com/narrativevaults) | [Discord](https://discord.gg/narrativevaults)

</div>
