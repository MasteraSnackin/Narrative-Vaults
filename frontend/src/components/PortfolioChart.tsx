import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  AreaData,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

interface PortfolioDataPoint {
  time: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

interface PortfolioChartProps {
  walletAddress?: string;
  height?: number;
}

type TimeRange = '24H' | '7D' | '30D' | '90D' | 'ALL';

// Generate mock portfolio data
const generatePortfolioData = (days: number, initialValue: number = 10000): PortfolioDataPoint[] => {
  const data: PortfolioDataPoint[] = [];
  const now = Date.now();
  const msPerHour = 60 * 60 * 1000;
  const hoursTotal = days * 24;
  const startTime = now - hoursTotal * msPerHour;

  let value = initialValue;

  for (let i = 0; i <= hoursTotal; i += (days > 30 ? 4 : 1)) {
    const time = startTime + i * msPerHour;

    // Simulate portfolio growth with some volatility
    const change = (Math.random() - 0.45) * (value * 0.01);
    value = Math.max(value * 0.5, value + change);

    const pnl = value - initialValue;
    const pnlPercent = (pnl / initialValue) * 100;

    data.push({
      time: Math.floor(time / 1000),
      value,
      pnl,
      pnlPercent,
    });
  }

  return data;
};

const getDaysFromRange = (range: TimeRange): number => {
  switch (range) {
    case '24H': return 1;
    case '7D': return 7;
    case '30D': return 30;
    case '90D': return 90;
    case 'ALL': return 365;
  }
};

export default function PortfolioChart({
  walletAddress,
  height = 300,
}: PortfolioChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('7D');
  const [data, setData] = useState<PortfolioDataPoint[]>([]);
  const [hoveredData, setHoveredData] = useState<PortfolioDataPoint | null>(null);

  // Load data when time range changes
  useEffect(() => {
    const days = getDaysFromRange(timeRange);
    const newData = generatePortfolioData(days);
    setData(newData);
  }, [timeRange, walletAddress]);

  // Get current metrics
  const getCurrentMetrics = () => {
    if (data.length < 2) return null;

    const first = data[0];
    const last = data[data.length - 1];

    // Find high and low
    let high = first.value;
    let low = first.value;
    for (const d of data) {
      if (d.value > high) high = d.value;
      if (d.value < low) low = d.value;
    }

    return {
      currentValue: last.value,
      pnl: last.pnl,
      pnlPercent: last.pnlPercent,
      high,
      low,
      isPositive: last.pnl >= 0,
    };
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#374151', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height,
    });

    chartRef.current = chart;

    // Determine color based on P&L
    const isPositive = data.length > 1 ? data[data.length - 1].pnl >= 0 : true;
    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const topColor = isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    const bottomColor = isPositive ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    const areaSeries = chart.addAreaSeries({
      lineColor,
      topColor,
      bottomColor,
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });
    areaSeriesRef.current = areaSeries;

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const areaData = param.seriesData.get(areaSeries) as AreaData;
        if (areaData) {
          const matchingPoint = data.find(d => d.time === param.time);
          if (matchingPoint) {
            setHoveredData(matchingPoint);
          }
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

  // Update chart data and colors
  useEffect(() => {
    if (!areaSeriesRef.current || !chartRef.current || data.length === 0) return;

    const isPositive = data[data.length - 1].pnl >= 0;
    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const topColor = isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    const bottomColor = isPositive ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    areaSeriesRef.current.applyOptions({
      lineColor,
      topColor,
      bottomColor,
    });

    const areaData: AreaData[] = data.map(d => ({
      time: d.time as any,
      value: d.value,
    }));

    areaSeriesRef.current.setData(areaData);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  const metrics = getCurrentMetrics();
  const displayData = hoveredData || (data.length > 0 ? data[data.length - 1] : null);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Portfolio Value</h3>
          {displayData && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold text-white">
                ${displayData.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-medium ${displayData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {displayData.pnl >= 0 ? '+' : ''}{displayData.pnl.toFixed(2)} ({displayData.pnlPercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          {(['24H', '7D', '30D', '90D', 'ALL'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
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

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Stats Row */}
      {metrics && (
        <div className="flex justify-between mt-4 pt-4 border-t border-gray-700 text-sm">
          <div>
            <span className="text-gray-500">Period High</span>
            <p className="text-white font-mono">${metrics.high.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <span className="text-gray-500">Period Low</span>
            <p className="text-white font-mono">${metrics.low.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <span className="text-gray-500">Total P&L</span>
            <p className={`font-mono ${metrics.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.isPositive ? '+' : ''}{metrics.pnlPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
