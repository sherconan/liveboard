import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, GitCompare, Layers, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from 'recharts';
import { HistoryItem } from '../services/historyStore';
import { LiveGraph } from './LiveGraph';
import { SimulationData } from '../services/llm';
import { useLocale } from '../i18n';

interface CompareModeProps {
  isOpen: boolean;
  onClose: () => void;
  leftItem: HistoryItem | null;
  rightItem: HistoryItem | null;
  allItems: HistoryItem[];
  currentData: SimulationData | null;
  currentHotspot: string;
  onSelectLeft: (item: HistoryItem) => void;
  onSelectRight: (item: HistoryItem) => void;
}

function ItemSelector({
  label,
  selected,
  items,
  currentData,
  currentHotspot,
  onSelect,
  side,
}: {
  label: string;
  selected: HistoryItem | null;
  items: HistoryItem[];
  currentData: SimulationData | null;
  currentHotspot: string;
  onSelect: (item: HistoryItem) => void;
  side: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const { t, locale } = useLocale();
  const displayName = selected?.eventTitle || t('compare.select');

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors max-w-[260px]"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: side === 'left' ? '#3b82f620' : '#8b5cf620', color: side === 'left' ? '#3b82f6' : '#8b5cf6' }}
        >
          {label}
        </span>
        <span className="truncate">{displayName}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-1 w-72 rounded-xl z-50 overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
                [side === 'right' ? 'right' : 'left']: 0,
              }}
            >
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {/* Current analysis option */}
                {currentData && currentData.nodes.length > 0 && (
                  <button
                    onClick={() => {
                      onSelect({
                        id: '__current__',
                        timestamp: Date.now(),
                        hotspot: currentHotspot,
                        eventTitle: `[${t('history.current')}] ${currentHotspot}`,
                        data: currentData,
                        meta: {
                          nodeCount: currentData.nodes.length,
                          edgeCount: currentData.edges.length,
                          scenarioCount: currentData.scenarios.length,
                          sectors: currentData.nodes.filter(n => n.type === 'impact').map(n => n.label),
                          assets: currentData.nodes.filter(n => n.type === 'asset').map(n => n.label),
                          sentiments: { positive: 0, negative: 0, neutral: 0 },
                          chainDepth: 4,
                        },
                      });
                      setOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 transition-colors text-xs"
                    style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--accent-soft)' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--accent)' }}>{t('compare.currentAnalysis')}</div>
                    <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {currentHotspot}
                    </div>
                  </button>
                )}
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onSelect(item); setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 transition-colors text-xs"
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      background: selected?.id === item.id ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.eventTitle}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{item.meta.nodeCount} {t('compare.nodes')} · {item.meta.assets.length} {t('compare.assets')}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComparisonTable({ left, right }: { left: HistoryItem; right: HistoryItem }) {
  const { t } = useLocale();
  // Find overlapping sectors/assets
  const rightSectors = new Set(right.meta.sectors);
  const overlapSectors = left.meta.sectors.filter(s => rightSectors.has(s));

  const rightAssets = new Set(right.meta.assets);
  const overlapAssets = left.meta.assets.filter(a => rightAssets.has(a));

  // Determine market direction from sentiments
  const getDirection = (meta: HistoryItem['meta']) => {
    if (meta.sentiments.positive > meta.sentiments.negative) return { label: t('compare.direction.bull'), color: '#22c55e', icon: TrendingUp };
    if (meta.sentiments.negative > meta.sentiments.positive) return { label: t('compare.direction.bear'), color: '#ef4444', icon: TrendingDown };
    return { label: t('compare.direction.neutral'), color: '#94a3b8', icon: Minus };
  };

  const leftDir = getDirection(left.meta);
  const rightDir = getDirection(right.meta);

  const rows = [
    {
      label: t('compare.chainDepth'),
      icon: <Layers className="w-3 h-3" />,
      left: `${left.meta.chainDepth}${t('compare.unit.layer')}`,
      right: `${right.meta.chainDepth}${t('compare.unit.layer')}`,
    },
    {
      label: t('compare.nodeCount'),
      icon: <Target className="w-3 h-3" />,
      left: `${left.meta.nodeCount}${t('compare.unit.count')}`,
      right: `${right.meta.nodeCount}${t('compare.unit.count')}`,
    },
    {
      label: t('compare.assetCount'),
      icon: <Target className="w-3 h-3" />,
      left: `${left.meta.assets.length}${t('compare.unit.count')}`,
      right: `${right.meta.assets.length}${t('compare.unit.count')}`,
    },
    {
      label: t('compare.direction'),
      icon: <TrendingUp className="w-3 h-3" />,
      left: leftDir.label,
      right: rightDir.label,
      leftColor: leftDir.color,
      rightColor: rightDir.color,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Stats table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center text-xs"
            style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none' }}
          >
            <div
              className="w-24 shrink-0 px-3 py-2 flex items-center gap-1.5 font-medium"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-input)' }}
            >
              {row.icon}
              {row.label}
            </div>
            <div
              className="flex-1 px-3 py-2 text-center font-medium"
              style={{ color: (row as any).leftColor || 'var(--text-primary)', borderRight: '1px solid var(--border-light)' }}
            >
              {row.left}
            </div>
            <div
              className="flex-1 px-3 py-2 text-center font-medium"
              style={{ color: (row as any).rightColor || 'var(--text-primary)' }}
            >
              {row.right}
            </div>
          </div>
        ))}
      </div>

      {/* Overlapping sectors */}
      {overlapSectors.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {t('compare.overlapSectors')}
          </div>
          <div className="flex flex-wrap gap-1">
            {overlapSectors.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overlapping assets */}
      {overlapAssets.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {t('compare.overlapAssets')}
          </div>
          <div className="flex flex-wrap gap-1">
            {overlapAssets.map(a => (
              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImpactRadar({ left, right }: { left: HistoryItem; right: HistoryItem }) {
  const { t } = useLocale();
  // Build radar data from both items
  const dimensions = [
    { key: 'nodes', label: t('compare.radar.nodes'), maxScale: 20 },
    { key: 'edges', label: t('compare.radar.edges'), maxScale: 25 },
    { key: 'assets', label: t('compare.radar.assets'), maxScale: 10 },
    { key: 'sectors', label: t('compare.radar.sectors'), maxScale: 8 },
    { key: 'positive', label: t('compare.radar.positive'), maxScale: 8 },
    { key: 'negative', label: t('compare.radar.negative'), maxScale: 8 },
  ];

  const getValue = (item: HistoryItem, key: string): number => {
    switch (key) {
      case 'nodes': return item.meta.nodeCount;
      case 'edges': return item.meta.edgeCount;
      case 'assets': return item.meta.assets.length;
      case 'sectors': return item.meta.sectors.length;
      case 'positive': return item.meta.sentiments.positive;
      case 'negative': return item.meta.sentiments.negative;
      default: return 0;
    }
  };

  const data = dimensions.map(d => ({
    dimension: d.label,
    left: Math.min((getValue(left, d.key) / d.maxScale) * 100, 100),
    right: Math.min((getValue(right, d.key) / d.maxScale) * 100, 100),
  }));

  const leftLabel = left.eventTitle.length > 12 ? left.eventTitle.slice(0, 12) + '...' : left.eventTitle;
  const rightLabel = right.eventTitle.length > 12 ? right.eventTitle.slice(0, 12) + '...' : right.eventTitle;

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid
            stroke="var(--border)"
            strokeOpacity={0.5}
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          />
          <Radar
            name={leftLabel}
            dataKey="left"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            name={rightLabel}
            dataKey="right"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareMode({
  isOpen, onClose,
  leftItem, rightItem,
  allItems,
  currentData, currentHotspot,
  onSelectLeft, onSelectRight,
}: CompareModeProps) {
  const { t } = useLocale();
  if (!isOpen) return null;

  const canCompare = leftItem && rightItem;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Top bar */}
      <div
        className="h-12 flex items-center px-4 gap-3 shrink-0"
        style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <GitCompare className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {t('compare.title')}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <ItemSelector
            label="A"
            selected={leftItem}
            items={allItems}
            currentData={currentData}
            currentHotspot={currentHotspot}
            onSelect={onSelectLeft}
            side="left"
          />
          <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>VS</span>
          <ItemSelector
            label="B"
            selected={rightItem}
            items={allItems}
            currentData={currentData}
            currentHotspot={currentHotspot}
            onSelect={onSelectRight}
            side="right"
          />
        </div>

        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {!canCompare ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <GitCompare className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {t('compare.prompt')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Side-by-side graphs */}
            <div className="flex flex-1 min-h-0">
              {/* Left graph */}
              <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '2px solid var(--accent)' }}>
                <div className="px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 shrink-0"
                  style={{ background: '#3b82f610', color: '#3b82f6', borderBottom: '1px solid var(--border)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  A: {leftItem.eventTitle}
                </div>
                <div className="flex-1 min-h-0">
                  <LiveGraph data={leftItem.data} animate={false} />
                </div>
              </div>

              {/* Right graph */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 shrink-0"
                  style={{ background: '#8b5cf610', color: '#8b5cf6', borderBottom: '1px solid var(--border)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  B: {rightItem.eventTitle}
                </div>
                <div className="flex-1 min-h-0">
                  <LiveGraph data={rightItem.data} animate={false} />
                </div>
              </div>
            </div>

            {/* Comparison panel at bottom */}
            <div
              className="h-[280px] shrink-0 flex overflow-hidden"
              style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-card)' }}
            >
              {/* Radar chart */}
              <div className="w-[340px] shrink-0 p-3" style={{ borderRight: '1px solid var(--border)' }}>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t('compare.radarTitle')}
                </div>
                <ImpactRadar left={leftItem} right={rightItem} />
              </div>

              {/* Comparison details */}
              <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
                <ComparisonTable left={leftItem} right={rightItem} />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
