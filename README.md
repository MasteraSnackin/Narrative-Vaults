# Narrative Vaults

<div align="center">

![Narrative Vaults Banner](docs/assets/banner.png)

[![GitHub Stars](https://img.shields.io/github/stars/MasteraSnackin/Narrative-Vaults?style=flat-square)](https://github.com/MasteraSnackin/Narrative-Vaults/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/MasteraSnackin/Narrative-Vaults?style=flat-square)](https://github.com/MasteraSnackin/Narrative-Vaults/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/MasteraSnackin/Narrative-Vaults?style=flat-square)](https://github.com/MasteraSnackin/Narrative-Vaults/issues)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/MasteraSnackin/Narrative-Vaults?style=flat-square)](https://github.com/MasteraSnackin/Narrative-Vaults/commits/main)
[![Code Size](https://img.shields.io/github/languages/code-size/MasteraSnackin/Narrative-Vaults?style=flat-square)](https://github.com/MasteraSnackin/Narrative-Vaults)

**🎮 A Gamified Pair Trading Platform for Market Narratives**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/MasteraSnackin/Narrative-Vaults/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

[Demo](https://narrativevaults.xyz/) | [Documentation](docs/ARCHITECTURE.md) | [API Reference](docs/API_DOCS.md)



</div>

---

Multiple users can deposit into narrative “boxes” (vaults) that automatically trade long/short pairs and baskets on Hyperliquid via the Pear Execution API, with risk and permissions enforced by Salt policies and a gamified leveling system


---

## 😩 The Problem

**Pair Trading is Powerful But Complex**

While pair trading is one of the most sophisticated trading strategies used by hedge funds and institutional investors, it remains largely inaccessible to retail traders:

- ❌ **Requires managing multiple positions**: Coordinating long and short positions across different assets is technically challenging
- ❌ **Understand narratives but can't execute**: Traders see market opportunities but lack the tools to act on them efficiently  
- ❌ **Most retail traders never attempt it**: The complexity barrier prevents 95% of retail traders from using this proven strategy

**Our Solution: Narrative Vaults makes pair trading as simple as a single click** 🚀

## 🌟 Overview

Narrative Vaults is a **decentralized trading platform** that transforms pair trading into an engaging, gamified experience. Users deposit into narrative-based vaults that execute automated pair trades on Hyperliquid, earning XP and leveling up to unlock advanced trading strategies.

### 🎯 What Makes It Special?

- **📊 Narrative-Based Trading**: Trade market themes like "AI vs Memes", "SOL vs ETH", or "DeFi vs GameFi"
- **🎮 Gamification**: Earn XP for profitable trades, level up to unlock higher leverage narratives
- **🛡️ Automated Risk Management**: Salt-powered policy controls with automatic drawdown protection
- **⚡ Real-Time Updates**: Live P&L tracking via WebSocket connections
- **🏆 Social Leaderboards**: Compete with other traders for top rankings
- **🔐 Non-Custodial**: Your funds, your control - trade through policy-enforced accounts

## ⚙️ How It Works

**Simple 3-Step Process:**

1️⃣ **One-Click Deposit** 💰
- Users deposit funds with a single click
- Funds are allocated to a Salt Policy Account for secure trading

2️⃣ **Automated Trading** 🤖
- Agent Loop runs every 30 seconds, monitoring market conditions
- Pear API executes pair trades automatically on Hyperliquid
- Salt Protocol enforces risk limits and protects your capital

3️⃣ **Earn & Level Up** 🎮
- Profitable trades earn XP
- Level up to unlock advanced narratives with higher leverage
- Track progress on social leaderboards

**Technical Architecture Flow:**

```
👥 User Deposit → 🛡️ Salt Policy Account → 🎲 Hyperliquid
                     ↓                      ↑
            ⏰ Agent Loop (30s)    ←  🍍 Pear API
```

**Key Components:**
- ✅ **Salt Protocol**: Enforces risk limits and automatic liquidation on breach
- ✅ **Pear Protocol SDK**: Executes pair/basket trades seamlessly  
- ✅ **Hyperliquid**: High-performance perpetual DEX for trade settlement
- ✅ **Automated Agent**: 30-second loop for real-time market response

## 🎯 Why Choose Narrative Vaults?

**✅ Accessible**
- No complex setup or technical knowledge required
- One-click deposit to start trading narratives
- User-friendly dashboard for all experience levels

**🛡️ Safe**
- Non-custodial: Your funds, your control
- Salt Protocol security policies enforce risk limits
- Automatic drawdown protection prevents catastrophic losses
- Rate limiting and input validation on all endpoints

**🎮 Engaging**
- Gamified XP system makes trading fun and rewarding  
- Level progression unlocks new strategies
- Social leaderboards foster friendly competition
- Real-time updates keep you in the action

**📊 Real Volume**
- All trades execute on Hyperliquid with actual liquidity
- Transparent on-chain settlement
- No paper trading – real profits from real markets

---

<img width="1024" height="1024" alt="9e530d87-d9eb-4ab7-8028-6c71f65a2881" src="https://github.com/user-attachments/assets/a6dd3eca-b812-4041-afe7-bb2ea179aa63" />


---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|--------|
| [Salt Protocol](https://salt.xyz/) | Policy-controlled trading accounts & risk management |
| [Pear Protocol](https://pear.garden/) | Pair/basket trade execution API |
| [Hyperliquid](https://hyperliquid.xyz/) | Perpetual DEX for trade settlement |
| [HyperEVM](https://hyperliquid.xyz/) | EVM-compatible blockchain (Chain ID: 998) |

---

## 🎬 Presentation

<div align="center">

### 📊 View Full Presentation

**The Pair Trading Problem & Solution**

[<img src="https://img.shields.io/badge/📊_Download_Presentation-4285F4?style=for-the-badge&logo=google-slides&logoColor=white" alt="Download Presentation">](https://github.com/user-attachments/files/24689966/The-Pair-Trading-Problem.pptx)

*Click above to download the complete PowerPoint presentation covering:*
- The Problem: Why pair trading is complex for retail traders
- Our Solution: One-click narrative trading
- How It Works: 3-step automated process
- Platform Benefits: Accessible • Safe • Engaging • Real Volume
- Architecture: Technical implementation details

</div>

[The-Pair-Trading-Problem.pptx](https://github.com/user-attachments/files/24689966/The-Pair-Trading-Problem.pptx)

---


## ✨ Key Features

### 📈 Narrative-Based Trading

Trade crypto market themes and narratives, not just individual tokens. Each vault represents a bet on one narrative outperforming another through automated long/short pair trades.

### 🎮 Gamification & Progression

- **Earn XP**: Gain experience points for profitable trades
- **Level Up**: Unlock advanced narratives with higher leverage
- **Leaderboards**: Compete for top trader rankings
- **Achievements**: Complete challenges to earn rewards

### 🛡️ Enterprise-Grade Risk Management

Powered by Salt Protocol's programmable capital infrastructure:

- **Policy-Enforced Accounts**: All trades execute through Salt policy accounts
- **Automatic Drawdown Protection**: Positions close automatically to protect capital
- **Leverage Limits**: Maximum leverage controlled by user level
- **Emergency Pause**: Admin controls for critical situations

### ⚡ Real-Time Experience

- **Live P&L Tracking**: WebSocket connections for instant updates
- **Position Monitoring**: Track your trades in real-time
- **Market Data**: Live price feeds from Hyperliquid

---

## 📊 Available Narratives

| Narrative | Description | Long | Short | Min Level | Leverage |
|-----------|-------------|------|-------|-----------|----------|
| **SOL vs ETH** | Solana outperformance | SOL | ETH | 1 | 2x |
| **AI vs Memes** | Fundamentals over hype | FET, RNDR, TAO | DOGE, SHIB, PEPE | 2 | 3x |
| **DeFi vs GameFi** | Infrastructure over games | UNI, AAVE, MKR | AXS, SAND, MANA | 1 | 2x |
| **L2 Wars** | Arbitrum dominance | ARB | OP, MATIC | 3 | 4x |
| **BTC Dominance** | Flight to quality | BTC | ETH, SOL, AVAX | 2 | 3x |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **PostgreSQL** 14+ (local or hosted)
- **Redis** (optional, for caching/queues)
- **Git**

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/MasteraSnackin/narrative-vaults.git
cd narrative-vaults

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Set up environment variables (see Configuration section below)
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 5. Run database migrations
cd backend
npx prisma migrate dev
npx prisma generate

# 6. Start the development servers
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

---

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env` with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/narrative_vaults"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Blockchain
HYPEREVM_RPC_URL="https://rpc.hyperliquid.xyz/evm"
BACKEND_WALLET_PRIVATE_KEY="0x..."

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

### Frontend Environment Variables

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_CHAIN_ID=998
```

---

## 🏛️ Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["FRONTEND"]
        A["Next.js 14 + TypeScript + TailwindCSS + Wagmi/Viem"]
    end
    
    subgraph Backend["BACKEND"]
        B["Node.js + Express + Prisma ORM + Redis"]
        C["Salt Service (SDK)"]
        D["Pear Service (API)"]
        E["Hyperliquid Service"]
    end
    
    subgraph Hyperliquid["HYPERLIQUID"]
        F["Perpetual DEX on HyperEVM (Chain ID: 998)"]
    end
    
    A -->|REST API + WebSocket| B
    B --> C
    B --> D
    B --> E
    C --> F
    D --> F
    E --> F
```

For detailed architecture documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 📚 Project Structure

```
narrative-vaults/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts              # Database seeding
│   ├── src/
│   │   ├── api/                 # API endpoints
│   │   ├── agent/               # Automated trading logic
│   │   ├── config/              # Narrative configurations
│   │   ├── middleware/          # Authentication
│   │   ├── services/            # Business logic
│   │   │   ├── salt.service.ts
│   │   │   ├── pear.service.ts
│   │   │   ├── hyperliquid.service.ts
│   │   │   └── xp.service.ts
│   │   ├── types/               # TypeScript interfaces
│   │   └── index.ts             # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── VaultCard.tsx
│   │   │   ├── WalletConnectButton.tsx
│   │   │   └── XPProgressBar.tsx
│   │   ├── config/              # Wallet configuration
│   │   ├── hooks/               # Custom hooks
│   │   ├── pages/               # Next.js pages
│   │   └── utils/               # Utility functions
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md      # System architecture
│   └── API_DOCS.md          # API documentation
│
└── README.md
```

---

## 🎮 XP & Leveling System

### Earn XP

| Action | XP Reward |
|--------|----------|
| Vault profit (per 1%) | 100 XP |
| Daily holding bonus | 10 XP/day |
| First depositor bonus | 50 XP |
| Referral bonus | 25 XP |

### Level Up

| Level | XP Required | Unlocks |
|-------|-------------|----------|
| 1 | 0 | Basic narratives (2x leverage) |
| 2 | 501 | Medium risk narratives (3x leverage) |
| 3 | 2,001 | High risk narratives (4x leverage) |
| 4 | 5,001 | Advanced features |
| 5 | 10,001 | All narratives unlocked |

---

## 💻 API Reference

### Authentication

All authenticated endpoints require these headers:

```
x-wallet-address: 0x...
x-signature: 0x...
x-timestamp: 1234567890
```

The signature is created by signing:
```
Sign this message to authenticate with Narrative Vaults: {timestamp}
```

### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/narratives` | List all narratives | No |
| GET | `/api/vaults` | List active vaults | No |
| GET | `/api/vaults/:id` | Get vault details | No |
| POST | `/api/vaults/:narrativeId/deposit` | Deposit into vault | Yes |
| POST | `/api/vaults/:vaultId/withdraw` | Withdraw from vault | Yes |
| GET | `/api/vaults/:vaultId/position` | Get user position | Yes |
| GET | `/api/user/:walletAddress` | Get user profile | Yes |
| GET | `/api/leaderboard` | Get leaderboards | No |
| GET | `/api/health` | Health check | No |

For complete API documentation, see [API_DOCS.md](docs/API_DOCS.md).

---

## 🔒 Security

- **🔐 Private Keys**: Stored securely in environment variables; use secrets manager in production
- **🛡️ Salt Policies**: All trades execute through policy accounts with enforced risk limits
- **⌛ Rate Limiting**: API endpoints protected against abuse
- **✍️ Signature Verification**: All authenticated requests require valid wallet signatures
- **🛑 Emergency Pause**: Admin can pause all vaults in critical situations
- **📊 Audit Trail**: All transactions logged for transparency

---

## 🚀 Deployment

### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Set root directory to `frontend/`
3. Add environment variables
4. Deploy

### Backend (Railway/Render)

1. Connect GitHub repository
2. Set root directory to `backend/`
3. Add PostgreSQL and Redis addons
4. Configure environment variables
5. Build command: `npm run build`
6. Start command: `npm start`

### Database (Supabase/Neon)

1. Create PostgreSQL database
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `npx prisma migrate deploy`

---

## 🛠️ Development

### Available Scripts

**Backend:**

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run db:migrate # Run database migrations
npm run db:seed   # Seed database
npm run lint      # Run ESLint
```

**Frontend:**

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
```

### Code Style

- ✅ TypeScript strict mode enabled
- ✅ ESLint + Prettier for code formatting
- ✅ Conventional commits for version control

---

### 🆕 Recent Updates

**Version 0.1.0** (January 15, 2025)

#### Added Features
- ✅ **Pear Protocol SDK Integration**: Seamless automated pair trade execution through official SDK
- ✅ **Smart Contract Integration**: Salt Protocol for access control and risk management
- ✅ **XP & Leveling System**: Gamified user progression tracking with achievements
- ✅ **Multiple Narrative Strategies**: AI, DeFi, GameFi, Layer 1, and Layer 2 narratives
- ✅ **Real-time WebSocket Connections**: Live trading updates and P&L tracking
- ✅ **User Dashboard**: Portfolio analytics and position tracking
- ✅ **Social Leaderboards**: Compete with other traders for rankings
- ✅ **Risk Management**: Automatic drawdown protection through Salt policies

#### Security Enhancements
- 🔐 Salt Protocol security policies implementation
- 🔐 API key encryption for exchange credentials
- 🔐 Rate limiting on all API endpoints
- 🔐 Input validation and sanitization

#### Documentation
- 📚 Comprehensive README with project overview
- 📚 Architecture documentation with system diagrams
- 📚 API documentation with endpoint specifications
- 📚 Contributing guidelines and security policy

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. 🍴 Fork the repository
2. 🌱 Create a feature branch: `git checkout -b feature/amazing-feature`
3. 📝 Commit your changes: `git commit -m 'Add amazing feature'`
4. 🚀 Push to the branch: `git push origin feature/amazing-feature`
5. 📨 Open a Pull Request

---

## 🗺️ Roadmap

- [ ] 📱 Mobile-responsive UI improvements
- [ ] 📊 Additional narrative strategies
- [ ] 👥 Social features (copy trading, vault followers)
- [ ] 🏆 NFT achievements and badges
- [ ] 🌐 Multi-chain support
- [ ] 📊 Advanced charting with TradingView
- [ ] 🤖 Telegram/Discord bot integration
- [ ] 📡 Push notifications for trade events
- [ ] 📋 Custom narrative creation by users

---

## 🚀 Built For

Narrative Vaults was built to showcase the power of combining:

- [Salt Protocol](https://salt.xyz) - Programmable capital infrastructure
- [Pear Protocol](https://pear.garden) - Pair trading execution
- [Hyperliquid](https://hyperliquid.xyz) - High-performance perpetual DEX
- Gamification mechanics for trader engagement

---

## 🙏 Acknowledgements

Special thanks to:

- **[Salt Protocol](https://salt.xyz/)** - Programmable capital infrastructure
- **[Pear Protocol](https://pear.garden/)** - Pair trading execution API
- **[Hyperliquid](https://hyperliquid.xyz/)** - High-performance perpetual DEX

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

Need help? Reach out through:

- **📚 Documentation**: [docs/](docs)
- **🐛 Issues**: [GitHub Issues](https://github.com/MasteraSnackin/narrative-vaults/issues)
- **💬 Discord**: [Join our community](https://discord.gg/narrativevaults)
- **🐦 Twitter**: [@narrativevaults](https://twitter.com/narrativevaults)

---

### 🌟 Star this repo if you find it useful!

[Website](https://narrativevaults.xyz/) • [Twitter](https://twitter.com/narrativevaults) • [Discord](https://discord.gg/narrativevaults)

Made with ❤️ by the Narrative Vaults team
