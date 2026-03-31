import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, X, Trash2, GitCompare, Globe, Activity, TrendingUp,
  TrendingDown, Search, RotateCcw,
} from 'lucide-react';
import { HistoryItem, getRelativeTime, deleteHistoryItem, clearHistory } from '../services/historyStore';
import { useLocale } from '../i18n';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onReplay: (item: HistoryItem) => void;
  onCompare: (item: HistoryItem) => void;
  onHistoryChange: () => void; // trigger parent to re-read history
  currentHotspot?: string;
}

function MiniGraphPreview({ item }: { item: HistoryItem }) {
  // Generate a small SVG preview of the graph structure
  const { nodes, edges } = item.data;
  const typeOrder = ['hotspot', 'variable', 'impact', 'asset'];
  const typeColors: Record<string, string> = {
    hotspot: '#ef4444',
    variable: '#f59e0b',
    impact: '#f97316',
    asset: '#3b82f6',
  };

  // Layout nodes by type in rows
  const rows: Record<string, typeof nodes> = {};
  nodes.forEach(n => {
    const type = n.type || 'asset';
    if (!rows[type]) rows[type] = [];
    rows[type].push(n);
  });

  const svgW = 120;
  const svgH = 56;
  const rowGap = svgH / (typeOrder.length + 1);

  const positions: Record<string, { x: number; y: number }> = {};
  typeOrder.forEach((type, ri) => {
    const row = rows[type] || [];
    const colGap = svgW / (row.length + 1);
    row.forEach((n, ci) => {
      positions[n.id] = { x: colGap * (ci + 1), y: rowGap * (ri + 1) };
    });
  });

  return (
    <svg width={svgW} height={svgH} className="shrink-0 rounded" style={{ background: 'var(--bg-graph)', opacity: 0.8 }}>
      {/* Edges */}
      {edges.map((e, i) => {
        const s = positions[e.source];
        const t = positions[e.target];
        if (!s || !t) return null;
        return (
          <line
            key={i}
            x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="var(--border)"
            strokeWidth={0.8}
            opacity={0.5}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map(n => {
        const p = positions[n.id];
        if (!p) return null;
        return (
          <circle
            key={n.id}
            cx={p.x} cy={p.y} r={3}
            fill={typeColors[n.type] || '#64748b'}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

function HistoryCard({
  item,
  onReplay,
  onCompare,
  onDelete,
  isCurrent,
}: {
  key?: string;
  item: HistoryItem;
  onReplay: () => void;
  onCompare: () => void;
  onDelete: () => void;
  isCurrent: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const { t } = useLocale();

  const sentimentIcon = item.meta.sentiments.positive > item.meta.sentiments.negative
    ? <TrendingUp className="w-3 h-3 text-emerald-500" />
    : item.meta.sentiments.negative > item.meta.sentiments.positive
    ? <TrendingDown className="w-3 h-3 text-red-500" />
    : <Activity className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group relative rounded-xl p-3 transition-all cursor-pointer"
      style={{
        background: isCurrent ? 'var(--accent-soft)' : 'var(--bg-input)',
        border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onReplay}
    >
      <div className="flex gap-3">
        {/* Mini graph preview */}
        <MiniGraphPreview item={item} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="w-3 h-3 text-red-500 shrink-0" />
            <span
              className="text-[12px] font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
              title={item.eventTitle}
            >
              {item.eventTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {getRelativeTime(item.timestamp)}
            </span>
            <span>{item.meta.nodeCount} {t('history.nodes')}</span>
            <span className="flex items-center gap-0.5">{sentimentIcon}</span>
            {item.source === 'stockpulse' && (
              <span className="text-[8px] px-1 py-[1px] rounded bg-blue-500/10 text-blue-500 font-medium">SP</span>
            )}
          </div>

          {/* Assets tags */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.meta.assets.slice(0, 4).map(a => (
              <span
                key={a}
                className="text-[9px] px-1.5 py-[1px] rounded font-medium"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {a}
              </span>
            ))}
            {item.meta.assets.length > 4 && (
              <span className="text-[9px] px-1" style={{ color: 'var(--text-muted)' }}>
                +{item.meta.assets.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovering && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-2 right-2 flex gap-1"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              title={t('header.compare.title')}
            >
              <GitCompare className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              title={t('history.delete')}
            >
              <Trash2 className="w-3 h-3" style={{ color: 'var(--danger)' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current indicator */}
      {isCurrent && (
        <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {t('history.current')}
        </div>
      )}
    </motion.div>
  );
}

export function HistoryDrawer({
  isOpen, onClose, items, onReplay, onCompare, onHistoryChange, currentHotspot,
}: HistoryDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const { t } = useLocale();

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(i =>
      i.hotspot.toLowerCase().includes(term) ||
      i.eventTitle.toLowerCase().includes(term) ||
      i.meta.assets.some(a => a.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const handleDelete = (id: string) => {
    deleteHistoryItem(id);
    onHistoryChange();
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearHistory();
    onHistoryChange();
    setConfirmClear(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -380 }}
            animate={{ x: 0 }}
            exit={{ x: -380 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[360px] flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-soft)' }}
                >
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {t('history.title')}
                  </span>
                  <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                    {items.length}/50
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg transition-colors text-[10px] px-2 font-medium"
                    style={{
                      color: confirmClear ? '#fff' : 'var(--danger)',
                      background: confirmClear ? 'var(--danger)' : 'transparent',
                    }}
                  >
                    {confirmClear ? t('history.clearConfirm') : t('history.clearAll')}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            {items.length > 3 && (
              <div className="px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={t('history.search')}
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 min-h-0">
              {filtered.length === 0 && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <RotateCcw className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('history.empty')}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                    {t('history.empty.hint')}
                  </p>
                </div>
              )}

              {filtered.length === 0 && items.length > 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('history.noMatch')} - "{searchTerm}"
                  </p>
                </div>
              )}

              {filtered.map(item => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onReplay={() => { onReplay(item); onClose(); }}
                  onCompare={() => { onCompare(item); onClose(); }}
                  onDelete={() => handleDelete(item.id)}
                  isCurrent={item.hotspot === currentHotspot}
                />
              ))}
            </div>

            {/* Footer hint */}
            {items.length > 0 && (
              <div
                className="px-4 py-2 text-[10px] text-center shrink-0"
                style={{ borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)' }}
              >
                {t('history.footer')}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
