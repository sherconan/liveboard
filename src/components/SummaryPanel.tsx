import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Target, ChevronDown, ChevronUp, Lightbulb, Scale } from 'lucide-react';

interface SummaryPanelProps {
  summary: string;
  actions: string[];
  divergenceAnalysis?: string;
  hasMarketData: boolean;
}

export function SummaryPanel({ summary, actions, divergenceAnalysis, hasMarketData }: SummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-5xl bg-[#0d1220]/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 z-20 flex flex-col overflow-hidden"
    >
      <div
        className={`px-6 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition-colors ${isExpanded ? 'border-b border-slate-700/50' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">
            AI 推演结论与建议
            {hasMarketData && <span className="text-xs text-slate-500 font-normal ml-2">· 已融合市场数据</span>}
          </span>
        </div>
        <button className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-700/50">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3 md:border-r border-slate-700/50 md:pr-6">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    场景总结
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
                </div>

                <div className="flex-1 md:pl-2 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-red-400" />
                    核心动作
                  </h3>
                  <ul className="space-y-2">
                    {actions.map((action, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {divergenceAnalysis && hasMarketData && (
                <div className="border-t border-slate-700/50 pt-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-400" />
                    AI vs 市场共识 · 分歧分析
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
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
