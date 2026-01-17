import { PrismaClient } from '@prisma/client';
import { Vault } from '../types';
import { broadcastMessage } from './websocket.service';

const prisma = new PrismaClient();

// XP & Leveling Thresholds - minimum XP required for each level
const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,       // Level 1: 0-500 XP
  2: 501,     // Level 2: 501-2000 XP
  3: 2001,    // Level 3: 2001-5000 XP
  4: 5001,    // Level 4: 5001-10000 XP
  5: 10001,   // Level 5: 10001+ XP
};

const MAX_LEVEL = 5;

// XP Formulas
const BASE_XP_PER_PERCENT_PROFIT = 100; // 100 XP per 1% vault profit
const TIME_BONUS_XP_PER_DAY = 10;     // 10 XP per day position held
const FIRST_DEPOSITOR_BONUS_XP = 50;
const REFERRAL_BONUS_XP = 25;

export async function calculateAndAwardXP(vault: Vault, position: any) {
  // `position` here is from Pear API, needs to be more structured later
  const vaultParticipants = await prisma.vaultPosition.findMany({ where: { vault_id: vault.id } });

  for (const participant of vaultParticipants) {
    const user = await prisma.user.findUnique({ where: { id: participant.user_id } });
    if (!user) continue;

    let xpEarned = 0;
    const eventDescription: string[] = [];

    // Base XP: 100 XP per 1% vault profit generated
    if (position.unrealizedPnL > 0 && vault.total_deposits > 0) {
      const profitPercentage = (position.unrealizedPnL / vault.total_deposits) * 100;
      const profitXp = Math.floor(profitPercentage * BASE_XP_PER_PERCENT_PROFIT);
      xpEarned += profitXp;
      eventDescription.push(`+${profitXp} XP for vault profit.`);
    }

    // Time Bonus: 10 XP per day position held (encourages conviction)
    const daysHeld = Math.floor((Date.now() - new Date(participant.deposited_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysHeld > 0) {
      const timeXp = daysHeld * TIME_BONUS_XP_PER_DAY;
      xpEarned += timeXp;
      eventDescription.push(`+${timeXp} XP for holding position for ${daysHeld} days.`);
    }

    if (xpEarned > 0) {
      await awardXP(user.id, vault.id, xpEarned, 'vault_performance', eventDescription.join(' '));
    }
  }
}

export async function awardXP(userId: string, vaultId: string | null, xpAmount: number, eventType: string, description: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newTotalXp = user.total_xp + xpAmount;
  let newLevel = user.current_level;

  // Calculate new level based on XP thresholds
  // Find the highest level the user qualifies for
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (newTotalXp >= LEVEL_THRESHOLDS[level]) {
      newLevel = level;
      break;
    }
  }
  // If user passed a level threshold, update their level
  if (newLevel > user.current_level) {
    await prisma.user.update({
      where: { id: userId },
      data: { total_xp: newTotalXp, current_level: newLevel },
    });
    console.log(`User ${user.wallet_address} leveled up to ${newLevel}!`);
    broadcastMessage(user.wallet_address, {
      type: 'LEVEL_UP',
      userId: user.id,
      oldLevel: user.current_level,
      newLevel: newLevel,
      message: `Congratulations! You reached Level ${newLevel}! `,
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { total_xp: newTotalXp },
    });
  }

  // Log XP event
  await prisma.xPEvent.create({
    data: {
      user_id: userId,
      vault_id: vaultId,
      xp_earned: xpAmount,
      event_type: eventType,
      description: description,
    },
  });

  // Broadcast XP update to user
  broadcastMessage(user.wallet_address, {
    type: 'XP_EARNED',
    userId: user.id,
    vaultId: vaultId,
    xpAmount: xpAmount,
    totalXp: newTotalXp,
    message: description,
  });
}

export async function checkIfFirstDeposit(vaultId: string): Promise<boolean> {
  const depositCount = await prisma.vaultPosition.count({
    where: { vault_id: vaultId },
  });
  return depositCount === 1;
}

/**
 * Calculate level from XP amount
 */
export function calculateLevelFromXP(xp: number): number {
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (xp >= LEVEL_THRESHOLDS[level]) {
      return level;
    }
  }
  return 1;
}

/**
 * Get XP needed for next level
 */
export function getXPForNextLevel(currentXP: number): { nextLevel: number; xpNeeded: number } | null {
  const currentLevel = calculateLevelFromXP(currentXP);
  if (currentLevel >= MAX_LEVEL) {
    return null; // Already at max level
  }
  const nextLevel = currentLevel + 1;
  const xpNeeded = LEVEL_THRESHOLDS[nextLevel] - currentXP;
  return { nextLevel, xpNeeded };
}

/**
 * Get user's XP stats
 */
export async function getUserXPStats(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const nextLevelInfo = getXPForNextLevel(user.total_xp);
  const currentLevelThreshold = LEVEL_THRESHOLDS[user.current_level];
  const nextLevelThreshold = nextLevelInfo ? LEVEL_THRESHOLDS[nextLevelInfo.nextLevel] : null;

  return {
    totalXP: user.total_xp,
    currentLevel: user.current_level,
    xpInCurrentLevel: user.total_xp - currentLevelThreshold,
    xpForNextLevel: nextLevelInfo?.xpNeeded ?? 0,
    nextLevel: nextLevelInfo?.nextLevel ?? null,
    progressToNextLevel: nextLevelThreshold
      ? ((user.total_xp - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100
      : 100, // 100% if at max level
    isMaxLevel: user.current_level >= MAX_LEVEL
  };
}

export const getLevelThresholds = () => LEVEL_THRESHOLDS;
export { FIRST_DEPOSITOR_BONUS_XP, REFERRAL_BONUS_XP, MAX_LEVEL };
