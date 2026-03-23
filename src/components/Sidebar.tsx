import React from 'react';
import { Play, Plus, Trash2, Loader2 } from 'lucide-react';
import { EventBrowser } from './EventBrowser';
import { ProbabilityComparison } from './ProbabilityComparison';
import { PolymarketEvent, PolymarketMarket } from '../services/polymarket';

interface Variable {
  id: string;
  name: string;
  value: string;
}

interface SidebarProps {
  hotspot: string;
  setHotspot: (val: string) => void;
  variables: Variable[];
  setVariables: (val: Variable[]) => void;
  targetAssets: string;
  setTargetAssets: (val: string) => void;
  scenarios: { name: string; probability: number; marketProb?: number }[];
  onRun: () => void;
  loading: boolean;
  onSelectEvent: (event: PolymarketEvent, market: PolymarketMarket) => void;
  selectedMarketId?: string;
}

export function Sidebar({
  hotspot, setHotspot, variables, setVariables,
  targetAssets, setTargetAssets, scenarios, onRun,
  loading, onSelectEvent, selectedMarketId,
}: SidebarProps) {
  const addVariable = () => {
    setVariables([...variables, { id: crypto.randomUUID(), name: '新变量', value: '变量值' }]);
  };

  const updateVariable = (id: string, field: 'name' | 'value', val: string) => {
    setVariables(variables.map(v => v.id === id ? { ...v, [field]: val } : v));
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  return (
    <aside className="w-96 bg-[#0d1220] border-r border-slate-800 flex flex-col h-full z-20">
      <div className="p-5 flex-1 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

        <EventBrowser onSelectEvent={onSelectEvent} selectedMarketId={selectedMarketId} />

        <div className="border-t border-slate-800 pt-5">
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">热点事件</h2>
            <textarea
              value={hotspot}
              onChange={(e) => setHotspot(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all resize-none h-20 placeholder-slate-600"
              placeholder="从上方选择事件，或手动输入..."
            />
          </section>
        </div>

        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">影响标的</h2>
          <textarea
            value={targetAssets}
            onChange={(e) => setTargetAssets(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all resize-none h-16 placeholder-slate-600"
            placeholder="例如：半导体板块, 军工, 黄金..."
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">变量实验室</h2>
            <button onClick={addVariable} className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {variables.map((v) => (
              <div key={v.id} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 group relative hover:border-slate-600 transition-colors">
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => updateVariable(v.id, 'name', e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-amber-400 focus:outline-none mb-1.5 placeholder-slate-600"
                  placeholder="变量名称"
                />
                <input
                  type="text"
                  value={v.value}
                  onChange={(e) => updateVariable(v.id, 'value', e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-300 focus:outline-none placeholder-slate-600"
                  placeholder="变量值"
                />
                <button
                  onClick={() => removeVariable(v.id)}
                  className="absolute top-2.5 right-2.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <ProbabilityComparison scenarios={scenarios} />
      </div>

      <div className="p-5 border-t border-slate-800">
        <button
          onClick={onRun}
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          {loading ? '推演中...' : '运行推演'}
        </button>
      </div>
    </aside>
  );
}
