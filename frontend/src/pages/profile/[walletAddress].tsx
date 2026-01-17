import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Fragment, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletConnectButton from '../../components/WalletConnectButton';
import { api } from '../../utils/api';
import { UserProfile, FollowStats } from '../../types';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getLevelColor(level: number): string {
  const colors: Record<number, string> = {
    1: 'text-gray-400',
    2: 'text-green-400',
    3: 'text-blue-400',
    4: 'text-purple-400',
    5: 'text-yellow-400',
  };
  return colors[level] || 'text-gray-400';
}

export default function ProfilePage() {
  const router = useRouter();
  const { walletAddress } = router.query;
  const { address: myAddress, isConnected } = useAccount();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = myAddress?.toLowerCase() === (walletAddress as string)?.toLowerCase();

  useEffect(() => {
    if (walletAddress && typeof walletAddress === 'string') {
      fetchProfileData();
    }
  }, [walletAddress, isAuthenticated]);

  const fetchProfileData = async () => {
    if (!walletAddress || typeof walletAddress !== 'string') return;

    setLoading(true);
    try {
      const [profileData, statsData, followersData, followingData] = await Promise.all([
        api.getProfile(walletAddress),
        api.getUserStats(walletAddress),
        api.getFollowers(walletAddress, 1, 10),
        api.getFollowing(walletAddress, 1, 10),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setFollowers(followersData.users);
      setFollowing(followingData.users);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!walletAddress || typeof walletAddress !== 'string') return;

    setFollowLoading(true);
    try {
      if (profile?.is_following) {
        await api.unfollowUser(walletAddress);
      } else {
        await api.followUser(walletAddress);
      }
      await fetchProfileData();
    } catch (error: any) {
      alert(error.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center py-20">
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-4">User Not Found</h2>
          <p className="text-gray-400">This user does not exist or has not joined Narrative Vaults yet.</p>
        </div>
      </main>
    );
  }

  return (
    <Fragment>
      <Head>
        <title>{profile.username || shortenAddress(profile.wallet_address)} - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            &larr; Back to Home
          </Link>
          <WalletConnectButton onAuthChange={handleAuthChange} />
        </div>

        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.username?.charAt(0).toUpperCase() || profile.wallet_address.charAt(2).toUpperCase()
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold">
                  {profile.username || shortenAddress(profile.wallet_address)}
                </h1>
                <span className={`text-sm font-medium ${getLevelColor(profile.current_level)}`}>
                  Level {profile.current_level}
                </span>
                {profile.copy_trading_enabled && (
                  <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full">
                    Copy Trading Enabled
                  </span>
                )}
              </div>

              <p className="text-gray-400 font-mono text-sm mb-2">{profile.wallet_address}</p>

              {profile.bio && <p className="text-gray-300 mb-4">{profile.bio}</p>}

              {/* Stats Row */}
              <div className="flex gap-6 mb-4">
                <div>
                  <span className="text-2xl font-bold">{profile.follower_count}</span>
                  <span className="text-gray-400 ml-1">Followers</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{profile.following_count}</span>
                  <span className="text-gray-400 ml-1">Following</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{profile.total_xp.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">XP</span>
                </div>
                <div>
                  <span className={`text-2xl font-bold ${profile.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profile.total_pnl >= 0 ? '+' : ''}{profile.total_pnl.toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-1">USDC P&L</span>
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && isAuthenticated && (
                <div className="flex gap-3">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${
                      profile.is_following
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {followLoading ? '...' : profile.is_following ? 'Unfollow' : 'Follow'}
                  </button>

                  {profile.copy_trading_enabled && !profile.is_copy_trading && (
                    <Link
                      href={`/copy-trading?leader=${profile.id}`}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium"
                    >
                      Copy Trade ({profile.copy_trading_fee}% fee)
                    </Link>
                  )}

                  {profile.is_copy_trading && (
                    <span className="px-6 py-2 bg-green-900/50 text-green-400 rounded-md font-medium">
                      Copying this trader
                    </span>
                  )}
                </div>
              )}

              {isOwnProfile && (
                <Link
                  href="/settings"
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium inline-block"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Followers/Following Tabs */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'followers'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Followers ({stats?.followers || 0})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'following'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Following ({stats?.following || 0})
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'followers' ? (
              followers.length > 0 ? (
                <div className="space-y-3">
                  {followers.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.wallet_address}`}
                      className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                        {user.username?.charAt(0).toUpperCase() || user.wallet_address.charAt(2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.username || shortenAddress(user.wallet_address)}</p>
                        <p className="text-sm text-gray-400">Level {user.current_level} • {user.total_xp} XP</p>
                      </div>
                      <span className={`text-sm font-mono ${user.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {user.total_pnl >= 0 ? '+' : ''}{user.total_pnl.toFixed(2)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No followers yet</p>
              )
            ) : following.length > 0 ? (
              <div className="space-y-3">
                {following.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.wallet_address}`}
                    className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                      {user.username?.charAt(0).toUpperCase() || user.wallet_address.charAt(2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.username || shortenAddress(user.wallet_address)}</p>
                      <p className="text-sm text-gray-400">Level {user.current_level} • {user.total_xp} XP</p>
                    </div>
                    <span className={`text-sm font-mono ${user.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {user.total_pnl >= 0 ? '+' : ''}{user.total_pnl.toFixed(2)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Not following anyone yet</p>
            )}
          </div>
        </div>
      </main>
    </Fragment>
  );
}
