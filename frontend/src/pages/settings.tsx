import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletConnectButton from '../components/WalletConnectButton';
import { api } from '../utils/api';
import { UserProfile } from '../types';

export default function SettingsPage() {
  const { address, isConnected } = useAccount();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [copyTradingEnabled, setCopyTradingEnabled] = useState(false);
  const [copyTradingFee, setCopyTradingFee] = useState('10');

  useEffect(() => {
    if (isAuthenticated && address) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, address]);

  const fetchProfile = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const profileData = await api.getProfile(address);
      setProfile(profileData);

      // Populate form
      setUsername(profileData.username || '');
      setBio(profileData.bio || '');
      setAvatarUrl(profileData.avatar_url || '');
      setIsPublic(profileData.is_public);
      setCopyTradingEnabled(profileData.copy_trading_enabled);
      setCopyTradingFee(profileData.copy_trading_fee.toString());
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        username: username || undefined,
        bio: bio || undefined,
        avatar_url: avatarUrl || undefined,
        is_public: isPublic,
        copy_trading_enabled: copyTradingEnabled,
        copy_trading_fee: parseFloat(copyTradingFee),
      });

      alert('Profile updated successfully!');
      await fetchProfile();
    } catch (error: any) {
      alert(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  if (!isConnected) {
    return (
      <Fragment>
        <Head>
          <title>Settings - Narrative Vaults</title>
        </Head>
        <main className="min-h-screen bg-gray-900 text-white p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Settings</h1>
            <WalletConnectButton onAuthChange={handleAuthChange} />
          </div>
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400">Connect your wallet to access settings.</p>
          </div>
        </main>
      </Fragment>
    );
  }

  if (!isAuthenticated) {
    return (
      <Fragment>
        <Head>
          <title>Settings - Narrative Vaults</title>
        </Head>
        <main className="min-h-screen bg-gray-900 text-white p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Settings</h1>
            <WalletConnectButton onAuthChange={handleAuthChange} />
          </div>
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-400">Please sign in with your wallet to access settings.</p>
          </div>
        </main>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Head>
        <title>Settings - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold mt-2">Settings</h1>
          </div>
          <WalletConnectButton onAuthChange={handleAuthChange} />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Profile Settings */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Profile</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter a username"
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
                    maxLength={30}
                  />
                  <p className="text-xs text-gray-500 mt-1">3-30 characters, letters, numbers, and underscores only</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">{bio.length}/200 characters</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Public Profile</label>
                    <p className="text-sm text-gray-400">Allow others to view your profile and stats</p>
                  </div>
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-14 h-7 rounded-full transition-colors ${
                      isPublic ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transition-transform ${
                        isPublic ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Copy Trading Settings */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6">Copy Trading</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Enable Copy Trading</label>
                    <p className="text-sm text-gray-400">Allow others to copy your trades</p>
                  </div>
                  <button
                    onClick={() => setCopyTradingEnabled(!copyTradingEnabled)}
                    className={`w-14 h-7 rounded-full transition-colors ${
                      copyTradingEnabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transition-transform ${
                        copyTradingEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {copyTradingEnabled && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Performance Fee (%)</label>
                    <input
                      type="number"
                      value={copyTradingFee}
                      onChange={(e) => setCopyTradingFee(e.target.value)}
                      min="0"
                      max="50"
                      step="0.1"
                      className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fee charged on profits (0-50%). You'll earn {copyTradingFee}% of your copiers' profits.
                    </p>
                  </div>
                )}

                {copyTradingEnabled && (
                  <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                    <p className="text-blue-400 text-sm">
                      <strong>Tip:</strong> Lower fees attract more copiers. Top traders typically charge 5-15%.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Account Stats */}
            {profile && (
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">Account Stats</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold">{profile.current_level}</p>
                    <p className="text-sm text-gray-400">Level</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold">{profile.total_xp.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Total XP</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold">{profile.follower_count}</p>
                    <p className="text-sm text-gray-400">Followers</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                    <p className={`text-2xl font-bold ${profile.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profile.total_pnl >= 0 ? '+' : ''}{profile.total_pnl.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">Total P&L</p>
                  </div>
                </div>
              </section>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </main>
    </Fragment>
  );
}
