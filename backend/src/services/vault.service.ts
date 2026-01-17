import { PrismaClient } from '@prisma/client';
import { Vault } from '../types';

const prisma = new PrismaClient();

export function calculateShareTokens(vault: Vault, depositAmount: number): number {
  // In a real system, share token calculation would be more complex,
  // taking into account the current value of the vault's assets (P&L).
  // For simplicity, during the hackathon, we can assume 1 USDC = 1 share token initially
  // or a simple ratio based on total_deposits.

  if (vault.total_deposits === 0) {
    // First deposit into a new vault
    return depositAmount;
  } else {
    // Calculate shares based on current vault value (total_deposits + current_pnl)
    const currentVaultValue = vault.total_deposits + vault.current_pnl;
    if (currentVaultValue <= 0) {
        // Handle edge case where vault is in significant drawdown or insolvent
        // Could mean 1 USDC still buys 1 share, or a penalty is applied.
        // For now, return depositAmount as shares, but this needs careful consideration.
        console.warn(`Vault ${vault.id} has non-positive current value (${currentVaultValue}). Share token calculation might be imprecise.`);
        return depositAmount; 
    }
    const sharePrice = currentVaultValue / (vault.total_deposits || 1); // Avoid division by zero
    return depositAmount / sharePrice;
  }
}
