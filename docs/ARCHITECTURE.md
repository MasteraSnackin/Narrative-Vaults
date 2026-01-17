# Narrative Vaults - Project Architecture Document

## 1. System Overview

Narrative Vaults is a gamified decentralized trading platform that allows users to participate in pair and basket trades based on market narratives without managing individual trading legs. It leverages the Pear Protocol for trade execution on Hyperliquid and Salt Programmable Capital for policy-controlled vaults and risk management.

### Architecture Diagram

```mermaid
graph TD
    User(User - Web Browser)
    Frontend(Next.js Frontend)
    Backend(Node.js Backend - Express/Fastify)
    Database(PostgreSQL)
    Redis(Redis - Cache/Queue)
    PearAPI(Pear Protocol Execution API)
    SaltSDK(Salt SDK)
    Hyperliquid(Hyperliquid Exchange)
    Cron(Cron Jobs / Agent Loop)

    User -- Connect Wallet (wagmi/viem) --> Frontend
    Frontend -- REST API Calls --> Backend
    Frontend -- WebSocket (Live P&L) --> Backend

    Backend -- ORM (Prisma) --> Database
    Backend -- Cache / Session / Bull Queue --> Redis
    Backend -- Pear API Calls --> PearAPI
    Backend -- Salt SDK Calls --> SaltSDK

    SaltSDK -- On-chain transactions --> Hyperliquid
    PearAPI -- Trade Execution --> Hyperliquid

    Cron -- Periodically Triggers --> Backend (Agent Logic)
    Backend (Agent Logic) -- Pear API Calls --> PearAPI
    Backend (Agent Logic) -- Salt SDK Calls --> SaltSDK
    Backend (Agent Logic) -- Update Data --> Database
    Backend (Agent Logic) -- Publish Updates --> WebSocket
```

## 2. Component Breakdown

### 2.1. Frontend (Next.js 14, TypeScript)

The frontend is a single-page application built with Next.js, providing a rich user experience with a retro-gaming aesthetic.

*   **Framework:** Next.js 14
*   **Language:** TypeScript
*   **Styling:** TailwindCSS for responsive and consistent design.
*   **Web3 Integration:** `wagmi` for wallet connection and interaction, `viem` for low-level Ethereum interactions (e.g., contract calls).
*   **State Management:**
    *   **Server State:** React Query for managing asynchronous data fetching, caching, and synchronization with the backend API (e.g., vault data, user XP, trade history).
    *   **Global Client State:** Zustand for lightweight global state management (e.g., user authentication status, theme preferences, temporary UI states).
*   **Real-time Updates:** WebSocket connection to the backend for live P&L updates, XP accumulation, and achievement notifications.
*   **Charts:** Lightweight-charts or Recharts for visualizing vault performance and individual position P&L.

#### Key Frontend Components:

*   **[`VaultCard.tsx`](frontend/src/components/VaultCard.tsx):** Displays narrative vault information, current P&L, TVL, and lock status.
    *   **Props:** `narrative`, `currentPnL`, `tvl`, `isLocked`
    *   **State:** None (receives all data via props or global state).
*   **[`XPProgressBar.tsx`](frontend/src/components/XPProgressBar.tsx):** Visualizes user's XP progress and current level.
    *   **Props:** `currentXP`, `currentLevel`, `nextLevelThreshold`
    *   **State:** None.
*   **[`LivePnLChart.tsx`](frontend/src/components/LivePnLChart.tsx):** Renders real-time P&L for a specific vault using WebSocket data.
    *   **Props:** `vaultId`, `websocketEndpoint`
    *   **State:** Chart data (updated via WebSocket).
*   **[`DepositModal.tsx`](frontend/src/components/DepositModal.tsx):** Handles user deposits into a vault.
    *   **Props:** `narrative`, `onDeposit` (callback), `userBalance`
    *   **State:** Deposit amount input, loading state.
*   **[`WalletConnectButton.tsx`](frontend/src/components/WalletConnectButton.tsx):** Standard button for connecting EVM wallets.
*   **Pages:**
    *   **[`index.tsx`](frontend/src/pages/index.tsx):** Landing page, displays `VaultCard` grid, trending vaults.
    *   **[`dashboard.tsx`](frontend/src/pages/dashboard.tsx):** User's personal dashboard (XP, level, portfolio, active positions).
    *   **[`vault/[narrativeId].tsx`](frontend/src/pages/vault/[narrativeId].tsx):** Detailed vault view, deposit/withdraw, `LivePnLChart`.
    *   **[`leaderboard.tsx`](frontend/src/pages/leaderboard.tsx):** Displays top users and vaults.
    *   **[`how-it-works.tsx`](frontend/src/pages/how-it-works.tsx):** Educational content.

