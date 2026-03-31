import { X, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { useLocale } from '../i18n';
import type { BatchState } from '../hooks/useAnalysis';

interface BatchResultsProps {
  batchState: BatchState;
  onSelectTab: (tab: number) => void;
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function BatchResults({ batchState, onSelectTab, onClose }: BatchResultsProps) {
  const { t } = useLocale();

  if (!batchState.active || batchState.results.length === 0) return null;

  const { results, activeTab } = batchState;
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;

  return (
    <div
      className="shrink-0 flex flex-col gap-0"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}
    >
      {/* Header with close */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {t('batch.overview.title')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />
            {successCount}
          </span>
          {failCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <XCircle className="w-2.5 h-2.5 inline mr-0.5" />
              {failCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-thin px-2 py-1.5 gap-1">
        {/* Overview tab */}
        <button
          onClick={() => onSelectTab(-1)}
          className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5"
          style={{
            background: activeTab === -1 ? 'var(--accent)' : 'var(--bg-input)',
            color: activeTab === -1 ? '#fff' : 'var(--text-secondary)',
            border: activeTab === -1 ? '1px solid var(--accent)' : '1px solid transparent',
          }}
        >
          <Layers className="w-3 h-3" />
          {t('batch.tab.overview')}
        </button>

        {/* Individual event tabs */}
        {results.map((result, idx) => {
          const color = COLORS[idx % COLORS.length];
          const isActive = activeTab === idx;
          const isFailed = result.status === 'rejected';
          const label = result.event.length > 16 ? result.event.slice(0, 16) + '...' : result.event;

          return (
            <button
              key={idx}
              onClick={() => !isFailed && onSelectTab(idx)}
              disabled={isFailed}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isActive ? color : 'var(--bg-input)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: isActive ? `1px solid ${color}` : '1px solid transparent',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: isFailed ? '#ef4444' : color }}
              />
              {label}
              {isFailed && <XCircle className="w-3 h-3 text-red-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
