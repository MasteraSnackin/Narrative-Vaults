import React, { useState } from 'react';

interface Narrative {
  id: string;
  name: string;
  description: string;
  min_level: number;
  base_leverage: number;
  max_drawdown: string;
  risk_tier: string;
}

interface DepositModalProps {
  narrative: Narrative;
  onDeposit: (amount: number) => void;
  userBalance: number;
  isOpen: boolean;
  onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({
  narrative,
  onDeposit,
  userBalance,
  isOpen,
  onClose,
}) => {
  const [depositAmount, setDepositAmount] = useState<number | string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    setError(null);
    if (typeof depositAmount !== 'number' || depositAmount <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }
    if (depositAmount > userBalance) {
      setError('Insufficient USDC balance.');
      return;
    }

    setIsLoading(true);
    try {
      await onDeposit(depositAmount);
      onClose(); // Close on successful deposit
    } catch (err) {
      setError('Deposit failed. Please try again.');
      console.error('Deposit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-4">Deposit into {narrative.name}</h2>
        <p className="text-gray-400 mb-6">Min Level: {narrative.min_level}, Max Drawdown: {narrative.max_drawdown}</p>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-4">
          <label htmlFor="deposit-amount" className="block text-gray-300 text-sm font-bold mb-2">
            Deposit Amount (USDC):
          </label>
          <input
            type="number"
            id="deposit-amount"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-900 border-gray-700 text-white"
            value={depositAmount}
            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || '')}
            placeholder="e.g., 1000"
            min="0"
            step="any"
            disabled={isLoading}
          />
          <p className="text-gray-500 text-xs mt-1">Your Balance: {userBalance.toFixed(2)} USDC</p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            onClick={handleDeposit}
            disabled={isLoading || !depositAmount || parseFloat(depositAmount.toString()) <= 0 || parseFloat(depositAmount.toString()) > userBalance}
          >
            {isLoading ? 'Depositing...' : 'Confirm Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;
