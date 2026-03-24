import React from 'react';
import { Activity, PanelLeftClose, PanelLeft, Clock, Download, ChevronDown, Sun, Moon } from 'lucide-react';
import { Analysis } from '../services/llm';
import { useTheme } from '../theme';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  loading: boolean;
  loadingStep: string;
  analyses: Analysis[];
  currentIndex: number;
  onSelectAnalysis: (index: number) => void;
  onExport: () => void;
}

export function Header({
  sidebarOpen, setSidebarOpen,
  loading, loadingStep,
  analyses, currentIndex,
  onSelectAnalysis, onExport,
}: HeaderProps) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const { theme, toggle, isDark } = useTheme();

  return (
    <header
      className="h-12 flex items-center px-4 gap-3 z-30 select-none shrink-0"
      style={{
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
          LiveBoard
        </span>
        <span className="text-[10px] font-medium hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
          Real-time Decision Engine
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 ml-4">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-blue-500">{loadingStep || '分析中...'}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={isDark ? '切换亮色模式' : '切换暗色模式'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {analyses.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>历史 ({analyses.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </button>

          {historyOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-72 rounded-xl z-50 overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="max-h-64 overflow-y-auto">
                  {analyses.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => { onSelectAnalysis(i); setHistoryOpen(false); }}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        background: i === currentIndex ? 'var(--accent-soft)' : 'transparent',
                        borderLeft: i === currentIndex ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (i !== currentIndex) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.hotspot}</div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{a.data.scenarios.length} 场景{' · '}{a.data.nodes.length} 节点
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={onExport}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title="导出分析"
      >
        <Download className="w-4 h-4" />
      </button>
    </header>
  );
}
