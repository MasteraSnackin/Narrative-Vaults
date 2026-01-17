import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time, ColorType } from 'lightweight-charts';

interface LivePnLChartProps {
  vaultId: string;
  websocketEndpoint: string;
}

const LivePnLChart: React.FC<LivePnLChartProps> = ({
  vaultId,
  websocketEndpoint,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [data, setData] = useState<LineData[]>([]);

  useEffect(() => {
    if (chartContainerRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: { textColor: '#d1d4dc', background: { type: ColorType.Solid, color: '#1f2937' } },
        grid: { vertLines: { color: '#334158' }, horzLines: { color: '#334158' } },
        timeScale: { timeVisible: true, secondsVisible: false },
      });

      lineSeriesRef.current = chartRef.current.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
      });

      // Resize handler
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartRef.current?.remove();
      };
    }
  }, []);

  useEffect(() => {
    if (lineSeriesRef.current && data.length > 0) {
      lineSeriesRef.current.setData(data);
    }
  }, [data]);

  useEffect(() => {
    const ws = new WebSocket(`${websocketEndpoint}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'PNL_UPDATE' && message.vaultId === vaultId) {
        setData((prevData) => [
          ...prevData,
          { time: (new Date(message.timestamp).getTime() / 1000) as Time, value: message.currentPnL },
        ]);
      }
    };

    ws.onopen = () => console.log('WebSocket connected.');
    ws.onclose = () => console.log('WebSocket disconnected.');
    ws.onerror = (error) => console.error('WebSocket error:', error);

    return () => {
      ws.close();
    };
  }, [vaultId, websocketEndpoint]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4">Live P&L Chart</h3>
      <div ref={chartContainerRef} className="w-full h-[300px]"></div>
    </div>
  );
};

export default LivePnLChart;
