import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Target, ChevronDown, ChevronUp, Lightbulb, Scale } from 'lucide-react';
import { SwarmResult } from '../services/swarm';
import { SwarmPanel } from './SwarmPanel';

interface SummaryPanelProps {
  summary: string;
  actions: string[];
  divergenceAnalysis?: string;
  hasMarketData: boolean;
  swarmResult: SwarmResult | null;
  swarmLoading: boolean;
}

export function SummaryPanel({ summary, actions, divergenceAnalysis, hasMarketData, swarmResult, swarmLoading }: SummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summary && actions.length === 0) return null;

  const hasSwarm = swarmResult || swarmLoading;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="absolute bottom-3 left-3 right-3 backdrop-blur-xl rounded-xl z-20 flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: isExpanded ? '55vh' : 'auto',
      }}
    >
      <div
        className="px-5 py-2.5 flex justify-between items-center cursor-pointer transition-colors shrink-0"
        style={{ borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            推演结论
            {hasMarketData && <span style={{ color: 'var(--text-muted)' }} className="font-normal ml-1.5">· 已融合市场</span>}
            {hasSwarm && <span style={{ color: 'var(--accent)' }} className="font-normal ml-1.5">· 多Agent分析</span>}
          </span>
        </div>
        <button style={{ color: 'var(--text-muted)' }}>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-y-auto scrollbar-thin"
          >
            {/* Swarm Analysis — the star feature */}
            {hasSwarm && (
              <div style={{ borderBottom: '1px solid var(--border-light)' }}>
                <SwarmPanel swarm={swarmResult} loading={swarmLoading} />
              </div>
            )}

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-5">
                {/* Summary */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500/60" />
                    场景判断
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{summary}</p>
                </div>

                {/* Actions */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Target className="w-3.5 h-3.5 text-blue-500/60" />
                    操作建议
                  </h3>
                  <ul className="space-y-1.5">
                    {actions.map((action, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="text-blue-500/60 mt-0.5 shrink-0 text-xs">{idx + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {divergenceAnalysis && hasMarketData && (
                <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Scale className="w-3.5 h-3.5 text-blue-500/60" />
                    AI vs 市场分歧
                  </h3>
                  <p className="text-xs leading-relaxed rounded-lg p-3"
                    style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
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
