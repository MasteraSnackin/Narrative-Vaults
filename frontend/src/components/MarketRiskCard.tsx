import React, { useEffect, useState } from 'react';

interface MarketData {
    price: number;
    totalVolume: number;
    priceCheck_24h: number;
}

interface MarketRisk {
    allowed: boolean;
    reason?: string;
    metrics?: MarketData;
}

interface MarketRiskCardProps {
    narrativeId: string;
    onStatusChange: (allowed: boolean) => void;
}

export const MarketRiskCard: React.FC<MarketRiskCardProps> = ({ narrativeId, onStatusChange }) => {
    const [risk, setRisk] = useState<MarketRisk | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkMarket = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/market/check/${narrativeId}`);
                const data = await res.json();
                setRisk(data);
                onStatusChange(data.allowed);
            } catch (err) {
                console.error('Failed to check market:', err);
                // Default to allow if check fails (or handle per policy)
                setRisk({ allowed: true });
                onStatusChange(true);
            } finally {
                setLoading(false);
            }
        };

        checkMarket();
        const interval = setInterval(checkMarket, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [narrativeId, onStatusChange]);

    if (loading) return <div className="text-gray-400 text-sm animate-pulse">Checking market conditions...</div>;
    if (!risk) return null;

    return (
        <div className={`p-4 rounded-xl border ${risk.allowed ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'} mb-6`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className={`font-medium ${risk.allowed ? 'text-green-400' : 'text-red-400'}`}>
                    {risk.allowed ? 'Market Conditions: Favorable' : 'Market Conditions: High Risk'}
                </h3>
                {risk.metrics && (
                    <span className={`text-xs px-2 py-1 rounded ${risk.metrics.priceCheck_24h >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        24h Change: {risk.metrics.priceCheck_24h.toFixed(2)}%
                    </span>
                )}
            </div>

            {!risk.allowed && (
                <p className="text-red-300 text-sm mt-1">
                    Trading is currently paused: {risk.reason}
                </p>
            )}

            {risk.metrics && (
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Vol: ${(risk.metrics.totalVolume / 1e6).toFixed(1)}M</span>
                    <span>Price: ${risk.metrics.price.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

export default MarketRiskCard;
