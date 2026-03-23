import React, { useState } from 'react';
import { Play, Plus, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { EventBrowser } from './EventBrowser';
import { ProbabilityComparison } from './ProbabilityComparison';
import { PolymarketEvent, PolymarketMarket } from '../services/polymarket';
import { Variable } from '../services/llm';

interface EventPanelProps {
  hotspot: string;
  setHotspot: (val: string) => void;
  variables: Variable[];
  setVariables: (val: Variable[]) => void;
  targetAssets: string;
  setTargetAssets: (val: string) => void;
  scenarios: { name: string; probability: number; marketProb?: number }[];
  onRun: (autoMode: boolean) => void;
  loading: boolean;
  onSelectEvent: (event: PolymarketEvent, market: PolymarketMarket) => void;
  selectedMarketId?: string;
  isOpen: boolean;
}

export function EventPanel({
  hotspot, setHotspot, variables, setVariables,
  targetAssets, setTargetAssets, scenarios, onRun,
  loading, onSelectEvent, selectedMarketId, isOpen,
}: EventPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addVariable = () => {
    setVariables([...variables, { id: crypto.randomUUID(), name: '', value: '' }]);
  };

  const updateVariable = (id: string, field: 'name' | 'value', val: string) => {
    setVariables(variables.map(v => v.id === id ? { ...v, [field]: val } : v));
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 bg-[#0d1220] border-r border-slate-800/80 flex flex-col h-full z-20 shrink-0">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

        {/* Events */}
        <div className="p-4">
          <EventBrowser onSelectEvent={onSelectEvent} selectedMarketId={selectedMarketId} />
        </div>

        <div className="border-t border-slate-800/50" />

        {/* Hotspot input */}
        <div className="p-4 space-y-3">
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">事件描述</h2>
          <textarea
            value={hotspot}
            onChange={(e) => setHotspot(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all resize-none h-16 placeholder-slate-600"
            placeholder="选择上方事件，或直接输入..."
          />

          {/* One-click analysis button */}
          <button
            onClick={() => onRun(true)}
            disabled={loading || !hotspot.trim()}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-900/20 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? '分析中...' : '一键分析'}
          </button>
        </div>

        <div className="border-t border-slate-800/50" />

        {/* Advanced options (collapsible) */}
        <div className="p-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-400 transition-colors"
          >
            <span>高级选项</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4">
              {/* Target Assets */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">指定标的（留空则 AI 自动推荐）</label>
                <textarea
                  value={targetAssets}
                  onChange={(e) => setTargetAssets(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-red-500/40 transition-all resize-none h-12 placeholder-slate-600"
                  placeholder="半导体, 军工, 黄金, 原油..."
                />
              </div>

              {/* Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">自定义变量</label>
                  <button onClick={addVariable} className="text-red-400/60 hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {variables.map((v) => (
                    <div key={v.id} className="flex gap-1.5 items-center group">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateVariable(v.id, 'name', e.target.value)}
                        className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-[11px] text-amber-400 focus:outline-none focus:border-red-500/40 placeholder-slate-600"
                        placeholder="变量名"
                      />
                      <input
                        type="text"
                        value={v.value}
                        onChange={(e) => updateVariable(v.id, 'value', e.target.value)}
                        className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-red-500/40 placeholder-slate-600"
                        placeholder="值"
                      />
                      <button
                        onClick={() => removeVariable(v.id)}
                        className="text-slate-700 hover:text-red-400 transition-colors p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom run */}
              <button
                onClick={() => onRun(false)}
                disabled={loading || !hotspot.trim()}
                className="w-full border border-slate-700 hover:border-red-500/30 text-slate-300 hover:text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 text-xs"
              >
                <Play className="w-3.5 h-3.5" />
                自定义推演
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/50" />

        {/* Probability Comparison */}
        <div className="p-4">
          <ProbabilityComparison scenarios={scenarios} />
        </div>
      </div>
    </aside>
  );
}
