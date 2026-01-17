import { PrismaClient } from '@prisma/client';
import { getPosition, closePosition } from '../services/pear.service';
import { calculateAndAwardXP } from '../services/xp.service';
import { broadcastMessage } from '../services/websocket.service';
import { updateVaultRiskState } from '../services/salt.service';
import { NARRATIVES } from '../config/narratives';
import { Narrative } from '../types';

const prisma = new PrismaClient();

const calculateDrawdown = (initialValue: number, currentValue: number): number => {
  if (initialValue <= 0) return 0;
  const drawdown = ((initialValue - currentValue) / initialValue) * 100;
  return Math.max(0, drawdown);
};

export async function agentMainLoop() {
  console.log('[Agent] Loop started...');
  try {
    const activeVaults = await prisma.vault.findMany({ where: { status: 'active' } });
    console.log(`[Agent] Processing ${activeVaults.length} active vaults`);

    for (const vault of activeVaults) {
      if (!vault.active_position_id) {
        console.log(`[Agent] Vault ${vault.id} has no active position. Skipping.`);
        continue;
      }

      // 1. Check current position P&L via Pear API
      const position = await getPosition(vault.active_position_id);
      if (!position) {
        console.error(`[Agent] Could not retrieve position for tradeId: ${vault.active_position_id}`);
        continue;
      }

      // 2. Calculate drawdown from vault inception
      const totalDeposits = Number(vault.total_deposits);
      const drawdown = calculateDrawdown(totalDeposits, position.currentValue);

      // 3. Get narrative config for risk limits
      const narrative = NARRATIVES.find(n => n.id === vault.narrative_id);
      if (!narrative) {
        console.error(`[Agent] Narrative ${vault.narrative_id} not found.`);
        continue;
      }

      const maxDrawdown = parseFloat(narrative.max_drawdown);

      // 4. Update Salt risk state for this vault
      if (vault.salt_account_address) {
        updateVaultRiskState(
          vault.salt_account_address,
          totalDeposits,
          position.currentValue,
          maxDrawdown
        );
      }

      // 5. Check if risk limits breached
      if (drawdown > maxDrawdown) {
        console.log(`[Agent] Vault ${vault.id} exceeded drawdown limit (${drawdown.toFixed(2)}% > ${maxDrawdown}%)`);

        // 6. Close position via Pear API
        try {
          await closePosition(vault.active_position_id);
          console.log(`[Agent] Position ${vault.active_position_id} closed successfully`);
        } catch (closeError) {
          console.error(`[Agent] Failed to close position:`, closeError);
        }

        // 7. Log risk event
        await prisma.riskEvent.create({
          data: {
            vault_id: vault.id,
            event_type: 'auto_liquidation',
            current_drawdown: parseFloat(drawdown.toFixed(2)),
            max_allowed_drawdown: maxDrawdown,
            action_taken: 'closed_all_positions',
          },
        });

        // 8. Update vault status
        await prisma.vault.update({
          where: { id: vault.id },
          data: {
            status: 'liquidated',
            current_pnl: position.unrealizedPnL,
            active_position_id: null
          },
        });

        // 9. Broadcast liquidation alert
        broadcastMessage(vault.id, {
          type: 'SYSTEM_ALERT',
          severity: 'high',
          vaultId: vault.id,
          message: `Vault ${narrative.name} liquidated due to drawdown limit breach (${drawdown.toFixed(2)}%).`,
          timestamp: new Date().toISOString()
        });

      } else {
        // 10. Update vault P&L in database
        await prisma.vault.update({
          where: { id: vault.id },
          data: { current_pnl: position.unrealizedPnL },
        });

        // 11. Broadcast P&L update
        broadcastMessage(vault.id, {
          type: 'PNL_UPDATE',
          vaultId: vault.id,
          currentPnL: position.unrealizedPnL,
          currentValue: position.currentValue,
          drawdown: drawdown,
          timestamp: new Date().toISOString(),
        });

        // 12. Warn if approaching drawdown limit (80% threshold)
        if (drawdown > maxDrawdown * 0.8) {
          console.warn(`[Agent] Vault ${vault.id} approaching drawdown limit: ${drawdown.toFixed(2)}%`);
          broadcastMessage(vault.id, {
            type: 'SYSTEM_ALERT',
            severity: 'medium',
            vaultId: vault.id,
            message: `Warning: Vault approaching drawdown limit (${drawdown.toFixed(2)}% / ${maxDrawdown}%)`,
            timestamp: new Date().toISOString()
          });
        }
      }

      // 13. Calculate and award XP to vault participants
      const vaultForXP = {
        ...vault,
        total_deposits: totalDeposits,
        current_pnl: Number(vault.current_pnl)
      };
      await calculateAndAwardXP(vaultForXP, position);
    }
  } catch (error) {
    console.error('[Agent] Error in agentMainLoop:', error);
  }
  console.log('[Agent] Loop finished.');
}

export function startAgentLoop(intervalMs: number = 30000) {
  console.log(`[Agent] Starting agent loop with ${intervalMs}ms interval`);
  // Run immediately
  agentMainLoop();
  // Then run at interval
  return setInterval(agentMainLoop, intervalMs);
}

export function getNarratives(): Narrative[] {
  return NARRATIVES;
}