### 2.2. Backend (Node.js, TypeScript)

The backend is responsible for API endpoints, database interactions, Pear and Salt SDK integrations, and the core agent logic.

*   **Runtime:** Node.js
*   **Framework:** Express.js or Fastify (for high performance).
*   **Language:** TypeScript for strong typing and improved maintainability.
*   **Database:** PostgreSQL for persistent storage of user data, vault states, trades, and XP events.
    *   **ORM:** Prisma for type-safe database access and migrations.
*   **Caching/Real-time Data:** Redis for caching hot data (e.g., live P&L, XP calculations) and managing WebSocket connections.
*   **Queueing:** Bull for asynchronous processing of trade execution jobs, retries, and other background tasks to ensure responsiveness.
*   **Monitoring:** Cron jobs to trigger the main agent loop every 30 seconds.
*   **WebSockets:** For real-time updates to the frontend (e.g., P&L, XP, notifications).

#### Key Backend Modules/Services:

*   **[`api/`](backend/src/api/):** Defines REST API routes for user interactions (deposits, withdrawals), data retrieval (vaults, user data), and potentially webhook endpoints.
*   **[`agent/`](backend/src/agent/):** Contains the core agent logic, including `agentMainLoop` for monitoring vaults, enforcing risk limits, and awarding XP.
*   **[`services/`](backend/src/services/):** Encapsulates external API integrations (Pear, Salt, Hyperliquid), business logic (XP calculation, share token calculation), and other reusable functions.
    *   **[`pear.service.ts`](backend/src/services/pear.service.ts):** Handles all interactions with the Pear Protocol API.
    *   **[`salt.service.ts`](backend/src/services/salt.service.ts):** Manages Salt SDK interactions, including account creation and transaction execution.
    *   **[`hyperliquid.service.ts`](backend/src/services/hyperliquid.service.ts):** Interfaces with Hyperliquid for price data, position monitoring, and emergency liquidations.
    *   **[`xp.service.ts`](backend/src/services/xp.service.ts):** Implements XP calculation and leveling logic.
*   **[`db/`](backend/src/db/):** Contains Prisma schema definition and database interaction utilities.

### 2.3. Smart Contracts (HyperEVM)

While the project emphasizes agent-based control, minimal smart contract interaction might be required.

*   **Vault Share Token (ERC-20):** An ERC-20 compliant token deployed on HyperEVM to represent user's proportional shares in a vault. This allows for standardized tracking and transfer of vault ownership.
*   **Emergency Pause Contract:** A simple contract with an admin-controlled function to halt all new deposits and potentially trigger mass position closures in case of systemic issues. This would be controlled by the `ADMIN_ADDRESS` specified in the Salt policy.

### 2.4. Data Flow Diagram

```mermaid
flowchart LR
    A[User Wallet] --> B(Frontend);
    B -- Connect/Auth --> C(Backend API);
    C -- Deposit Request --> D{Deposit Handler};
    D -- Create Salt Account (if new) --> E(Salt SDK);
    E -- On-chain TX --> F(Hyperliquid);
    D -- Transfer USDC --> E;
    E -- On-chain TX --> F;
    D -- Record Position/Update Vault --> G(PostgreSQL DB);
    D -- Execute Initial Trade (if needed) --> H(Pear Service);
    H -- Pear API Call --> I(Pear Protocol);
    I -- Trade on Hyperliquid --> F;

    subgraph Backend Agent Loop (Every 30s)
        J[Agent Start] --> K(Fetch Active Vaults from DB);
        K --> L(Get Position Status via Pear Service);
        L -- Pear API Call --> I;
        L --> M{Calculate Drawdown};
        M -- Check Risk Limits --> N{Salt Policy Check};
        N -- Policy Violated? --> O(Close Position via Pear Service);
        O -- Pear API Call --> I;
        O --> P(Log Risk Event to DB);
        O --> Q(Update Vault Status in DB);
        M -- No Violation --> R(Update Vault P&L in DB);
        R --> S(Calculate & Award XP);
        S --> T(Update User XP in DB);
        T --> U(Publish Real-time Updates via WebSocket);
        U --> B;
    end
```

## 3. Database Schema

