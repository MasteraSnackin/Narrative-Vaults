import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserProfile {
  id: string;
  wallet_address: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  is_public: boolean;
  copy_trading_enabled: boolean;
  copy_trading_fee: number;
  follower_count: number;
  following_count: number;
  total_pnl: number;
  is_following?: boolean;
  is_copy_trading?: boolean;
}

export interface FollowStats {
  followers: number;
  following: number;
  vault_follows: number;
  copy_traders: number;
  copying_from: number;
}

// User Following

export async function followUser(followerId: string, followingWallet: string): Promise<void> {
  const following = await prisma.user.findUnique({
    where: { wallet_address: followingWallet },
  });

  if (!following) {
    throw new Error('User not found');
  }

  if (following.id === followerId) {
    throw new Error('Cannot follow yourself');
  }

  await prisma.userFollow.create({
    data: {
      follower_id: followerId,
      following_id: following.id,
    },
  });
}

export async function unfollowUser(followerId: string, followingWallet: string): Promise<void> {
  const following = await prisma.user.findUnique({
    where: { wallet_address: followingWallet },
  });

  if (!following) {
    throw new Error('User not found');
  }

  await prisma.userFollow.deleteMany({
    where: {
      follower_id: followerId,
      following_id: following.id,
    },
  });
}

