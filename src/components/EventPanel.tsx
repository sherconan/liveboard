import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw, X, Filter } from 'lucide-react';
import { NewsItem, NewsTag, fetchLiveNews, extractAllTags } from '../services/news';

// Tag color mapping
const TAG_COLORS: Record<NewsTag, string> = {
  '宏观': '#6366f1', '央行': '#8b5cf6', '地缘': '#ef4444', '贸易': '#f97316',
  '科技': '#3b82f6', '半导体': '#06b6d4', '能源': '#a16207', '医药': '#10b981',
  '金融': '#6366f1', '地产': '#78716c', '消费': '#ec4899', '军工': '#dc2626',
  '新能源': '#22c55e', '汽车': '#0ea5e9', '监管': '#f59e0b', '财报': '#8b5cf6',
};

interface EventPanelProps {
  hotspot: string;
  setHotspot: (val: string) => void;
  onRun: () => void;
  loading: boolean;
  isOpen: boolean;
  hasAnalysis: boolean;
  analyzedHotspot: string;
}

export function EventPanel({
  hotspot, setHotspot, onRun,
  loading, isOpen, hasAnalysis, analyzedHotspot,
}: EventPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<NewsTag | null>(null);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const items = await fetchLiveNews();
      setNews(items.length > 0 ? items : []);
      if (items.length === 0) setNewsError('暂无新闻数据');
    } catch {
      setNewsError('新闻加载失败');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
    const timer = setInterval(loadNews, 120_000);
    return () => clearInterval(timer);
  }, [loadNews]);

  // Available tags (sorted by frequency)
  const availableTags = useMemo(() => extractAllTags(news), [news]);

  // Filtered news
  const filteredNews = useMemo(() => {
    if (!activeTag) return news;
    return news.filter(n => n.tags.includes(activeTag));
  }, [news, activeTag]);

  const needsRerun = hotspot.trim() && hasAnalysis && hotspot !== analyzedHotspot;

  if (!isOpen) return null;

  return (
    <aside
      className="w-[340px] flex flex-col h-full z-20 shrink-0"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Input section */}
      <div className="p-4 space-y-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <textarea
            value={hotspot}
            onChange={(e) => setHotspot(e.target.value)}
            className="w-full rounded-xl p-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none h-[72px] leading-relaxed"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            placeholder="输入或点选新闻，分析市场传导链..."
          />
          {hotspot && (
            <button
              onClick={() => setHotspot('')}
              className="absolute top-2.5 right-2.5 p-0.5 rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={loading || !hotspot.trim()}
          className={`w-full text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-sm ${
            needsRerun
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? '分析中...' : needsRerun ? '重新分析' : '分析传导链'}
        </button>
      </div>

      {/* News header + tag filters */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>事件快讯</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              {filteredNews.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              >
                <X className="w-2.5 h-2.5" />
                清除
              </button>
            )}
            <button
              onClick={loadNews}
              disabled={newsLoading}
              className="p-1 rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tag filter chips */}
        {availableTags.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {availableTags.map(tag => {
              const isActive = activeTag === tag;
              const color = TAG_COLORS[tag] || '#6b7280';
              const count = news.filter(n => n.tags.includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(isActive ? null : tag)}
                  className="text-[10px] px-2 py-[3px] rounded-full font-medium transition-all flex items-center gap-1"
                  style={{
                    background: isActive ? color : 'var(--bg-input)',
                    color: isActive ? '#fff' : color,
                    border: `1px solid ${isActive ? color : 'transparent'}`,
                  }}
                >
                  {tag}
                  <span style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {newsError && news.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{newsError}</p>
            <button onClick={loadNews} className="text-xs text-blue-500 mt-2 hover:underline">重试</button>
          </div>
        )}

        {filteredNews.map((item) => {
          const isSelected = hotspot === item.title;
          return (
            <button
              key={item.id}
              onClick={() => setHotspot(item.title)}
              className="w-full text-left flex gap-3 px-4 py-2.5 transition-all"
              style={{
                background: isSelected ? 'var(--news-selected)' : item.important ? 'var(--news-important-bg)' : 'transparent',
                borderBottom: '1px solid var(--border-light)',
                borderLeft: isSelected ? '3px solid var(--accent)' : item.important ? '3px solid var(--danger)' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--news-hover)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = item.important ? 'var(--news-important-bg)' : 'transparent'; }}
            >
              {/* Time + Impact */}
              <div className="shrink-0 w-10 pt-0.5 flex flex-col items-center gap-1">
                <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
                {item.impact >= 40 && (
                  <span
                    className="text-[8px] font-bold px-1 py-[1px] rounded"
                    style={{
                      background: item.impact >= 70 ? '#ef444425' : item.impact >= 50 ? '#f59e0b20' : '#3b82f615',
                      color: item.impact >= 70 ? '#ef4444' : item.impact >= 50 ? '#f59e0b' : '#3b82f6',
                    }}
                  >
                    {item.impact}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12.5px] leading-[1.6] line-clamp-2"
                  style={{
                    color: isSelected ? 'var(--accent)' : item.important ? 'var(--danger)' : 'var(--text-primary)',
                    fontWeight: item.important ? 600 : 400,
                  }}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {item.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-[1px] rounded font-medium"
                      style={{ background: `${TAG_COLORS[tag]}18`, color: TAG_COLORS[tag] }}
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.source}</span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredNews.length === 0 && news.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Filter className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              「{activeTag}」暂无相关新闻
            </p>
            <button onClick={() => setActiveTag(null)} className="text-xs text-blue-500 mt-2 hover:underline">
              查看全部
            </button>
          </div>
        )}

        {news.length === 0 && !newsError && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>
    </aside>
  );
}
