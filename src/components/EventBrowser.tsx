import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Loader2, ChevronRight, Flame, RefreshCw } from 'lucide-react';
import { PolymarketEvent, PolymarketMarket, fetchTrendingEvents, searchEvents, formatVolume, formatProb } from '../services/polymarket';

interface EventBrowserProps {
  onSelectEvent: (event: PolymarketEvent, market: PolymarketMarket) => void;
  selectedMarketId?: string;
}

export function EventBrowser({ onSelectEvent, selectedMarketId }: EventBrowserProps) {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrendingEvents(15);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrending(); }, [loadTrending]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { loadTrending(); return; }
    setIsSearching(true);
    setError(null);
    try {
      const data = await searchEvents(searchQuery.trim());
      setEvents(data);
    } catch (err: any) {
      setError(err.message || '搜索失败');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, loadTrending]);

  const getPrimaryMarket = (event: PolymarketEvent): PolymarketMarket | null => {
    if (event.markets.length === 0) return null;
    if (event.markets.length === 1) return event.markets[0];
    return [...event.markets].sort((a, b) => b.volume24hr - a.volume24hr)[0];
  };

  const getYesProb = (market: PolymarketMarket): number => {
    const yesIdx = market.outcomes.findIndex(o => o.toLowerCase() === 'yes');
    if (yesIdx >= 0 && market.outcomePrices[yesIdx] !== undefined) {
      return market.outcomePrices[yesIdx];
    }
    return market.outcomePrices[0] ?? 0;
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-red-400" />
          Polymarket 热门事件
        </h2>
        <button
          onClick={loadTrending}
          disabled={loading}
          className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
          title="刷新"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索事件..."
          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all text-slate-300 placeholder-slate-600"
        />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-500" />}
      </div>

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-xs text-red-400 py-2 text-center">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">暂无结果</div>
        ) : (
          events.map((event) => {
            const primary = getPrimaryMarket(event);
            if (!primary) return null;
            const prob = getYesProb(primary);
            const isMulti = event.markets.length > 1;
            const isExpanded = expandedEventId === event.id;
            const isSelected = selectedMarketId === primary.id;

            return (
              <div key={event.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (isMulti) {
                      setExpandedEventId(isExpanded ? null : event.id);
                    } else {
                      onSelectEvent(event, primary);
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs group ${
                    isSelected
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-200 leading-tight line-clamp-2 flex-1">
                      {event.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isMulti && (
                        <span className={`font-mono font-bold text-sm ${prob > 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatProb(prob)}
                        </span>
                      )}
                      {isMulti && (
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      24h {formatVolume(event.volume24hr)}
                    </span>
                    {!isMulti && primary.oneDayPriceChange !== null && (
                      <span className={primary.oneDayPriceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {primary.oneDayPriceChange >= 0 ? '↑' : '↓'}
                        {Math.abs(primary.oneDayPriceChange * 100).toFixed(1)}%
                      </span>
                    )}
                    {isMulti && (
                      <span>{event.markets.length} 个结果</span>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isMulti && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pl-3"
                    >
                      <div className="space-y-1 py-1">
                        {event.markets
                          .sort((a, b) => getYesProb(b) - getYesProb(a))
                          .slice(0, 10)
                          .map((market) => {
                            const mProb = getYesProb(market);
                            const mSelected = selectedMarketId === market.id;
                            return (
                              <button
                                key={market.id}
                                onClick={() => onSelectEvent(event, market)}
                                className={`w-full text-left p-2 rounded-md border transition-all text-xs ${
                                  mSelected
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-600'
                                }`}
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-slate-300 line-clamp-1 flex-1">
                                    {market.groupItemTitle || market.question}
                                  </span>
                                  <span className={`font-mono font-bold shrink-0 ${mProb > 0.5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {formatProb(mProb)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
