import { PrismaClient } from '@prisma/client';
import { getPosition } from './pear.service';
import { getSaltAccountBalance } from './salt.service';
import { broadcastMessage } from './websocket.service';
import { awardXP } from './xp.service';

const prisma = new PrismaClient();

// Withdrawal fee percentage (e.g., 0.5%)
const WITHDRAWAL_FEE_PERCENT = 0.005;

// Minimum withdrawal amount in USDC
const MIN_WITHDRAWAL_AMOUNT = 1;

// Interfaces
interface WithdrawalResult {
  success: boolean;
  usdcAmount: number;
  fee: number;
  netAmount: number;
  pnlRealized: number;
  txHash?: string;
  message: string;
}

interface WithdrawalPreview {
  shareTokens: number;
  sharePercentage: number;
  estimatedUsdcAmount: number;
  estimatedFee: number;
  estimatedNetAmount: number;
  estimatedPnL: number;
  currentVaultValue: number;
  pricePerShare: number;
}

/**
 * Preview a withdrawal without executing it
 */
export async function previewWithdrawal(
  userId: string,
  vaultId: string,
  shareTokensToBurn: number
): Promise<WithdrawalPreview | null> {
  try {
    // Get user's position in the vault
    const position = await prisma.vaultPosition.findFirst({
      where: {
        user_id: userId,
        vault_id: vaultId,
        withdrawn_at: null
      }
    });

    if (!position) {
      console.warn(`No active position found for user ${userId} in vault ${vaultId}`);
      return null;
    }

    // Validate share tokens
    const userShareTokens = Number(position.share_tokens);
    if (shareTokensToBurn > userShareTokens) {
      console.warn(`User attempting to withdraw more shares than owned: ${shareTokensToBurn} > ${userShareTokens}`);
      return null;
    }

    // Get vault info
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      return null;
    }

    // Calculate current vault value
    const totalDeposits = Number(vault.total_deposits);
    const currentPnL = Number(vault.current_pnl);
    const currentVaultValue = totalDeposits + currentPnL;

    // Calculate total share tokens in circulation
    const totalShares = await getTotalShareTokens(vaultId);

    if (totalShares <= 0) {
      return null;
    }

    // Calculate share percentage and value
    const sharePercentage = shareTokensToBurn / totalShares;
    const pricePerShare = currentVaultValue / totalShares;
    const estimatedUsdcAmount = shareTokensToBurn * pricePerShare;

    // Calculate fee
    const estimatedFee = estimatedUsdcAmount * WITHDRAWAL_FEE_PERCENT;
    const estimatedNetAmount = estimatedUsdcAmount - estimatedFee;

    // Calculate P&L for this position
    const entryValue = (Number(position.deposit_amount) / userShareTokens) * shareTokensToBurn;
    const estimatedPnL = estimatedUsdcAmount - entryValue;

    return {
      shareTokens: shareTokensToBurn,
      sharePercentage: sharePercentage * 100,
      estimatedUsdcAmount,
      estimatedFee,
      estimatedNetAmount,
      estimatedPnL,
      currentVaultValue,
      pricePerShare
    };
  } catch (error) {
    console.error('Error previewing withdrawal:', error);
    return null;
  }
}

/**
 * Execute a full withdrawal from a vault
 */
