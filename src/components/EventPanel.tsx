import React, { useState } from 'react';
import { Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Play, Newspaper, TrendingUp } from 'lucide-react';
import { ProbabilityComparison } from './ProbabilityComparison';
import { Variable } from '../services/llm';
import { PolymarketMarket, formatProb } from '../services/polymarket';

interface EventPanelProps {
  hotspot: string;
  setHotspot: (val: string) => void;
  variables: Variable[];
  setVariables: (val: Variable[]) => void;
  targetAssets: string;
  setTargetAssets: (val: string) => void;
  scenarios: { name: string; probability: number; marketProb?: number }[];
  onRun: () => void;
  loading: boolean;
  isOpen: boolean;
  matchedMarkets: PolymarketMarket[];
  onSelectMarket: (m: PolymarketMarket) => void;
  selectedMarketId?: string;
}

const HOT_TOPICS = [
  '美联储6月议息会议释放鹰派信号',
  '英伟达Q2财报大超预期',
  '中东局势再度升级，以色列对伊朗实施打击',
  '欧盟对中国电动车加征关税',
  '日本央行意外加息50bp',
];

export function EventPanel({
  hotspot, setHotspot, variables, setVariables,
  targetAssets, setTargetAssets, scenarios, onRun,
  loading, isOpen, matchedMarkets, onSelectMarket, selectedMarketId,
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

        {/* === PRIMARY: News Event Input === */}
        <div className="p-4 space-y-3">
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-red-400" />
            新闻事件
          </h2>
          <textarea
            value={hotspot}
            onChange={(e) => setHotspot(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all resize-none h-24 placeholder-slate-600 leading-relaxed"
            placeholder="输入事件性质的新闻，例如：&#10;美联储宣布加息25bp&#10;英伟达发布最新财报，营收同比增长122%"
          />

          {/* Quick topic pills */}
          {!hotspot && (
            <div className="flex flex-wrap gap-1.5">
              {HOT_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => setHotspot(topic)}
                  className="text-[10px] px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/30 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors truncate max-w-full"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          {/* Main CTA */}
          <button
            onClick={onRun}
            disabled={loading || !hotspot.trim()}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-900/20 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? '分析中...' : '分析传导链'}
          </button>
        </div>

        <div className="border-t border-slate-800/50" />

        {/* === POLYMARKET: Auto-matched markets (shown after analysis) === */}
        {matchedMarkets.length > 0 && (
          <>
            <div className="p-4 space-y-2.5">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                Polymarket 市场共识
              </h2>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                以下预测市场与本次分析相关，概率基于真金白银的博弈定价
              </p>
              <div className="space-y-1.5">
                {matchedMarkets.map((m) => {
                  const yesIdx = m.outcomes.findIndex(o => o.toLowerCase() === 'yes');
                  const prob = yesIdx >= 0 ? m.outcomePrices[yesIdx] : m.outcomePrices[0];
                  const isSelected = selectedMarketId === m.id;

                  return (
                    <button
                      key={m.id}
                      onClick={() => onSelectMarket(m)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-300 leading-tight line-clamp-2 flex-1">
                          {m.groupItemTitle || m.question}
                        </span>
                        <span className={`font-mono font-bold text-sm shrink-0 ${prob > 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatProb(prob)}
                        </span>
                      </div>
                      {m.oneDayPriceChange !== null && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          24h: <span className={m.oneDayPriceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {m.oneDayPriceChange >= 0 ? '↑' : '↓'}{Math.abs(m.oneDayPriceChange * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-800/50" />
          </>
        )}

        {/* === Probability comparison === */}
        {scenarios.length > 0 && (
          <>
            <div className="p-4">
              <ProbabilityComparison scenarios={scenarios} />
            </div>
            <div className="border-t border-slate-800/50" />
          </>
        )}

        {/* === Advanced options (collapsed) === */}
        <div className="p-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-[11px] font-bold text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
          >
            <span>高级选项</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">指定关注标的（留空 AI 自动判断）</label>
                <textarea
                  value={targetAssets}
                  onChange={(e) => setTargetAssets(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-red-500/40 transition-all resize-none h-12 placeholder-slate-600"
                  placeholder="半导体, 军工, 黄金, 原油..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">自定义变量</label>
                  <button onClick={addVariable} className="text-red-400/60 hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {variables.map((v) => (
                  <div key={v.id} className="flex gap-1.5 items-center">
                    <input type="text" value={v.name} onChange={(e) => updateVariable(v.id, 'name', e.target.value)}
                      className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-[11px] text-amber-400 focus:outline-none placeholder-slate-600" placeholder="变量名" />
                    <input type="text" value={v.value} onChange={(e) => updateVariable(v.id, 'value', e.target.value)}
                      className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none placeholder-slate-600" placeholder="值" />
                    <button onClick={() => removeVariable(v.id)} className="text-slate-700 hover:text-red-400 transition-colors p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