The database schema (PostgreSQL with Prisma ORM) is critical for managing user data, vault states, trade history, and gamification elements.

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  referral_code VARCHAR(8) UNIQUE,
  referred_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vaults table
CREATE TABLE vaults (
  id UUID PRIMARY KEY,
  narrative_id VARCHAR(50) NOT NULL,
  salt_account_address VARCHAR(42) UNIQUE,
  total_deposits DECIMAL(18, 6) DEFAULT 0,
  current_pnl DECIMAL(18, 6) DEFAULT 0,
  active_position_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- User positions in vaults
CREATE TABLE vault_positions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vault_id UUID REFERENCES vaults(id),
  deposit_amount DECIMAL(18, 6) NOT NULL,
  share_tokens DECIMAL(18, 6) NOT NULL,
  entry_pnl DECIMAL(18, 6) DEFAULT 0,
  deposited_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP
);

-- Trading positions
CREATE TABLE trades (
  id UUID PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id),
  pear_trade_id VARCHAR(100) UNIQUE,
  narrative_id VARCHAR(50),
  long_tokens TEXT[],
  short_tokens TEXT[],
  leverage DECIMAL(3, 2),
  entry_value DECIMAL(18, 6),
  current_value DECIMAL(18, 6),
  realized_pnl DECIMAL(18, 6),
  status VARCHAR(20),
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- XP ledger
CREATE TABLE xp_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vault_id UUID REFERENCES vaults(id),
  xp_earned INTEGER NOT NULL,
  event_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Risk events log
CREATE TABLE risk_events (
  id UUID PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id),
  event_type VARCHAR(50),
  current_drawdown DECIMAL(5, 2),
  max_allowed_drawdown DECIMAL(5, 2),
  action_taken VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. API Integration Specifications

### 4.1. Pear Protocol Integration

*   **Base URL:** `https://api.pear.garden` (to be verified with Pear Protocol documentation).
*   **Authentication:** `ClientId: HLHackathon1` through `HLHackathon10`. The backend will manage client ID rotation or assignment to vaults.
*   **Error Handling:**
    *   Retry failed trades 3 times with exponential backoff.
    *   If Pear API is down, queue trades locally (using Bull), and notify users of delay via WebSocket.
    *   If slippage exceeds the configured tolerance, abort the trade and refund deposits minus gas fees.

#### Key Endpoints:

*   **`POST /api/v1/execute-pair`:**
    *   **Request Body:**
        ```typescript
        interface ExecutePairRequest {
          clientId: string;
          longAsset: string;
          shortAsset: string;
          longAmount: number; // or total value for a ratio-based approach
          leverage: number;
          slippageTolerance: number;
        }
        ```
*   **`POST /api/v1/execute-basket`:**
    *   **Request Body:**
        ```typescript
        interface ExecuteBasketRequest {
          clientId: string;
          longBasket: Array<{ asset: string; weight: number }>;
          shortBasket: Array<{ asset: string; weight: number }>;
          totalValue: number;
          leverage: number;
        }
        ```
*   **`GET /api/v1/position/{tradeId}`:**
    *   **Response Body:**
        ```typescript
        interface PositionStatusResponse {
          tradeId: string;
          status: 'open' | 'closed' | 'liquidated' | 'pending';
          currentValue: number;
          unrealizedPnL: number;
          longPositions: Array<{ asset: string; quantity: number; entryPrice: number }>;
          shortPositions: Array<{ asset: string; quantity: number; entryPrice: number }>;
          // ... other relevant position details
        }
        ```
*   **`POST /api/v1/close/{tradeId}`:**
    *   **Request Body:** None (tradeId in path)
    *   **Response Body:** Confirmation of closure or error.

### 4.2. Salt SDK Integration

*   **Documentation:** "A-Z Building an Agent on Salt" guide and Salt SDK docs.
*   **ABI Encoding:** The backend will use a library like `ethers.js` or `viem` to ABI-encode Pear API call data for `externalCall` actions within the Salt SDK.

#### Core Functions:

*   **`createVaultAccount(narrativeConfig):`**
    *   Creates a new policy-controlled Salt account for a given narrative.
    *   **Policy Rules:** `maxLeverage`, `maxDrawdownPercent`, `allowedProtocols` (`pear.garden`, `hyperliquid`), `emergencyAdmin`.
    *   Returns the new Salt account address.
*   **`executeTradeViaSalt(vaultAddress, tradeData):`**
    *   Executes a transaction through the Salt policy account.
    *   `tradeData` will be the ABI-encoded Pear API call.
    *   Salt will perform policy checks before executing the external call to the Pear Execution Contract.
