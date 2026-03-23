import React from 'react';
import { Activity, PanelLeftClose, PanelLeft, Clock, Download, ChevronDown } from 'lucide-react';
import { Analysis } from '../services/llm';

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

  return (
    <header className="h-12 border-b border-slate-800/80 flex items-center px-4 gap-3 bg-[#0a0e1a]/95 backdrop-blur-md z-30 select-none">
      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/20">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm text-slate-100 tracking-tight">LiveBoard</span>
        <span className="text-[10px] text-slate-600 font-medium hidden sm:inline">× Polymarket</span>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 ml-4">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-amber-400/80">{loadingStep || '分析中...'}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* History dropdown */}
      {analyses.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>历史 ({analyses.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </button>

          {historyOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#131830] border border-slate-700/50 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {analyses.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => { onSelectAnalysis(i); setHistoryOpen(false); }}
                      className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${i === currentIndex ? 'bg-red-500/5 border-l-2 border-l-red-500' : ''}`}
                    >
                      <div className="text-xs font-medium text-slate-300 truncate">{a.hotspot}</div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {a.data.scenarios.length} 场景
                        {' · '}
                        {a.data.nodes.length} 节点
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Export */}
      <button
        onClick={onExport}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
        title="导出分析"
      >
        <Download className="w-4 h-4" />
      </button>
    </header>
  );
}
