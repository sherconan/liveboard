import React from 'react';
import { motion } from 'framer-motion';
import { Scale, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProbabilityComparisonProps {
  scenarios: { name: string; probability: number; marketProb?: number }[];
}

export function ProbabilityComparison({ scenarios }: ProbabilityComparisonProps) {
  if (scenarios.length === 0) return null;

  const hasMarketData = scenarios.some(s => s.marketProb !== undefined);

  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
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
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 line-clamp-1 flex-1">{scenario.name}</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 uppercase tracking-wider">AI 推演</span>
                  <span className="font-mono text-red-400 font-semibold">{aiProb}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${aiProb}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${aiProb > 50 ? 'bg-red-500' : aiProb > 20 ? 'bg-amber-500' : 'bg-slate-500'}`}
                  />
                </div>
              </div>

              {hasMkt && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 uppercase tracking-wider">市场共识</span>
                    <span className="font-mono text-blue-400 font-semibold">{(marketProb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${marketProb * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                      className={`h-full rounded-full ${marketProb > 0.5 ? 'bg-blue-500' : marketProb > 0.2 ? 'bg-blue-400' : 'bg-blue-300/50'}`}
                    />
                  </div>
                </div>
              )}

              {hasMkt && (
                <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md ${
                  isSignificant
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800/50 text-slate-500'
                }`}>
                  {isSignificant ? (
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                  ) : divergence > 0 ? (
                    <TrendingUp className="w-3 h-3 shrink-0" />
                  ) : divergence < 0 ? (
                    <TrendingDown className="w-3 h-3 shrink-0" />
                  ) : (
                    <Minus className="w-3 h-3 shrink-0" />
                  )}
                  <span>
                    {absDivergence < 2
                      ? 'AI 与市场一致'
                      : divergence > 0
                        ? `AI 认为被低估 +${divergence.toFixed(0)}%`
                        : `AI 认为被高估 ${divergence.toFixed(0)}%`}
                    {isSignificant && ' ⚡ 显著分歧'}
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
