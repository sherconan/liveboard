import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Clock } from 'lucide-react';
import { fetchPriceHistory, PricePoint } from '../services/polymarket';

interface PriceTrendProps {
  tokenId: string | null;
  marketTitle: string;
}

const INTERVALS = [
  { label: '1天', value: '1d' as const },
  { label: '1周', value: '1w' as const },
  { label: '1月', value: '1m' as const },
  { label: '3月', value: '3m' as const },
];

export function PriceTrend({ tokenId, marketTitle }: PriceTrendProps) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<'1d' | '1w' | '1m' | '3m'>('1m');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tokenId) return;
    setLoading(true);
    setError(null);
    try {
      const history = await fetchPriceHistory(tokenId, interval, 80);
      setData(history);
    } catch (err: any) {
      setError(err.message || '加载失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tokenId, interval]);

  useEffect(() => { load(); }, [load]);

  if (!tokenId) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-sm">
        选择一个 Polymarket 事件查看概率趋势
      </div>
    );
  }

  const chartData = data.map((p) => ({
    time: p.t * 1000,
    prob: p.p,
  }));

  const latestProb = chartData.length > 0 ? chartData[chartData.length - 1].prob : 0;
  const firstProb = chartData.length > 0 ? chartData[0].prob : 0;
  const change = latestProb - firstProb;
  const isUp = change >= 0;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    if (interval === '1d') return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1220] rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-300 truncate">{marketTitle}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {chartData.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold text-slate-100">{(latestProb * 100).toFixed(1)}%</span>
              <span className={`text-xs font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '↑' : '↓'}{Math.abs(change * 100).toFixed(1)}%
              </span>
            </div>
          )}
          <div className="flex bg-slate-800 rounded-md p-0.5">
            {INTERVALS.map((iv) => (
              <button
                key={iv.value}
                onClick={() => setInterval(iv.value)}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                  interval === iv.value
                    ? 'bg-slate-700 text-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-sm">暂无数据</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                labelFormatter={(ts: number) => new Date(ts).toLocaleString('zh-CN')}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '概率']}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="prob"
                stroke={isUp ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                fill="url(#probGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