*   **`checkRiskLimits(vaultAddress):`**
    *   Retrieves the account state from Salt.
    *   Calculates current drawdown.
    *   Compares against `maxDrawdownPercent` from the Salt policy.
    *   Returns compliance status and recommended action (e.g., `close_positions`) if non-compliant.

### 4.3. Hyperliquid API Integration

*   **Network:** HyperEVM (Chain ID: 999, RPC: `https://rpc.hyperliquid.xyz/evm`)
*   **API Wallet Setup:** A dedicated backend wallet (private key secured in environment variables/HSM) will be used for signing transactions related to the Salt policy account and covering HyperEVM gas fees. The Salt policy account will hold the actual trading capital (USDC).

#### Key Operations:

*   **Get Asset Prices:** For accurate P&L calculations and real-time display.
*   **Monitor Position Health:** Real-time monitoring via WebSocket for critical alerts.
*   **Emergency Liquidation:** Direct interaction with Hyperliquid (if necessary and within Salt policy) in extreme risk scenarios, though Pear API `closePosition` is the primary method.

## 5. Backend Agent Logic

The heart of the Narrative Vaults platform, ensuring automated trading, risk management, and gamification.

### 5.1. Main Agent Loop

Runs every 30 seconds (triggered by a cron job).

```typescript
async function agentMainLoop() {
  const activeVaults = await db.vaults.findMany({ status: 'active' });

  for (const vault of activeVaults) {
    // 1. Check current position P&L via Pear API
    const position = await pearAPI.getPosition(vault.active_position_id);

    // 2. Calculate drawdown from vault inception
    const drawdown = calculateDrawdown(vault.total_deposits, position.currentValue);

    // 3. Check if risk limits breached
    const narrative = NARRATIVES[vault.narrative_id];
    if (drawdown > parseFloat(narrative.max_drawdown)) {
      // ⚠️ Policy Breach: Agent closes position
      await pearAPI.closePosition(vault.active_position_id);

      // 4. Log risk event
      await db.risk_events.create({
        vault_id: vault.id,
        event_type: 'auto_liquidation',
        current_drawdown: drawdown,
        max_allowed_drawdown: narrative.max_drawdown,
        action_taken: 'closed_all_positions'
      });

      // 5. Update vault status
      await db.vaults.update({
        where: { id: vault.id },
        data: { status: 'liquidated' }
      });
    }

    // 6. Update vault P&L in database (for real-time display)
    await db.vaults.update({
      where: { id: vault.id },
      data: { current_pnl: position.unrealizedPnL }
    });

    // 7. Calculate and award XP to vault participants
    await calculateAndAwardXP(vault, position);
  }
}

// Scheduled execution: setInterval(agentMainLoop, 30000);
```

### 5.2. Deposit Handler

Triggered when a user deposits USDC into a vault.

```typescript
async function handleUserDeposit(userId, narrativeId, depositAmount) {
  let vault = await db.vaults.findFirst({
    where: { narrative_id: narrativeId, status: 'active' }
  });

  // 1. If no vault, create new one with Salt
  if (!vault) {
    const narrative = NARRATIVES[narrativeId];
    const saltAccountAddress = await saltService.createVaultAccount(narrative);

    vault = await db.vaults.create({
      data: {
        narrative_id: narrativeId,
        salt_account_address: saltAccountAddress,
        total_deposits: 0 // Will be updated after transfer
      }
    });
  }

  // 2. Transfer user's USDC to vault Salt account (simulated/actual)
  await saltService.transferToSaltAccount(vault.salt_account_address, depositAmount);

  // 3. Calculate share tokens (proportional to current vault value)
  const shareTokens = calculateShareTokens(vault, depositAmount);

  // 4. Record user's position
  await db.vault_positions.create({
    data: {
      user_id: userId,
      vault_id: vault.id,
      deposit_amount: depositAmount,
      share_tokens: shareTokens
    }
  });

  // 5. Update vault total deposits
  await db.vaults.update({
    where: { id: vault.id },
    data: { total_deposits: vault.total_deposits + depositAmount }
  });

  // 6. Execute trade via Pear if vault just created or needs rebalance
  if (!vault.active_position_id || shouldRebalance(vault)) {
    const narrative = NARRATIVES[narrativeId];
    // This trade will be executed via Salt
    const pearTradeData = pearService.prepareTradeData(vault, narrative);
    const txHash = await saltService.executeTradeViaSalt(vault.salt_account_address, pearTradeData);

    // Assuming we get a trade ID back from Pear after Salt execution confirms
    const tradeId = await pearService.getTradeIdFromTxHash(txHash); // Placeholder for actual Pear integration
    
    await db.vaults.update({
      where: { id: vault.id },
      data: { active_position_id: tradeId }
    });
  }

  // 7. Award first depositor bonus XP
  const isFirstDeposit = await checkIfFirstDeposit(vault.id);
  if (isFirstDeposit) {
    await xpService.awardXP(userId, vault.id, 50, 'first_depositor_bonus');
  }

  return { vaultId: vault.id, shareTokens };
}
```

