# Narrative Vaults - Backend API Specification

This document details the RESTful API endpoints exposed by the Narrative Vaults backend. These APIs facilitate user interaction, data retrieval, and system administration.

## 1. Authentication

All authenticated endpoints will require a wallet signature or a session token derived from a wallet connection. The specific mechanism (e.g., JWT after signature verification) will be implemented during the development phase.

## 2. General Endpoints

### 2.1. `GET /api/narratives`

Retrieves a list of all available market narratives, including their configuration details.

*   **Description:** Returns static narrative definitions.
*   **Authentication:** None
*   **Response:** `200 OK`
    ```json
    [
      {
        "id": "sol_vs_eth",
        "name": "SOL Ecosystem vs ETH Ecosystem",
        "description": "Long SOL, JUP, PYTH vs Short ETH, LINK, UNI",
        "long_basket": ["SOL", "JUP", "PYTH"],
        "short_basket": ["ETH", "LINK", "UNI"],
        "min_level": 1,
        "base_leverage": 2,
        "max_drawdown": "15%",
        "risk_tier": "beginner"
      },
      // ... other narrative objects
    ]
    ```

### 2.2. `GET /api/user/:walletAddress`

Retrieves the profile information for a specific user.

*   **Description:** Get user's XP, level, referral code, etc.
*   **Authentication:** Required (user must own walletAddress or be an admin)
*   **Parameters:**
    *   `walletAddress`: (Path Parameter, string) The wallet address of the user.
