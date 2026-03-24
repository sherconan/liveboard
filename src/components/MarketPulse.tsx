import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, MessageCircle, ThumbsUp, ArrowUpRight, Loader2, ExternalLink } from 'lucide-react';
import { PolymarketMarket, formatProb } from '../services/polymarket';
import { SocialPost, fetchSocialSentiment, extractSymbols } from '../services/social';
import { PriceTrend } from './PriceTrend';

type Tab = 'social' | 'polymarket';

interface MarketPulseProps {
  // Polymarket
  matchedMarkets: PolymarketMarket[];
  selectedMarket: PolymarketMarket | null;
  onSelectMarket: (m: PolymarketMarket) => void;
  // For social sentiment
  polymarketQueries: string[];
  suggestedAssets: string;
}

export function MarketPulse({
  matchedMarkets, selectedMarket, onSelectMarket,
  polymarketQueries, suggestedAssets,
}: MarketPulseProps) {
  const [tab, setTab] = useState<Tab>('social');
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showTrend, setShowTrend] = useState(false);

  // Fetch social data when queries change
  useEffect(() => {
    if (!polymarketQueries.length && !suggestedAssets) return;
    setSocialLoading(true);
    const symbols = extractSymbols(suggestedAssets);
    fetchSocialSentiment(polymarketQueries, symbols)
      .then(posts => setSocialPosts(posts))
      .catch(() => setSocialPosts([]))
      .finally(() => setSocialLoading(false));
  }, [polymarketQueries, suggestedAssets]);

  const hasPM = matchedMarkets.length > 0;
  const hasSocial = socialPosts.length > 0 || socialLoading;
  const trendTokenId = selectedMarket?.clobTokenIds?.[0] || null;
  const trendTitle = selectedMarket?.groupItemTitle || selectedMarket?.question || '';

  return (
    <div
      className="w-[280px] shrink-0 flex flex-col overflow-hidden"
      style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      {/* Tab bar */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setTab('social')}
          className="flex-1 py-2 text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors"
          style={{
            color: tab === 'social' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === 'social' ? '2px solid var(--accent)' : '2px solid transparent',
            background: tab === 'social' ? 'var(--accent-soft)' : 'transparent',
          }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          社交舆情
        </button>
        <button
          onClick={() => setTab('polymarket')}
          className="flex-1 py-2 text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors relative"
          style={{
            color: tab === 'polymarket' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === 'polymarket' ? '2px solid var(--accent)' : '2px solid transparent',
            background: tab === 'polymarket' ? 'var(--accent-soft)' : 'transparent',
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          预测市场
          {hasPM && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute top-1.5 right-3" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {tab === 'social' && (
          <SocialTab posts={socialPosts} loading={socialLoading} />
        )}
        {tab === 'polymarket' && (
          <PolymarketTab
            markets={matchedMarkets}
            selectedMarket={selectedMarket}
            onSelect={onSelectMarket}
          />
        )}
      </div>

      {/* Polymarket trend chart */}
      {tab === 'polymarket' && showTrend && selectedMarket && (
        <div className="h-[170px] shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <PriceTrend tokenId={trendTokenId} marketTitle={trendTitle} />
        </div>
      )}

      {/* Toggle trend button */}
      {tab === 'polymarket' && selectedMarket && (
        <button
          onClick={() => setShowTrend(!showTrend)}
          className="shrink-0 py-1.5 text-[10px] font-medium text-center transition-colors"
          style={{
            borderTop: '1px solid var(--border-light)',
            color: showTrend ? 'var(--accent)' : 'var(--text-muted)',
            background: showTrend ? 'var(--accent-soft)' : 'transparent',
          }}
        >
          {showTrend ? '收起趋势图' : '查看概率趋势'}
        </button>
      )}
    </div>
  );
}

// ─── Social Tab ───

function SocialTab({ posts, loading }: { posts: SocialPost[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageCircle className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>暂无相关社交讨论</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map(post => (
        <div
          key={post.id}
          className="px-3 py-2.5 transition-colors"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          {/* Header: source + sentiment */}
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: post.source === 'Reddit' ? '#ff4500' : '#1da1f2',
                color: '#fff',
              }}
            >
              {post.source === 'Reddit' ? `r/${post.subreddit}` : post.symbol || 'ST'}
            </span>
            {post.sentiment && post.sentiment !== 'neutral' && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: post.sentiment === 'Bullish' ? 'var(--success-soft)' : 'var(--danger-soft)',
                  color: post.sentiment === 'Bullish' ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {post.sentiment === 'Bullish' ? '看涨' : '看跌'}
              </span>
            )}
            <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>{post.time}</span>
          </div>

          {/* Title */}
          <p className="text-[11.5px] leading-[1.5] line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {post.title}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <ThumbsUp className="w-3 h-3" />{post.score > 999 ? `${(post.score / 1000).toFixed(1)}k` : post.score}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <MessageCircle className="w-3 h-3" />{post.comments}
            </span>
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-0.5 text-[10px] transition-colors"
                style={{ color: 'var(--accent)' }}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Polymarket Tab ───

function PolymarketTab({
  markets, selectedMarket, onSelect,
}: {
  markets: PolymarketMarket[];
  selectedMarket: PolymarketMarket | null;
  onSelect: (m: PolymarketMarket) => void;
}) {
  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <TrendingUp className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>未找到相关预测市场</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Polymarket 以欧美事件为主，部分中国新闻可能无法匹配
        </p>
      </div>
    );
  }

  return (
    <div className="p-2.5 space-y-1.5">
      {markets.map((m) => {
        const yesIdx = m.outcomes.findIndex(o => o.toLowerCase() === 'yes');
        const prob = yesIdx >= 0 ? m.outcomePrices[yesIdx] : m.outcomePrices[0];
        const isSelected = selectedMarket?.id === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="w-full text-left p-2.5 rounded-lg transition-all text-xs"
            style={{
              background: isSelected ? 'var(--accent-soft)' : 'var(--bg-input)',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="leading-tight line-clamp-2 flex-1" style={{ color: 'var(--text-secondary)' }}>
                {m.groupItemTitle || m.question}
              </span>
              <span className={`font-mono font-bold text-sm shrink-0 ${prob > 0.5 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatProb(prob)}
              </span>
            </div>
            {m.oneDayPriceChange !== null && (
              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                24h: <span className={m.oneDayPriceChange >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {m.oneDayPriceChange >= 0 ? '↑' : '↓'}{Math.abs(m.oneDayPriceChange * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