export async function executeWithdrawal(
  userId: string,
  vaultId: string,
  shareTokensToBurn: number
): Promise<WithdrawalResult> {
  try {
    // Get user's position
    const position = await prisma.vaultPosition.findFirst({
      where: {
        user_id: userId,
        vault_id: vaultId,
        withdrawn_at: null
      }
    });

    if (!position) {
      return {
        success: false,
        usdcAmount: 0,
        fee: 0,
        netAmount: 0,
        pnlRealized: 0,
        message: 'No active position found for this user in the vault'
      };
    }

    // Validate share tokens
    const userShareTokens = Number(position.share_tokens);
    if (shareTokensToBurn > userShareTokens) {
      return {
        success: false,
        usdcAmount: 0,
        fee: 0,
        netAmount: 0,
        pnlRealized: 0,
        message: `Insufficient share tokens. You have ${userShareTokens}, trying to burn ${shareTokensToBurn}`
      };
    }

    // Get vault with current state
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      return {
        success: false,
        usdcAmount: 0,
        fee: 0,
        netAmount: 0,
        pnlRealized: 0,
        message: 'Vault not found'
      };
    }

    // Check vault status
    if (vault.status === 'liquidated') {
      return await handleLiquidatedVaultWithdrawal(userId, position, vault);
    }

    if (vault.status === 'paused') {
      return {
        success: false,
        usdcAmount: 0,
        fee: 0,
        netAmount: 0,
        pnlRealized: 0,
        message: 'Vault is paused. Withdrawals are temporarily disabled.'
      };
    }

    // Get current position value from Pear API if there's an active trade
    let currentVaultValue = Number(vault.total_deposits) + Number(vault.current_pnl);

    if (vault.active_position_id) {
      const pearPosition = await getPosition(vault.active_position_id);
      if (pearPosition) {
        currentVaultValue = pearPosition.currentValue;
      }
    }

    // Calculate total shares and user's portion
    const totalShares = await getTotalShareTokens(vaultId);
    const sharePercentage = shareTokensToBurn / totalShares;
    const pricePerShare = currentVaultValue / totalShares;

    // Calculate withdrawal amount
    const grossAmount = shareTokensToBurn * pricePerShare;

    // Validate minimum withdrawal
    if (grossAmount < MIN_WITHDRAWAL_AMOUNT) {
      return {
        success: false,
        usdcAmount: 0,
        fee: 0,
        netAmount: 0,
        pnlRealized: 0,
        message: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} USDC`
      };
    }

    // Calculate fee and net amount
    const fee = grossAmount * WITHDRAWAL_FEE_PERCENT;
    const netAmount = grossAmount - fee;

    // Calculate realized P&L
    const entryPricePerShare = Number(position.deposit_amount) / userShareTokens;
    const entryValue = entryPricePerShare * shareTokensToBurn;
    const pnlRealized = grossAmount - entryValue;

    // Execute the withdrawal in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine if this is a full or partial withdrawal
      const isFullWithdrawal = shareTokensToBurn >= userShareTokens - 0.000001; // Account for floating point

      if (isFullWithdrawal) {
        // Full withdrawal - mark position as withdrawn
        await tx.vaultPosition.update({
          where: { id: position.id },
          data: {
            withdrawn_at: new Date(),
            share_tokens: 0
          }
        });
      } else {
        // Partial withdrawal - reduce share tokens
        const remainingShares = userShareTokens - shareTokensToBurn;
        const remainingDeposit = entryPricePerShare * remainingShares;

        await tx.vaultPosition.update({
          where: { id: position.id },
          data: {
            share_tokens: remainingShares,
            deposit_amount: remainingDeposit
          }
        });
      }

      // Update vault totals
      const withdrawnDepositPortion = entryValue;
      await tx.vault.update({
        where: { id: vaultId },
        data: {
          total_deposits: {
            decrement: withdrawnDepositPortion
          }
        }
      });

      // Record the withdrawal as a trade event (for history)
      await tx.trade.create({
        data: {
          vault_id: vaultId,
          pear_trade_id: `withdrawal-${Date.now()}-${userId.slice(0, 8)}`,
          narrative_id: vault.narrative_id,
          long_tokens: [],
          short_tokens: [],
          leverage: 1,
          entry_value: entryValue,
          current_value: grossAmount,
          realized_pnl: pnlRealized,
          status: 'closed',
          closed_at: new Date()
        }
      });

      return { success: true };
    });

    if (!result.success) {
      return {
        success: false,
        usdcAmount: 0,
        fee: 0,
        netAmount: 0,
        pnlRealized: 0,
        message: 'Database transaction failed'
      };
    }

    // Award XP for profitable trades
    if (pnlRealized > 0) {
      const profitPercent = (pnlRealized / entryValue) * 100;
      const xpAmount = Math.floor(profitPercent * 10); // 10 XP per 1% profit
      if (xpAmount > 0) {
        await awardXP(
          userId,
          vaultId,
          xpAmount,
          'withdrawal_profit',
          `Earned ${xpAmount} XP for ${profitPercent.toFixed(2)}% profit on withdrawal`
        );
      }
    }

    // Broadcast the withdrawal event
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      broadcastMessage(user.wallet_address, {
        type: 'WITHDRAWAL_COMPLETE',
        vaultId,
        grossAmount,
        fee,
        netAmount,
        pnlRealized,
        timestamp: new Date().toISOString()
      });
    }

    // Generate a simulated tx hash (in production, this would be the actual blockchain tx)
    const txHash = `0x${Buffer.from(`withdrawal-${Date.now()}`).toString('hex').slice(0, 64)}`;

    console.log(`[Withdrawal] User ${userId} withdrew ${shareTokensToBurn} shares from vault ${vaultId}. Net: ${netAmount} USDC, PnL: ${pnlRealized}`);

    return {
      success: true,
      usdcAmount: grossAmount,
      fee,
      netAmount,
      pnlRealized,
      txHash,
      message: 'Withdrawal successful'
    };

  } catch (error) {
    console.error('Error executing withdrawal:', error);
    return {
      success: false,
      usdcAmount: 0,
      fee: 0,
      netAmount: 0,
      pnlRealized: 0,
      message: `Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle withdrawal from a liquidated vault (special case)
 */
async function handleLiquidatedVaultWithdrawal(
  userId: string,
  position: any,
  vault: any
): Promise<WithdrawalResult> {
  // For liquidated vaults, users get their proportional share of remaining value
  const userShares = Number(position.share_tokens);
  const totalShares = await getTotalShareTokens(vault.id);

  // Remaining value after liquidation (usually reduced due to drawdown)
  const remainingValue = Number(vault.total_deposits) + Number(vault.current_pnl);
  const sharePercentage = userShares / totalShares;
  const userValue = remainingValue * sharePercentage;

  // No fee on liquidated vault withdrawals
  const entryValue = Number(position.deposit_amount);
  const pnlRealized = userValue - entryValue;

  // Execute withdrawal
  await prisma.vaultPosition.update({
    where: { id: position.id },
    data: {
      withdrawn_at: new Date(),
      share_tokens: 0
    }
  });

  return {
    success: true,
    usdcAmount: userValue,
    fee: 0,
    netAmount: userValue,
    pnlRealized,
    message: `Withdrawal from liquidated vault. Recovered ${((userValue / entryValue) * 100).toFixed(2)}% of deposit.`
  };
}

/**
 * Get total share tokens in circulation for a vault
 */
async function getTotalShareTokens(vaultId: string): Promise<number> {
  const result = await prisma.vaultPosition.aggregate({
    where: {
      vault_id: vaultId,
      withdrawn_at: null
    },
    _sum: {
      share_tokens: true
    }
  });

  return Number(result._sum.share_tokens || 0);
}

/**
 * Get user's position in a vault
 */
export async function getUserVaultPosition(userId: string, vaultId: string): Promise<{
  shareTokens: number;
  depositAmount: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  depositedAt: Date;
} | null> {
  const position = await prisma.vaultPosition.findFirst({
    where: {
      user_id: userId,
      vault_id: vaultId,
      withdrawn_at: null
    }
  });

  if (!position) {
    return null;
  }

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId }
  });

  if (!vault) {
    return null;
  }

  const totalShares = await getTotalShareTokens(vaultId);
  const currentVaultValue = Number(vault.total_deposits) + Number(vault.current_pnl);
  const pricePerShare = totalShares > 0 ? currentVaultValue / totalShares : 1;

  const userShares = Number(position.share_tokens);
  const depositAmount = Number(position.deposit_amount);
  const currentValue = userShares * pricePerShare;
  const pnl = currentValue - depositAmount;
  const pnlPercent = depositAmount > 0 ? (pnl / depositAmount) * 100 : 0;

  return {
    shareTokens: userShares,
    depositAmount,
    currentValue,
    pnl,
    pnlPercent,
    depositedAt: position.deposited_at
  };
}

