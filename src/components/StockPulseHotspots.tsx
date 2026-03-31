import { useEffect, useState } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { BridgeEvent, fetchStockPulseEvents } from '../services/stockpulse';
import { useLocale } from '../i18n';

interface Props {
  onSelectEvent: (title: string) => void;
}

const SEVERITY_STYLE: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-400',
};

export function StockPulseHotspots({ onSelectEvent }: Props) {
  const { t } = useLocale();
  const [events, setEvents] = useState<BridgeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchStockPulseEvents(5);
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 120_000);
    return () => clearInterval(timer);
  }, []);

  // Don't render if StockPulse is not available
  if (events.length === 0 && !loading) return null;
  if (!visible) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {t('stockpulse.title')}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            disabled={loading}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded text-[10px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Events list */}
      <div className="max-h-[280px] overflow-y-auto">
        {events.map((ev, i) => (
          <button
            key={i}
            onClick={() => onSelectEvent(ev.title)}
            className="w-full text-left px-3 py-2 transition-all"
            style={{ borderBottom: '1px solid var(--border-light)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_STYLE[ev.severity] || 'bg-gray-400'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-[1.5] line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {ev.title}
                </p>
                {ev.market_impact && ev.market_impact.length > 0 && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {ev.market_impact.slice(0, 3).map(m => (
                      <span key={m.ticker} className="inline-flex items-center gap-0.5 text-[9px]">
                        <span style={{ color: 'var(--text-muted)' }}>{m.ticker}</span>
                        <span className={m.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {m.change >= 0 ? '+' : ''}{m.change.toFixed(1)}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