export async function getFollowers(userId: string, page = 1, limit = 20): Promise<{ users: UserProfile[]; total: number }> {
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    prisma.userFollow.findMany({
      where: { following_id: userId },
      include: {
        follower: {
          include: {
            VaultPositions: {
              include: { vault: true },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.userFollow.count({ where: { following_id: userId } }),
  ]);

  const users = await Promise.all(
    follows.map(async (f) => {
      const [followerCount, followingCount] = await Promise.all([
        prisma.userFollow.count({ where: { following_id: f.follower.id } }),
        prisma.userFollow.count({ where: { follower_id: f.follower.id } }),
      ]);

      const totalPnl = f.follower.VaultPositions.reduce((sum, pos) => {
        const vault = pos.vault;
        const sharePercent = Number(pos.share_tokens) / (Number(vault.total_deposits) || 1);
        return sum + Number(vault.current_pnl) * sharePercent;
      }, 0);

      return {
        id: f.follower.id,
        wallet_address: f.follower.wallet_address,
        username: f.follower.username,
        bio: f.follower.bio,
        avatar_url: f.follower.avatar_url,
        total_xp: f.follower.total_xp,
        current_level: f.follower.current_level,
        is_public: f.follower.is_public,
        copy_trading_enabled: f.follower.copy_trading_enabled,
        copy_trading_fee: Number(f.follower.copy_trading_fee),
        follower_count: followerCount,
        following_count: followingCount,
        total_pnl: totalPnl,
      };
    })
  );

  return { users, total };
}

export async function getFollowing(userId: string, page = 1, limit = 20): Promise<{ users: UserProfile[]; total: number }> {
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    prisma.userFollow.findMany({
      where: { follower_id: userId },
      include: {
        following: {
          include: {
            VaultPositions: {
              include: { vault: true },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.userFollow.count({ where: { follower_id: userId } }),
  ]);

  const users = await Promise.all(
    follows.map(async (f) => {
      const [followerCount, followingCount] = await Promise.all([
        prisma.userFollow.count({ where: { following_id: f.following.id } }),
        prisma.userFollow.count({ where: { follower_id: f.following.id } }),
      ]);

      const totalPnl = f.following.VaultPositions.reduce((sum, pos) => {
        const vault = pos.vault;
        const sharePercent = Number(pos.share_tokens) / (Number(vault.total_deposits) || 1);
        return sum + Number(vault.current_pnl) * sharePercent;
      }, 0);

      return {
        id: f.following.id,
        wallet_address: f.following.wallet_address,
        username: f.following.username,
        bio: f.following.bio,
        avatar_url: f.following.avatar_url,
        total_xp: f.following.total_xp,
        current_level: f.following.current_level,
        is_public: f.following.is_public,
        copy_trading_enabled: f.following.copy_trading_enabled,
        copy_trading_fee: Number(f.following.copy_trading_fee),
        follower_count: followerCount,
        following_count: followingCount,
        total_pnl: totalPnl,
      };
    })
  );

  return { users, total };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const follow = await prisma.userFollow.findUnique({
    where: {
      follower_id_following_id: {
        follower_id: followerId,
        following_id: followingId,
      },
    },
  });
  return !!follow;
}

export async function getFollowStats(userId: string): Promise<FollowStats> {
  const [followers, following, vaultFollows, copyTraders, copyingFrom] = await Promise.all([
    prisma.userFollow.count({ where: { following_id: userId } }),
    prisma.userFollow.count({ where: { follower_id: userId } }),
    prisma.vaultFollow.count({ where: { user_id: userId } }),
    prisma.copyTrade.count({ where: { leader_id: userId, is_active: true } }),
    prisma.copyTrade.count({ where: { follower_id: userId, is_active: true } }),
  ]);

  return { followers, following, vault_follows: vaultFollows, copy_traders: copyTraders, copying_from: copyingFrom };
}

// Vault Following

export async function followVault(
  userId: string,
  vaultId: string,
  options: { notifyOnDeposit?: boolean; notifyOnTrade?: boolean } = {}
): Promise<void> {
  await prisma.vaultFollow.create({
    data: {
      user_id: userId,
      vault_id: vaultId,
      notify_on_deposit: options.notifyOnDeposit ?? true,
      notify_on_trade: options.notifyOnTrade ?? true,
    },
  });
}

export async function unfollowVault(userId: string, vaultId: string): Promise<void> {
  await prisma.vaultFollow.deleteMany({
    where: {
      user_id: userId,
      vault_id: vaultId,
    },
  });
}

export async function getFollowedVaults(userId: string): Promise<any[]> {
  const follows = await prisma.vaultFollow.findMany({
    where: { user_id: userId },
    include: {
      vault: true,
    },
    orderBy: { created_at: 'desc' },
  });

  return follows.map((f) => ({
    ...f.vault,
    notify_on_deposit: f.notify_on_deposit,
    notify_on_trade: f.notify_on_trade,
    followed_at: f.created_at,
  }));
}

export async function getVaultFollowers(vaultId: string): Promise<{ count: number; followers: any[] }> {
  const [count, follows] = await Promise.all([
    prisma.vaultFollow.count({ where: { vault_id: vaultId } }),
    prisma.vaultFollow.findMany({
      where: { vault_id: vaultId },
      include: {
        user: {
          select: {
            id: true,
            wallet_address: true,
            username: true,
            avatar_url: true,
            current_level: true,
          },
        },
      },
      take: 10,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    count,
    followers: follows.map((f) => f.user),
  };
}

export async function isFollowingVault(userId: string, vaultId: string): Promise<boolean> {
  const follow = await prisma.vaultFollow.findUnique({
    where: {
      user_id_vault_id: {
        user_id: userId,
        vault_id: vaultId,
      },
    },
  });
  return !!follow;
}

// Copy Trading

export interface CopyTradeSettings {
  leaderId: string;
  allocationAmount: number;
  allocationPercent: number;
  maxPositionSize: number;
  copyAllVaults: boolean;
  vaultIds?: string[];
}

export async function startCopyTrading(followerId: string, settings: CopyTradeSettings): Promise<any> {
  const leader = await prisma.user.findUnique({
    where: { id: settings.leaderId },
  });

  if (!leader) {
    throw new Error('Leader not found');
  }

  if (!leader.copy_trading_enabled) {
    throw new Error('This user has not enabled copy trading');
  }

  if (leader.id === followerId) {
    throw new Error('Cannot copy trade yourself');
  }

  const existing = await prisma.copyTrade.findUnique({
    where: {
      follower_id_leader_id: {
        follower_id: followerId,
        leader_id: settings.leaderId,
      },
    },
  });

  if (existing) {
    // Update existing copy trade
    return prisma.copyTrade.update({
      where: { id: existing.id },
      data: {
        allocation_amount: settings.allocationAmount,
        allocation_percent: settings.allocationPercent,
        max_position_size: settings.maxPositionSize,
        copy_all_vaults: settings.copyAllVaults,
        vault_ids: settings.vaultIds || [],
        is_active: true,
      },
    });
  }

  return prisma.copyTrade.create({
    data: {
      follower_id: followerId,
      leader_id: settings.leaderId,
      allocation_amount: settings.allocationAmount,
      allocation_percent: settings.allocationPercent,
      max_position_size: settings.maxPositionSize,
      copy_all_vaults: settings.copyAllVaults,
      vault_ids: settings.vaultIds || [],
    },
  });
}

export async function stopCopyTrading(followerId: string, leaderId: string): Promise<void> {
  await prisma.copyTrade.updateMany({
    where: {
      follower_id: followerId,
      leader_id: leaderId,
    },
    data: {
      is_active: false,
    },
  });
}

export async function getCopyTradeSettings(followerId: string, leaderId: string): Promise<any> {
  return prisma.copyTrade.findUnique({
    where: {
      follower_id_leader_id: {
        follower_id: followerId,
        leader_id: leaderId,
      },
    },
    include: {
      leader: {
        select: {
          wallet_address: true,
          username: true,
          avatar_url: true,
          copy_trading_fee: true,
        },
      },
    },
  });
}

export async function getMyCopyTrades(userId: string): Promise<any[]> {
  const copyTrades = await prisma.copyTrade.findMany({
    where: { follower_id: userId },
    include: {
      leader: {
        select: {
          id: true,
          wallet_address: true,
          username: true,
          avatar_url: true,
          current_level: true,
          copy_trading_fee: true,
        },
      },
      CopyTradeActions: {
        take: 5,
        orderBy: { created_at: 'desc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return copyTrades;
}

export async function getMyCopiers(userId: string): Promise<any[]> {
  const copiers = await prisma.copyTrade.findMany({
    where: { leader_id: userId, is_active: true },
    include: {
      follower: {
        select: {
          id: true,
          wallet_address: true,
          username: true,
          avatar_url: true,
          current_level: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return copiers;
}

export async function isCopyTrading(followerId: string, leaderId: string): Promise<boolean> {
  const copyTrade = await prisma.copyTrade.findUnique({
    where: {
      follower_id_leader_id: {
        follower_id: followerId,
        leader_id: leaderId,
      },
    },
  });
  return !!copyTrade && copyTrade.is_active;
}

// User Profile

export async function getUserProfile(walletAddress: string, viewerId?: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { wallet_address: walletAddress },
    include: {
      VaultPositions: {
        include: { vault: true },
      },
    },
  });

  if (!user) return null;

  const [followerCount, followingCount] = await Promise.all([
    prisma.userFollow.count({ where: { following_id: user.id } }),
    prisma.userFollow.count({ where: { follower_id: user.id } }),
  ]);

  const totalPnl = user.VaultPositions.reduce((sum, pos) => {
    const vault = pos.vault;
    const sharePercent = Number(pos.share_tokens) / (Number(vault.total_deposits) || 1);
    return sum + Number(vault.current_pnl) * sharePercent;
  }, 0);

  let isFollowingUser = false;
  let isCopyTradingUser = false;

  if (viewerId && viewerId !== user.id) {
    [isFollowingUser, isCopyTradingUser] = await Promise.all([
      isFollowing(viewerId, user.id),
      isCopyTrading(viewerId, user.id),
    ]);
  }

  return {
    id: user.id,
    wallet_address: user.wallet_address,
    username: user.username,
    bio: user.bio,
    avatar_url: user.avatar_url,
    total_xp: user.total_xp,
    current_level: user.current_level,
    is_public: user.is_public,
    copy_trading_enabled: user.copy_trading_enabled,
    copy_trading_fee: Number(user.copy_trading_fee),
    follower_count: followerCount,
    following_count: followingCount,
    total_pnl: totalPnl,
    is_following: isFollowingUser,
    is_copy_trading: isCopyTradingUser,
  };
}

export async function updateUserProfile(
  userId: string,
  data: {
    username?: string;
    bio?: string;
    avatar_url?: string;
    is_public?: boolean;
    copy_trading_enabled?: boolean;
    copy_trading_fee?: number;
  }
): Promise<any> {
  // Validate username if provided
  if (data.username) {
    if (data.username.length < 3 || data.username.length > 30) {
      throw new Error('Username must be 3-30 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing && existing.id !== userId) {
      throw new Error('Username already taken');
    }
  }

  // Validate copy trading fee
  if (data.copy_trading_fee !== undefined) {
    if (data.copy_trading_fee < 0 || data.copy_trading_fee > 50) {
      throw new Error('Copy trading fee must be between 0% and 50%');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

// Top Traders for Copy Trading

export async function getTopTraders(limit = 20): Promise<UserProfile[]> {
  const users = await prisma.user.findMany({
    where: {
      copy_trading_enabled: true,
      is_public: true,
    },
    include: {
      VaultPositions: {
        include: { vault: true },
      },
    },
    orderBy: { total_xp: 'desc' },
    take: limit,
  });

  const profiles = await Promise.all(
    users.map(async (user) => {
      const [followerCount, followingCount] = await Promise.all([
        prisma.userFollow.count({ where: { following_id: user.id } }),
        prisma.userFollow.count({ where: { follower_id: user.id } }),
      ]);

      const totalPnl = user.VaultPositions.reduce((sum, pos) => {
        const vault = pos.vault;
        const sharePercent = Number(pos.share_tokens) / (Number(vault.total_deposits) || 1);
        return sum + Number(vault.current_pnl) * sharePercent;
      }, 0);

      return {
        id: user.id,
        wallet_address: user.wallet_address,
        username: user.username,
        bio: user.bio,
        avatar_url: user.avatar_url,
        total_xp: user.total_xp,
        current_level: user.current_level,
        is_public: user.is_public,
        copy_trading_enabled: user.copy_trading_enabled,
        copy_trading_fee: Number(user.copy_trading_fee),
        follower_count: followerCount,
        following_count: followingCount,
        total_pnl: totalPnl,
      };
    })
  );

  // Sort by total PnL
  return profiles.sort((a, b) => b.total_pnl - a.total_pnl);
}