## 6. Security & Risk Management

Critical considerations for a robust and secure platform.

*   **Private Key Security:** Hyperliquid API wallet private keys will be stored securely in environment variables (for hackathon) or a dedicated secret management service (e.g., AWS Secrets Manager, HashiCorp Vault) for production. Access will be restricted.
*   **Salt Policy Audit:** Thoroughly review and test Salt policy definitions (max leverage, drawdown limits, allowed protocols) before deployment to ensure they function as intended and prevent unauthorized actions.
*   **Rate Limiting:** Implement backend rate limiting (e.g., `express-rate-limit`) to prevent spam deposits (e.g., max 5 deposits per user per hour).
*   **Emergency Pause:** The emergency pause smart contract will allow the designated `ADMIN_ADDRESS` to halt new deposits and potentially trigger mass liquidations if a severe vulnerability or market anomaly is detected.
*   **Slippage Protection:** Configure slippage tolerance in Pear API calls. If the actual trade slippage exceeds the defined threshold (e.g., 2%), the trade will be aborted, and user deposits (minus gas fees) will be refunded.
*   **Edge Case Handling:**
    *   **Partial Fills:** If Pear returns a partial fill for a basket order, the agent will scale down the entire position proportionally to maintain the narrative's intended ratio.
    *   **API Downtime:** Implement circuit breakers and retry mechanisms. If Pear or Hyperliquid APIs are down, trades will be queued in BullMQ, retried, and users will be notified via WebSocket.
    *   **Vault Insolvency:** If accumulated losses (due to leverage) exceed total deposits, the vault will be marked as insolvent, withdrawals frozen, and an administrative review triggered.
    *   **User Withdraws Mid-Trade:** When a user withdraws, their share of the current P&L will be calculated. Share tokens will be burned, and proportional USDC will be transferred back. This requires a robust `calculatePnLShare` function.

## 7. Development and Deployment Strategy

### 7.1. Implementation Plan (High-Level Task Breakdown)

This plan prioritizes core functionality and hackathon readiness.

1.  **Backend Setup & Core Services:**
    *   Initialize Node.js project, TypeScript, Express/Fastify.
    *   Set up PostgreSQL with Prisma ORM and define schema.
    *   Implement basic user authentication (wallet connect).
    *   Develop `pear.service.ts` for Pear API calls.
    *   Develop `salt.service.ts` for Salt SDK integration (account creation, `executeAction`).
    *   Develop `hyperliquid.service.ts` for price feeds and basic monitoring.
    *   Implement `xp.service.ts` for XP calculation and leveling.
    *   Implement `depositHandler` and associated functions (`calculateShareTokens`, `checkIfFirstDeposit`).

2.  **Frontend Setup & Core UI:**
    *   Initialize Next.js project, TypeScript, TailwindCSS.
    *   Configure `wagmi` and `viem` for HyperEVM wallet connections.
    *   Develop `WalletConnectButton.tsx`.
    *   Build `VaultCard.tsx` and the landing page (`index.tsx`).
    *   Create basic `XPProgressBar.tsx`.
    *   Implement `DepositModal.tsx`.
    *   Set up React Query for data fetching.

3.  **Agent Logic & Real-time:**
    *   Implement `agentMainLoop` and integrate with Pear/Salt services.
    *   Set up cron job for `agentMainLoop`.
    *   Integrate Redis for caching and Bull for queueing trade executions.
    *   Establish WebSocket server for live P&L, XP updates, and notifications.
    *   Develop `LivePnLChart.tsx` to consume WebSocket data.

4.  **Gamification & Polish:**
    *   Refine XP calculation logic, add time bonus, referral bonus.
    *   Implement level-up notifications.
    *   Build `dashboard.tsx` and `leaderboard.tsx`.
    *   Add pixel art badges and visual flair.

