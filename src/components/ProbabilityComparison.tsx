import React from 'react';
import { motion } from 'framer-motion';
import { Scale, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProbabilityComparisonProps {
  scenarios: { name: string; probability: number; rationale?: string; marketProb?: number }[];
}

export function ProbabilityComparison({ scenarios }: ProbabilityComparisonProps) {
  if (scenarios.length === 0) return null;

  const hasMarketData = scenarios.some(s => s.marketProb !== undefined);

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <Scale className="w-4 h-4" />
        {hasMarketData ? '概率对比 · AI vs 市场' : '概率温度计'}
      </h2>
      <div className="space-y-4">
        {scenarios.map((scenario, idx) => {
          const aiProb = scenario.probability;
          const marketProb = scenario.marketProb;
          const hasMkt = marketProb !== undefined;
          const divergence = hasMkt ? aiProb - marketProb * 100 : 0;
          const absDivergence = Math.abs(divergence);
          const isSignificant = absDivergence > 10;

          return (
            <div key={idx} className="space-y-2">
              <div className="text-sm">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{scenario.name}</span>
                {scenario.rationale && (
                  <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{scenario.rationale}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>AI 推演</span>
                  <span className="metric-delta text-blue-500">{aiProb}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${aiProb}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${aiProb > 50 ? 'bg-blue-500' : aiProb > 20 ? 'bg-blue-400' : 'bg-blue-300'}`}
                  />
                </div>
              </div>

              {hasMkt && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>市场共识</span>
                    <span className="metric-delta text-emerald-500">{(marketProb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${marketProb * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>
              )}

              {hasMkt && (
                <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md"
                  style={{
                    background: isSignificant ? 'var(--warning-soft)' : 'var(--bg-input)',
                    color: isSignificant ? 'var(--warning)' : 'var(--text-muted)',
                    border: isSignificant ? '1px solid var(--warning)' : 'none',
                  }}
                >
                  {isSignificant ? <AlertTriangle className="w-3 h-3 shrink-0" /> :
                   divergence > 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> :
                   divergence < 0 ? <TrendingDown className="w-3 h-3 shrink-0" /> :
                   <Minus className="w-3 h-3 shrink-0" />}
                  <span>
                    {absDivergence < 2 ? 'AI 与市场一致' :
                     divergence > 0 ? `AI 认为被低估 +${divergence.toFixed(0)}%` :
                     `AI 认为被高估 ${divergence.toFixed(0)}%`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
