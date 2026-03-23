import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Target, ChevronDown, ChevronUp, Lightbulb, Scale, LineChart } from 'lucide-react';

interface SummaryPanelProps {
  summary: string;
  actions: string[];
  divergenceAnalysis?: string;
  hasMarketData: boolean;
  showTrend: boolean;
  onToggleTrend: () => void;
  hasTrendData: boolean;
}

export function SummaryPanel({ summary, actions, divergenceAnalysis, hasMarketData, showTrend, onToggleTrend, hasTrendData }: SummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summary && actions.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="absolute bottom-3 left-3 right-3 bg-[#0d1220]/95 backdrop-blur-xl border border-slate-700/40 rounded-xl shadow-2xl shadow-black/50 z-20 flex flex-col overflow-hidden"
    >
      <div
        className={`px-5 py-2.5 flex justify-between items-center cursor-pointer hover:bg-slate-800/30 transition-colors ${isExpanded ? 'border-b border-slate-700/30' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            推演结论
            {hasMarketData && <span className="text-slate-600 font-normal ml-1.5">· 已融合市场</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasTrendData && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTrend(); }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                showTrend ? 'bg-red-500/10 text-red-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LineChart className="w-3 h-3" />
              趋势
            </button>
          )}
          <button className="text-slate-600 hover:text-slate-300 transition-colors">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-5">
                {/* Summary */}
                <div className="flex-1 space-y-2 md:border-r border-slate-700/30 md:pr-5">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400/60" />
                    场景判断
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
                </div>

                {/* Actions */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-red-400/60" />
                    操作建议
                  </h3>
                  <ul className="space-y-1.5">
                    {actions.map((action, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-red-500/60 mt-0.5 shrink-0 text-xs">{idx + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Divergence */}
              {divergenceAnalysis && hasMarketData && (
                <div className="border-t border-slate-700/30 pt-3 space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-blue-400/60" />
                    AI vs 市场分歧
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                    {divergenceAnalysis}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