5.  **Security, Risk, & Edge Cases:**
    *   Implement rate limiting on backend API.
    *   Review Salt policies and conduct basic testing.
    *   Add comprehensive error handling and retry logic for API integrations.
    *   Address edge cases (partial fills, API downtime, insolvency, withdrawals).

6.  **Documentation & Demo Prep:**
    *   Flesh out `API_DOCS.md` and `SETUP_GUIDE.md`.
    *   Create `demo-script.md` and prepare pitch deck.

### 7.2. Testing Strategy

*   **Unit Tests (Jest/Vitest):**
    *   **Backend:** Test individual functions in services (e.g., `xp.service.ts` for XP calculations, `calculateDrawdown` utility, `calculateShareTokens`). Mock external API calls.
    *   **Frontend:** Test pure components (e.g., `VaultCard.tsx` rendering with various props), utility functions.
*   **Integration Tests (Supertest for API, Playwright/Cypress for E2E):**
    *   **Backend:** Test API routes end-to-end, including database interactions and mocked external API responses (Pear, Salt).
    *   **Agent Logic:** Simulate the `agentMainLoop` with mocked P&L data and verify risk limit enforcement, XP awards, and database updates.
    *   **Frontend-Backend:** Test user flows (connect wallet, deposit, view P&L) across the entire stack.
*   **Salt Policy Testing:**
    *   Deploy Salt policies to a testnet.
    *   Attempt trades that *should* violate policies (e.g., exceeding max leverage/drawdown) and verify they are blocked.
    *   Attempt valid trades and verify successful execution.
*   **Pear API Integration Testing:**
    *   Utilize Pear's testnet/staging environment.
    *   Execute pair and basket trades, verify position status and P&L updates.
    *   Test error handling (slippage, API downtime).

### 7.3. Deployment Guide

#### Frontend (Vercel)

1.  **Repository Setup:** Ensure the `frontend/` directory is a separate Next.js project within the main `narrative-vaults` monorepo.
2.  **Vercel Project Creation:**
    *   Link Vercel to your GitHub repository.
    *   Configure the root directory for the project as `frontend/`.
    *   Vercel will automatically detect Next.js.
3.  **Environment Variables:**
    *   Set `NEXT_PUBLIC_BACKEND_API_URL` to your deployed backend URL.
    *   Set `NEXT_PUBLIC_WEB3_PROJECT_ID` (for WalletConnect/Wagmi).
4.  **Build & Deploy:** Vercel will automatically build and deploy the application on every push to the main branch.

#### Backend (Railway / Render)

1.  **Repository Setup:** Ensure the `backend/` directory is a separate Node.js project.
2.  **Database (PostgreSQL):**
    *   Provision a PostgreSQL database instance (e.g., via Railway/Render's managed services or a separate provider like Supabase/Neon).
    *   Obtain the database connection string.
3.  **Redis:**
    *   Provision a Redis instance for caching and BullMQ (e.g., via Railway/Render's managed services or a separate provider).
    *   Obtain the Redis connection string.
4.  **Deployment Service (Railway/Render):**
    *   Connect Railway/Render to your GitHub repository.
    *   Configure the service to deploy the `backend/` directory.
    *   **Build Command:** `npm install && npm run build` (assuming `tsconfig.json` and `build` script are configured).
    *   **Start Command:** `npm start` (or `node dist/src/main.js` if building to `dist`).
5.  **Environment Variables:**
    *   `DATABASE_URL` (PostgreSQL connection string).
    *   `REDIS_URL` (Redis connection string).
    *   `PEAR_API_BASE_URL`, `PEAR_CLIENT_ID_START`, `PEAR_CLIENT_ID_END`.
    *   `SALT_SDK_RPC_URL`, `BACKEND_WALLET_PRIVATE_KEY` (Hyperliquid API wallet).
    *   `HYPEREVM_RPC_URL`.
    *   `ADMIN_ADDRESS` (for emergency pause).
    *   `WEBSOCKET_PORT` (if separate from HTTP).
6.  **Cron Job (for Agent Loop):**
    *   Configure a cron job within Railway/Render (or a separate service like `cron-job.org`) to hit a protected backend endpoint (`/api/agent/run-loop`) every 30 seconds, triggering `agentMainLoop`. Ensure this endpoint is secured (e.g., with an API key).

---

This architecture document provides a comprehensive overview of the Narrative Vaults project, detailing its components, data flows, integrations, and deployment strategy.
