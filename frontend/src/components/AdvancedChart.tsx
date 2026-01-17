import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
} from 'lightweight-charts';

// Types
interface ChartDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface AdvancedChartProps {
  vaultId: string;
  narrativeId: string;
  initialData?: ChartDataPoint[];
  onTimeframeChange?: (timeframe: string) => void;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
}

type ChartType = 'candlestick' | 'line' | 'area';
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface TooltipData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  change: number;
  changePercent: number;
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
];

const AdvancedChart: React.FC<AdvancedChartProps> = ({
  vaultId,
  narrativeId,
  initialData = [],
  onTimeframeChange,
  height = 500,
  showVolume = true,
  showIndicators = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [smaLength, setSmaLength] = useState(20);
  const [emaLength, setEmaLength] = useState(12);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [data, setData] = useState<ChartDataPoint[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate SMA
  const calculateSMA = useCallback((data: ChartDataPoint[], period: number): LineData[] => {
    const smaData: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      smaData.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return smaData;
  }, []);

  // Calculate EMA
  const calculateEMA = useCallback((data: ChartDataPoint[], period: number): LineData[] => {
    const emaData: LineData[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }
    let ema = sum / period;
    emaData.push({ time: data[period - 1].time, value: ema });

    // Calculate rest of EMA
    for (let i = period; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      emaData.push({ time: data[i].time, value: ema });
    }
    return emaData;
  }, []);

  // Generate mock data for demo
  const generateMockData = useCallback((tf: Timeframe): ChartDataPoint[] => {
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
      '1w': 604800,
    }[tf];

    const dataPoints: ChartDataPoint[] = [];
    let basePrice = 1000 + Math.random() * 500;
    const volatility = 0.02;

    for (let i = 200; i >= 0; i--) {
      const time = (now - i * intervalSeconds) as Time;
      const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5;
      const volume = Math.floor(Math.random() * 1000000 + 100000);

      dataPoints.push({ time, open, high, low, close, volume });
      basePrice = close;
    }

    return dataPoints;
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#c9d1d9',
      },
      grid: {
        vertLines: { color: '#21262d' },
        horzLines: { color: '#21262d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2962ff',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2962ff',
        },
      },
      rightPriceScale: {
        borderColor: '#21262d',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: '#21262d',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add line series (hidden initially)
    lineSeriesRef.current = chartRef.current.addLineSeries({
      color: '#2962ff',
      lineWidth: 2,
      visible: false,
    });

    // Add area series (hidden initially)
    areaSeriesRef.current = chartRef.current.addAreaSeries({
      topColor: 'rgba(41, 98, 255, 0.5)',
      bottomColor: 'rgba(41, 98, 255, 0.0)',
      lineColor: '#2962ff',
      lineWidth: 2,
      visible: false,
    });

    // Add volume series
    if (showVolume) {
      volumeSeriesRef.current = chartRef.current.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      chartRef.current.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Add SMA series
    smaSeriesRef.current = chartRef.current.addLineSeries({
      color: '#f48fb1',
      lineWidth: 1,
      visible: false,
      title: `SMA ${smaLength}`,
    });

    // Add EMA series
    emaSeriesRef.current = chartRef.current.addLineSeries({
      color: '#4fc3f7',
      lineWidth: 1,
      visible: false,
      title: `EMA ${emaLength}`,
    });

    // Subscribe to crosshair move for tooltip
    chartRef.current.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setTooltip(null);
        return;
      }

      const candleData = param.seriesData.get(candleSeriesRef.current!) as CandlestickData;
      if (candleData) {
        const prevClose = data.length > 1 ? data[data.length - 2].close : candleData.open;
        const change = candleData.close - prevClose;
        const changePercent = (change / prevClose) * 100;

        setTooltip({
          time: new Date((param.time as number) * 1000).toLocaleString(),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          change,
          changePercent,
        });
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Load initial data
    const mockData = generateMockData(timeframe);
    setData(mockData);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.remove();
    };
  }, [height, showVolume]);

  // Update chart data when data changes
  useEffect(() => {
    if (!data.length) return;

    // Update main series
    const candleData: CandlestickData[] = data.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const lineData: LineData[] = data.map((d) => ({
      time: d.time,
      value: d.close,
    }));

    candleSeriesRef.current?.setData(candleData);
    lineSeriesRef.current?.setData(lineData);
    areaSeriesRef.current?.setData(lineData);

    // Update volume
    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = data.map((d, i) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Update indicators
    if (showSMA && smaSeriesRef.current) {
      const smaData = calculateSMA(data, smaLength);
      smaSeriesRef.current.setData(smaData);
    }

    if (showEMA && emaSeriesRef.current) {
      const emaData = calculateEMA(data, emaLength);
      emaSeriesRef.current.setData(emaData);
    }
  }, [data, showVolume, showSMA, showEMA, smaLength, emaLength, calculateSMA, calculateEMA]);

  // Handle chart type change
  useEffect(() => {
    candleSeriesRef.current?.applyOptions({ visible: chartType === 'candlestick' });
    lineSeriesRef.current?.applyOptions({ visible: chartType === 'line' });
    areaSeriesRef.current?.applyOptions({ visible: chartType === 'area' });
  }, [chartType]);

  // Handle indicator visibility
  useEffect(() => {
    smaSeriesRef.current?.applyOptions({ visible: showSMA });
  }, [showSMA]);

  useEffect(() => {
    emaSeriesRef.current?.applyOptions({ visible: showEMA });
  }, [showEMA]);

  // Handle timeframe change
  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    setIsLoading(true);

    // Simulate loading new data
    setTimeout(() => {
      const newData = generateMockData(tf);
      setData(newData);
      setIsLoading(false);
    }, 500);

    onTimeframeChange?.(tf);
  };

  // Fit chart to content
  const handleFitContent = () => {
    chartRef.current?.timeScale().fitContent();
  };

  // Reset zoom
  const handleResetZoom = () => {
    chartRef.current?.timeScale().resetTimeScale();
    chartRef.current?.priceScale('right').applyOptions({
      autoScale: true,
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-800">
        {/* Narrative Info */}
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white capitalize">
            {narrativeId.replace(/-/g, ' ')}
          </h3>
          {tooltip && (
            <div className="flex items-center gap-2 text-sm">
              <span className={tooltip.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                {tooltip.change >= 0 ? '+' : ''}{tooltip.change.toFixed(2)}
              </span>
              <span className={tooltip.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                ({tooltip.changePercent >= 0 ? '+' : ''}{tooltip.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['candlestick', 'line', 'area'] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  chartType === type
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {type === 'candlestick' ? '🕯️' : type === 'line' ? '📈' : '📊'}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => handleTimeframeChange(tf.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                timeframe === tf.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFitContent}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Fit to content"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Reset zoom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Indicators Panel */}
      {showIndicators && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-gray-800 bg-gray-850">
          <span className="text-sm text-gray-500">Indicators:</span>

          {/* SMA Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSMA}
              onChange={(e) => setShowSMA(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-pink-300">SMA</span>
            <input
              type="number"
              value={smaLength}
              onChange={(e) => setSmaLength(parseInt(e.target.value) || 20)}
              className="w-12 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
              min={1}
              max={200}
            />
          </label>

          {/* EMA Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showEMA}
              onChange={(e) => setShowEMA(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-cyan-300">EMA</span>
            <input
              type="number"
              value={emaLength}
              onChange={(e) => setEmaLength(parseInt(e.target.value) || 12)}
              className="w-12 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
              min={1}
              max={200}
            />
          </label>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* OHLC Tooltip */}
      {tooltip && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-t border-gray-800 text-sm">
          <span className="text-gray-500">O:</span>
          <span className="text-white">{tooltip.open.toFixed(2)}</span>
          <span className="text-gray-500">H:</span>
          <span className="text-white">{tooltip.high.toFixed(2)}</span>
          <span className="text-gray-500">L:</span>
          <span className="text-white">{tooltip.low.toFixed(2)}</span>
          <span className="text-gray-500">C:</span>
          <span className="text-white">{tooltip.close.toFixed(2)}</span>
          <span className="text-gray-500 ml-auto">{tooltip.time}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
        <span>Scroll to zoom • Drag to pan • Double-click to reset</span>
        {showSMA && <span className="text-pink-300">SMA({smaLength})</span>}
        {showEMA && <span className="text-cyan-300">EMA({emaLength})</span>}
      </div>
    </div>
  );
};

export default AdvancedChart;
