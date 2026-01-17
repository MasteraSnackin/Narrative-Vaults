import { PrismaClient } from '@prisma/client';
import { Vault } from '../types';
import { createVaultAccount, transferToSaltAccount, executeTradeViaSalt } from './salt.service';
import { prepareTradeData, getTradeIdFromTxHash } from './pear.service';
import { calculateShareTokens } from './vault.service';
import { awardXP, checkIfFirstDeposit } from './xp.service';
import { getNarrativeById } from '../config/narratives';

const prisma = new PrismaClient();

export async function handleUserDeposit(userId: string, narrativeId: string, depositAmount: number): Promise<{ vaultId: string; shareTokens: number }> {
  // 1. Check if vault exists for this narrative
  let vault = await prisma.vault.findFirst({
    where: { narrative_id: narrativeId, status: 'active' },
  });

  // 2. If no vault, create new one with Salt
  if (!vault) {
    const narrative = getNarrativeById(narrativeId);
    if (!narrative) {
      throw new Error(`Narrative ${narrativeId} not found.`);
    }
    const saltAccountAddress = await createVaultAccount(narrative);

    vault = await prisma.vault.create({
      data: {
        narrative_id: narrativeId,
        salt_account_address: saltAccountAddress,
        total_deposits: 0, // Will be updated after transfer
        // Default status and other fields
      },
    });
  }

  // 3. Transfer user's USDC to vault Salt account (simulated/actual)
  // In a real scenario, this would involve a transaction from the user's wallet to the Salt account.
  // For hackathon, we can simulate this or assume it's handled client-side/via a separate contract.
  const transferTxHash = await transferToSaltAccount(vault.salt_account_address!, depositAmount);
  console.log(`USDC transfer to Salt account initiated. Tx Hash: ${transferTxHash}`);

  // Convert Prisma Decimal to number for type compatibility
  const vaultForCalc: Vault = {
    ...vault,
    total_deposits: Number(vault.total_deposits),
    current_pnl: Number(vault.current_pnl)
  };

  // 4. Calculate share tokens (proportional to current vault value)
  const shareTokens = calculateShareTokens(vaultForCalc, depositAmount);

  // 5. Record user's position
  await prisma.vaultPosition.create({
    data: {
      user_id: userId,
      vault_id: vault.id,
      deposit_amount: depositAmount,
      share_tokens: shareTokens,
    },
  });

  // 6. Update vault total deposits
  await prisma.vault.update({
    where: { id: vault.id },
    data: { total_deposits: Number(vault.total_deposits) + depositAmount },
  });

  // 7. Execute trade via Pear if vault just created or needs rebalance
  // For simplicity, always execute trade on initial deposit for a new vault, or if no active position.
  const totalDepositsNum = Number(vault.total_deposits);
  if (!vault.active_position_id || totalDepositsNum === 0) { // Simplified condition for rebalance
    const narrative = getNarrativeById(narrativeId);
    if (!narrative) {
      throw new Error(`Narrative ${narrativeId} not found for trade execution.`);
    }
    const pearTradeData = prepareTradeData(vaultForCalc, narrative);
    const saltTxHash = await executeTradeViaSalt(vault.salt_account_address!, JSON.stringify(pearTradeData)); // Pear trade data needs to be encoded properly
    
    // Assuming getTradeIdFromTxHash can parse the Salt transaction to get the Pear trade ID
    const tradeId = await getTradeIdFromTxHash(saltTxHash); 
    
    await prisma.vault.update({
      where: { id: vault.id },
      data: { active_position_id: tradeId },
    });
  }

  // 8. Award first depositor bonus XP
  const isFirstDeposit = await checkIfFirstDeposit(vault.id);
  if (isFirstDeposit) {
    await awardXP(userId, vault.id, 50, 'first_depositor_bonus', 'First depositor bonus');
  }

  return { vaultId: vault.id, shareTokens };
}
