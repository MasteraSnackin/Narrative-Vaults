import { Express, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { handleUserDeposit } from '../services/deposit.service';
import { authenticateUser } from '../middleware/auth';
import {
  executeWithdrawal,
  previewWithdrawal,
  getUserVaultPosition,
  canUserWithdraw,
  getWithdrawalHistory
} from '../services/withdrawal.service';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStats,
  followVault,
  unfollowVault,
  getFollowedVaults,
  getVaultFollowers,
  isFollowingVault,
  startCopyTrading,
  stopCopyTrading,
  getCopyTradeSettings,
  getMyCopyTrades,
  getMyCopiers,
  getUserProfile,
  updateUserProfile,
  getTopTraders,
} from '../services/social.service';
import { agentMainLoop } from '../agent/agentMainLoop';
import { NARRATIVES } from '../config/narratives';
import marketRoutes from './routes/market.routes';

const prisma = new PrismaClient();

// Extend Express Request type for user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    wallet_address: string;
    current_level: number;
  };
}

export function setupRoutes(app: Express) {
  // Market Data Routes
  app.use('/api/market', marketRoutes);

  // General Endpoints
  app.get('/api/narratives', (_req: Request, res: Response) => {
    res.json(NARRATIVES);
  });

  app.get('/api/user/:walletAddress', authenticateUser, async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const user = await prisma.user.findUnique({ where: { wallet_address: walletAddress } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  });

  app.get('/api/leaderboard', async (req: Request, res: Response) => {
    const type = req.query.type || 'users';
    const limit = parseInt(req.query.limit as string) || 10;

    if (type === 'users') {
      const users = await prisma.user.findMany({
        orderBy: { total_xp: 'desc' },
        take: limit,
        select: { wallet_address: true, total_xp: true, current_level: true },
      });
      res.json({ users });
    } else if (type === 'vaults') {
      const vaults = await prisma.vault.findMany({
        orderBy: { current_pnl: 'desc' },
        take: limit,
        select: { id: true, narrative_id: true, current_pnl: true, total_deposits: true },
      });
      res.json({ vaults });
    } else {
      res.status(400).json({ message: 'Invalid leaderboard type.' });
    }
  });

  // Vault Endpoints
  app.get('/api/vaults', async (_req: Request, res: Response) => {
    const vaults = await prisma.vault.findMany({ where: { status: 'active' } });
    res.json(vaults);
  });

  app.get('/api/vaults/:vaultId', async (req: Request, res: Response) => {
    const { vaultId } = req.params;
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      include: { VaultPositions: true, Trades: true },
    });
    if (!vault) {
      return res.status(404).json({ message: 'Vault not found.' });
    }
    const narrative = NARRATIVES.find(n => n.id === vault.narrative_id);
    res.json({ ...vault, narrative });
  });

  app.post('/api/vaults/:narrativeId/deposit', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const { narrativeId } = req.params;
    const { depositAmount } = req.body;

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const { vaultId, shareTokens } = await handleUserDeposit(req.user.id, narrativeId, depositAmount);
      res.status(202).json({ message: 'Deposit initiated successfully', vaultId, shareTokensMinted: shareTokens });
    } catch (error: any) {
      console.error('Deposit error:', error);
      res.status(500).json({ message: error.message || 'Deposit failed.' });
    }
  });

  // Withdrawal endpoints
  app.post('/api/vaults/:vaultId/withdraw', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const { vaultId } = req.params;
    const { shareTokensToBurn } = req.body;

    if (!shareTokensToBurn || shareTokensToBurn <= 0) {
      return res.status(400).json({ message: 'Invalid share token amount.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      // Check if user can withdraw
      const canWithdrawResult = await canUserWithdraw(req.user.id, vaultId);
      if (!canWithdrawResult.canWithdraw) {
        return res.status(400).json({ message: canWithdrawResult.reason });
      }

      // Validate share token amount
      if (canWithdrawResult.maxShareTokens && shareTokensToBurn > canWithdrawResult.maxShareTokens) {
        return res.status(400).json({
          message: `Cannot withdraw more than your balance. Max: ${canWithdrawResult.maxShareTokens}`
        });
      }

      // Execute the withdrawal
      const result = await executeWithdrawal(req.user.id, vaultId, shareTokensToBurn);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.status(200).json({
        message: 'Withdrawal successful',
        grossAmount: result.usdcAmount,
        fee: result.fee,
        netAmount: result.netAmount,
        realizedPnL: result.pnlRealized,
        txHash: result.txHash
      });
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      res.status(500).json({ message: error.message || 'Withdrawal failed.' });
    }
  });

  // Preview withdrawal (doesn't execute, just shows what user would receive)
  app.get('/api/vaults/:vaultId/withdraw/preview', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const { vaultId } = req.params;
    const shareTokensToBurn = parseFloat(req.query.shares as string);

    if (!shareTokensToBurn || shareTokensToBurn <= 0) {
      return res.status(400).json({ message: 'Invalid share token amount.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const preview = await previewWithdrawal(req.user.id, vaultId, shareTokensToBurn);

      if (!preview) {
        return res.status(400).json({ message: 'Could not preview withdrawal. Check your position.' });
      }

      res.json(preview);
    } catch (error: any) {
      console.error('Preview error:', error);
      res.status(500).json({ message: error.message || 'Preview failed.' });
    }
  });

  // Get user's position in a vault
  app.get('/api/vaults/:vaultId/position', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const { vaultId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const position = await getUserVaultPosition(req.user.id, vaultId);

      if (!position) {
        return res.status(404).json({ message: 'No active position in this vault.' });
      }

      res.json(position);
    } catch (error: any) {
      console.error('Position fetch error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch position.' });
    }
  });

  // Get user's withdrawal history
  app.get('/api/user/withdrawals', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const history = await getWithdrawalHistory(req.user.id, limit);
      res.json(history);
    } catch (error: any) {
      console.error('Withdrawal history error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch withdrawal history.' });
    }
  });

  app.get('/api/vaults/:vaultId/pnl-history', async (req: Request, res: Response) => {
    const { vaultId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    try {
      // Try to get real P&L history from trades
      const trades = await prisma.trade.findMany({
        where: { vault_id: vaultId },
        orderBy: { opened_at: 'desc' },
        take: limit
      });

      if (trades.length > 0) {
        const pnlHistory = trades.map(trade => ({
          timestamp: trade.opened_at.toISOString(),
          pnl: Number(trade.realized_pnl || 0),
          value: Number(trade.current_value || trade.entry_value)
        }));
        return res.json(pnlHistory);
      }

      // Fallback to generated data for demo
      const pnlHistory = Array.from({ length: limit }).map((_, i) => ({
        timestamp: new Date(Date.now() - (limit - 1 - i) * 24 * 60 * 60 * 1000).toISOString(),
        pnl: Math.random() * 200 - 100,
        value: 1000 + Math.random() * 500
      }));

      res.json(pnlHistory);
    } catch (error: any) {
      console.error('P&L history error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch P&L history.' });
    }
  });

  // Internal API Endpoints (Agent/Admin Only)
  app.post('/api/admin/emergency-pause', authenticateUser, async (_req: Request, res: Response) => {
    // Implement actual emergency pause logic here
    // This should ideally interact with a smart contract or global system flag
    try {
      // Update all active vaults to paused status
      await prisma.vault.updateMany({
        where: { status: 'active' },
        data: { status: 'paused' }
      });

      res.status(200).json({ message: 'Emergency pause initiated.', status: 'paused' });
    } catch (error: any) {
      console.error('Emergency pause error:', error);
      res.status(500).json({ message: error.message || 'Emergency pause failed.' });
    }
  });

  app.post('/api/admin/resume', authenticateUser, async (_req: Request, res: Response) => {
    try {
      // Resume all paused vaults
      await prisma.vault.updateMany({
        where: { status: 'paused' },
        data: { status: 'active' }
      });

      res.status(200).json({ message: 'Vaults resumed.', status: 'active' });
    } catch (error: any) {
      console.error('Resume error:', error);
      res.status(500).json({ message: error.message || 'Resume failed.' });
    }
  });

  app.get('/api/agent/run-loop', async (_req: Request, res: Response) => {
    // This endpoint should be highly secured, e.g., with an API key
    // For hackathon, a simple check might suffice, but for production, robust auth is needed.
    try {
      await agentMainLoop();
      res.status(200).json({ message: 'Agent loop executed successfully.' });
    } catch (error: any) {
      console.error('Error triggering agent loop:', error);
      res.status(500).json({ message: error.message || 'Failed to trigger agent loop.' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // ==================== SOCIAL FEATURES ====================

  // User Profile
  app.get('/api/profile/:walletAddress', async (req: AuthenticatedRequest, res: Response) => {
    const { walletAddress } = req.params;
    try {
      const viewerId = req.user?.id;
      const profile = await getUserProfile(walletAddress, viewerId);
      if (!profile) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/profile', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const { username, bio, avatar_url, is_public, copy_trading_enabled, copy_trading_fee } = req.body;
      const updated = await updateUserProfile(req.user.id, {
        username,
        bio,
        avatar_url,
        is_public,
        copy_trading_enabled,
        copy_trading_fee,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User Following
  app.post('/api/users/:walletAddress/follow', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      await followUser(req.user.id, req.params.walletAddress);
      res.json({ message: 'Successfully followed user' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/users/:walletAddress/follow', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      await unfollowUser(req.user.id, req.params.walletAddress);
      res.json({ message: 'Successfully unfollowed user' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/users/:walletAddress/followers', async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    try {
      const user = await prisma.user.findUnique({ where: { wallet_address: walletAddress } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const result = await getFollowers(user.id, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/users/:walletAddress/following', async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    try {
      const user = await prisma.user.findUnique({ where: { wallet_address: walletAddress } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const result = await getFollowing(user.id, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/users/:walletAddress/stats', async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    try {
      const user = await prisma.user.findUnique({ where: { wallet_address: walletAddress } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const stats = await getFollowStats(user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vault Following
  app.post('/api/vaults/:vaultId/follow', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const { notifyOnDeposit, notifyOnTrade } = req.body;
      await followVault(req.user.id, req.params.vaultId, { notifyOnDeposit, notifyOnTrade });
      res.json({ message: 'Successfully followed vault' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/vaults/:vaultId/follow', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      await unfollowVault(req.user.id, req.params.vaultId);
      res.json({ message: 'Successfully unfollowed vault' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/vaults/:vaultId/followers', async (req: Request, res: Response) => {
    try {
      const result = await getVaultFollowers(req.params.vaultId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/vaults/:vaultId/is-following', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const following = await isFollowingVault(req.user.id, req.params.vaultId);
      res.json({ following });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/user/followed-vaults', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const vaults = await getFollowedVaults(req.user.id);
      res.json(vaults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Copy Trading
  app.get('/api/copy-trading/top-traders', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    try {
      const traders = await getTopTraders(limit);
      res.json(traders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/copy-trading/start', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const { leaderId, allocationAmount, allocationPercent, maxPositionSize, copyAllVaults, vaultIds } = req.body;

      if (!leaderId) {
        return res.status(400).json({ message: 'Leader ID is required' });
      }

      const copyTrade = await startCopyTrading(req.user.id, {
        leaderId,
        allocationAmount: allocationAmount || 0,
        allocationPercent: allocationPercent || 0,
        maxPositionSize: maxPositionSize || 10000,
        copyAllVaults: copyAllVaults ?? true,
        vaultIds,
      });

      res.json({ message: 'Copy trading started successfully', copyTrade });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/copy-trading/stop', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const { leaderId } = req.body;
      if (!leaderId) {
        return res.status(400).json({ message: 'Leader ID is required' });
      }
      await stopCopyTrading(req.user.id, leaderId);
      res.json({ message: 'Copy trading stopped successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/copy-trading/settings/:leaderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const settings = await getCopyTradeSettings(req.user.id, req.params.leaderId);
      res.json(settings || { active: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/copy-trading/my-trades', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const copyTrades = await getMyCopyTrades(req.user.id);
      res.json(copyTrades);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/copy-trading/my-copiers', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
      const copiers = await getMyCopiers(req.user.id);
      res.json(copiers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