*   **Response:** `200 OK`
    ```json
    {
      "id": "uuid-user-id",
      "wallet_address": "0x...",
      "total_xp": 1250,
      "current_level": 2,
      "referral_code": "XYZABC",
      "referred_by": "uuid-referrer-id" | null,
      "created_at": "2026-01-15T10:00:00Z"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: User with `walletAddress` not found.
    *   `401 Unauthorized`: Not authenticated or not authorized to view this user's data.

### 2.3. `GET /api/leaderboard`

Retrieves the global leaderboard for users and vaults.

*   **Description:** Returns top users by XP and top vaults by return.
*   **Authentication:** None
*   **Parameters:**
    *   `type`: (Query Parameter, string, optional) `users` or `vaults`. Defaults to `users`.
    *   `limit`: (Query Parameter, number, optional) Number of results to return. Defaults to `10`.
*   **Response:** `200 OK`
    ```json
    {
      "users": [
        { "wallet_address": "0xabc...", "total_xp": 5000, "current_level": 3 },
        // ...
      ],
      "vaults": [
        { "id": "uuid-vault-id", "narrative_id": "ai_vs_memes", "current_pnl": 150.23, "total_deposits": 10000 },
        // ...
      ]
    }
    ```

## 3. Vault Endpoints

### 3.1. `GET /api/vaults`

Retrieves a list of all active vaults.

*   **Description:** Returns a summary of all active narrative vaults.
*   **Authentication:** None
*   **Response:** `200 OK`
    ```json
    [
      {
        "id": "uuid-vault-id",
        "narrative_id": "sol_vs_eth",
        "salt_account_address": "0x...",
        "total_deposits": 15000.50,
        "current_pnl": 250.75,
        "status": "active",
        "created_at": "2026-01-15T11:00:00Z"
      },
      // ...
    ]
    ```

### 3.2. `GET /api/vaults/:vaultId`

Retrieves detailed information for a specific vault.

*   **Description:** Get all details for a single vault, including associated narrative.
*   **Authentication:** None
*   **Parameters:**
    *   `vaultId`: (Path Parameter, string) The UUID of the vault.
*   **Response:** `200 OK`
    ```json
    {
      "id": "uuid-vault-id",
      "narrative_id": "sol_vs_eth",
      "salt_account_address": "0x...",
      "total_deposits": 15000.50,
      "current_pnl": 250.75,
      "active_position_id": "pear-trade-id-xyz",
      "status": "active",
      "created_at": "2026-01-15T11:00:00Z",
      "narrative": { /* full narrative object */ },
      "positions": [ /* array of vault_positions for this vault */ ],
      "trades": [ /* array of trades for this vault */ ]
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Vault with `vaultId` not found.

### 3.3. `POST /api/vaults/:narrativeId/deposit`

Handles a user depositing USDC into a vault for a given narrative.

*   **Description:** Initiates a deposit into an existing or new vault. Triggers `handleUserDeposit`.
*   **Authentication:** Required
*   **Parameters:**
    *   `narrativeId`: (Path Parameter, string) The ID of the narrative.
*   **Request Body:**
    ```json
    {
      "depositAmount": 1000.00,
      "userWalletAddress": "0x..." // For signature verification
    }
    ```
*   **Response:** `202 Accepted`
    ```json
    {
      "message": "Deposit initiated successfully",
      "vaultId": "uuid-vault-id",
      "shareTokensMinted": 987.65 // Proportional share tokens received
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid deposit amount, insufficient user balance, user level too low.
    *   `401 Unauthorized`: Not authenticated.
    *   `429 Too Many Requests`: Rate limit exceeded.

### 3.4. `POST /api/vaults/:vaultId/withdraw`

Handles a user withdrawing funds from a vault.

*   **Description:** Redeems share tokens for proportional P&L.
*   **Authentication:** Required
*   **Parameters:**
    *   `vaultId`: (Path Parameter, string) The UUID of the vault.
*   **Request Body:**
    ```json
    {
      "shareTokensToBurn": 500.00,
      "userWalletAddress": "0x..." // For signature verification
    }
    ```
*   **Response:** `202 Accepted`
    ```json
    {
      "message": "Withdrawal initiated successfully",
      "usdcReceived": 510.50
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid share token amount, insufficient share tokens.
    *   `401 Unauthorized`: Not authenticated.

### 3.5. `GET /api/vaults/:vaultId/pnl-history`

Retrieves historical P&L data for a specific vault, suitable for charting.

*   **Description:** Returns time-series data of vault P&L.
*   **Authentication:** None
*   **Parameters:**
    *   `vaultId`: (Path Parameter, string) The UUID of the vault.
    *   `interval`: (Query Parameter, string, optional) `1h`, `4h`, `1d`. Defaults to `1d`.
    *   `limit`: (Query Parameter, number, optional) Number of data points. Defaults to `30`.
*   **Response:** `200 OK`
    ```json
    [
      { "timestamp": "2026-01-14T00:00:00Z", "pnl": 100.00 },
      { "timestamp": "2026-01-15T00:00:00Z", "pnl": 120.50 },
      // ...
    ]
    ```

## 4. Internal API Endpoints (Agent/Admin Only)

These endpoints are primarily for internal system use or restricted administrative access and should be heavily secured (e.g., API keys, IP whitelisting).

### 4.1. `POST /api/admin/emergency-pause`

Triggers the emergency pause function, halting deposits and potentially other operations.

*   **Description:** Activates the emergency pause contract or system-wide pause flag.
*   **Authentication:** Admin Key / IP Whitelist
*   **Request Body:**
    ```json
    {
      "reason": "Critical vulnerability detected"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "message": "Emergency pause initiated.",
      "status": "paused"
    }
    ```

### 4.2. `GET /api/agent/run-loop`

Endpoint to manually trigger or be called by a cron job for the backend agent's main loop.

*   **Description:** Kicks off a single execution of the `agentMainLoop` logic.
*   **Authentication:** Internal API Key / IP Whitelist (highly secured)
*   **Response:** `200 OK`
    ```json
    {
      "message": "Agent loop executed successfully.",
      "vaults_processed": 5,
      "risk_events_logged": 0
    }
    ```

## 5. WebSocket Endpoints

### 5.1. `WS /ws/vault/:vaultId`

Provides real-time updates for a specific vault's P&L and other metrics.

*   **Description:** Establishes a WebSocket connection to stream live data.
*   **Authentication:** Optional (read-only access without auth, full access with auth).
*   **Messages Sent (Backend to Frontend):**
    *   **Live P&L Update:**
        ```json
        {
          "type": "PNL_UPDATE",
          "vaultId": "uuid-vault-id",
          "currentPnL": 255.30,
          "timestamp": "2026-01-16T17:00:00Z"
        }
        ```
    *   **XP Earned Notification:**
        ```json
        {
          "type": "XP_EARNED",
          "userId": "uuid-user-id",
          "vaultId": "uuid-vault-id",
          "xpAmount": 100,
          "totalXp": 1350,
          "message": "+100 XP for 1% vault profit!"
        }
        ```
    *   **Level Up Notification:**
        ```json
        {
          "type": "LEVEL_UP",
          "userId": "uuid-user-id",
          "oldLevel": 2,
          "newLevel": 3,
          "message": "Congratulations! You reached Level 3!"
        }
        ```
    *   **System Notifications (e.g., API downtime, emergency pause):**
        ```json
        {
          "type": "SYSTEM_ALERT",
          "severity": "high",
          "message": "Pear Protocol API experiencing delays. Trades queued."
        }
        ```