/**
 * Check if user can withdraw (has active position)
 */
export async function canUserWithdraw(userId: string, vaultId: string): Promise<{
  canWithdraw: boolean;
  reason?: string;
  maxShareTokens?: number;
}> {
  const position = await prisma.vaultPosition.findFirst({
    where: {
      user_id: userId,
      vault_id: vaultId,
      withdrawn_at: null
    }
  });

  if (!position) {
    return {
      canWithdraw: false,
      reason: 'No active position in this vault'
    };
  }

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId }
  });

  if (!vault) {
    return {
      canWithdraw: false,
      reason: 'Vault not found'
    };
  }

  if (vault.status === 'paused') {
    return {
      canWithdraw: false,
      reason: 'Vault is currently paused'
    };
  }

  return {
    canWithdraw: true,
    maxShareTokens: Number(position.share_tokens)
  };
}

/**
 * Get withdrawal history for a user
 */
export async function getWithdrawalHistory(userId: string, limit: number = 20): Promise<any[]> {
  const withdrawnPositions = await prisma.vaultPosition.findMany({
    where: {
      user_id: userId,
      withdrawn_at: { not: null }
    },
    include: {
      vault: true
    },
    orderBy: {
      withdrawn_at: 'desc'
    },
    take: limit
  });

  return withdrawnPositions.map(pos => ({
    vaultId: pos.vault_id,
    narrativeId: pos.vault.narrative_id,
    depositAmount: Number(pos.deposit_amount),
    withdrawnAt: pos.withdrawn_at,
    entryPnl: Number(pos.entry_pnl)
  }));
}
