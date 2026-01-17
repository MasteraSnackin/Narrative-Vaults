import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

interface BasketPerformance {
  time: number;
  longValue: number;
  shortValue: number;
  spread: number;
}

interface ComparisonChartProps {
  vaultId: string;
  narrativeId: string;
  longBasket: string[];
  shortBasket: string[];
  height?: number;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | 'ALL';

// Generate mock comparison data
const generateComparisonData = (days: number): BasketPerformance[] => {
  const data: BasketPerformance[] = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const startTime = now - days * msPerDay;

  let longValue = 100;
  let shortValue = 100;

  // Generate hourly data points
  const hoursTotal = days * 24;
  const msPerHour = 60 * 60 * 1000;

  for (let i = 0; i <= hoursTotal; i++) {
    const time = startTime + i * msPerHour;

    // Simulate correlated but diverging performance
    const longChange = (Math.random() - 0.48) * 2; // Slight bullish bias for long
    const shortChange = (Math.random() - 0.52) * 2; // Slight bearish bias for short

    longValue = Math.max(50, longValue + longChange);
    shortValue = Math.max(50, shortValue + shortChange);

    data.push({
      time: Math.floor(time / 1000),
      longValue,
      shortValue,
      spread: longValue - shortValue,
    });
  }

  return data;
};

const getDaysFromRange = (range: TimeRange): number => {
  switch (range) {
    case '1D': return 1;
    case '1W': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case 'ALL': return 365;
  }
};

export default function ComparisonChart({
  vaultId,
  narrativeId,
  longBasket,
  shortBasket,
  height = 400,
}: ComparisonChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const longSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const shortSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const spreadSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('1W');
  const [showSpread, setShowSpread] = useState(true);
  const [data, setData] = useState<BasketPerformance[]>([]);
  const [hoveredData, setHoveredData] = useState<BasketPerformance | null>(null);

  // Calculate performance metrics
  const getPerformanceMetrics = useCallback(() => {
    if (data.length < 2) return null;

    const first = data[0];
    const last = data[data.length - 1];

    const longReturn = ((last.longValue - first.longValue) / first.longValue) * 100;
    const shortReturn = ((last.shortValue - first.shortValue) / first.shortValue) * 100;
    const spreadReturn = last.spread - first.spread;

    // Calculate max drawdown for long basket
    let maxLong = first.longValue;
    let maxDrawdownLong = 0;
    for (const d of data) {
      if (d.longValue > maxLong) maxLong = d.longValue;
      const drawdown = ((maxLong - d.longValue) / maxLong) * 100;
      if (drawdown > maxDrawdownLong) maxDrawdownLong = drawdown;
    }

    // Calculate volatility (simplified)
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].longValue - data[i-1].longValue) / data[i-1].longValue);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized

    return {
      longReturn,
      shortReturn,
      spreadReturn,
      maxDrawdownLong,
      volatility,
      currentSpread: last.spread,
    };
  }, [data]);

  // Load data when time range changes
  useEffect(() => {
    const days = getDaysFromRange(timeRange);
    const newData = generateComparisonData(days);
    setData(newData);
  }, [timeRange, vaultId]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d44' },
        horzLines: { color: '#2d2d44' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height,
    });

    chartRef.current = chart;

    // Long basket series (green)
    const longSeries = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      title: 'Long Basket',
      priceLineVisible: false,
    });
    longSeriesRef.current = longSeries;

    // Short basket series (red)
    const shortSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      title: 'Short Basket',
      priceLineVisible: false,
    });
    shortSeriesRef.current = shortSeries;

    // Spread series (blue) - on secondary scale
    const spreadSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'Spread',
      priceLineVisible: false,
      priceScaleId: 'spread',
    });
    spreadSeriesRef.current = spreadSeries;

    // Configure spread scale
    chart.priceScale('spread').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0.05 },
    });

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const longData = param.seriesData.get(longSeries) as LineData;
        const shortData = param.seriesData.get(shortSeries) as LineData;
        const spreadData = param.seriesData.get(spreadSeries) as LineData;

        if (longData && shortData) {
          setHoveredData({
            time: param.time as number,
            longValue: longData.value,
            shortValue: shortData.value,
            spread: spreadData?.value || 0,
          });
        }
      } else {
        setHoveredData(null);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  // Update chart data
  useEffect(() => {
    if (!longSeriesRef.current || !shortSeriesRef.current || !spreadSeriesRef.current) return;

    const longData: LineData[] = data.map(d => ({
      time: d.time as any,
      value: d.longValue,
    }));

    const shortData: LineData[] = data.map(d => ({
      time: d.time as any,
      value: d.shortValue,
    }));

    const spreadData: LineData[] = data.map(d => ({
      time: d.time as any,
      value: d.spread,
    }));

    longSeriesRef.current.setData(longData);
    shortSeriesRef.current.setData(shortData);
    spreadSeriesRef.current.setData(spreadData);

    // Show/hide spread based on toggle
    spreadSeriesRef.current.applyOptions({
      visible: showSpread,
    });

    chartRef.current?.timeScale().fitContent();
  }, [data, showSpread]);

  const metrics = getPerformanceMetrics();
  const displayData = hoveredData || (data.length > 0 ? data[data.length - 1] : null);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Basket Performance Comparison</h3>
            <p className="text-sm text-gray-400">
              Long: {longBasket.join(', ')} vs Short: {shortBasket.join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Spread Toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={showSpread}
                onChange={(e) => setShowSpread(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
              />
              Show Spread
            </label>

            {/* Time Range Selector */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              {(['1D', '1W', '1M', '3M', 'ALL'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Current Values Display */}
      {displayData && (
        <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700">
          <div className="flex gap-8">
            <div>
              <span className="text-sm text-gray-400">Long Basket: </span>
              <span className="text-green-400 font-mono">${displayData.longValue.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Short Basket: </span>
              <span className="text-red-400 font-mono">${displayData.shortValue.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Spread: </span>
              <span className={`font-mono ${displayData.spread >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                {displayData.spread >= 0 ? '+' : ''}{displayData.spread.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Performance Metrics */}
      {metrics && (
        <div className="p-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Performance Metrics ({timeRange})</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-900/50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Long Return</p>
              <p className={`text-lg font-mono ${metrics.longReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.longReturn >= 0 ? '+' : ''}{metrics.longReturn.toFixed(2)}%
              </p>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Short Return</p>
              <p className={`text-lg font-mono ${metrics.shortReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.shortReturn >= 0 ? '+' : ''}{metrics.shortReturn.toFixed(2)}%
              </p>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Spread P&L</p>
              <p className={`text-lg font-mono ${metrics.spreadReturn >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                {metrics.spreadReturn >= 0 ? '+' : ''}{metrics.spreadReturn.toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Max Drawdown</p>
              <p className="text-lg font-mono text-yellow-400">
                -{metrics.maxDrawdownLong.toFixed(2)}%
              </p>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Volatility (Ann.)</p>
              <p className="text-lg font-mono text-purple-400">
                {metrics.volatility.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400">Long Basket</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-400">Short Basket</span>
          </div>
          {showSpread && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-400">Spread (Long - Short)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
