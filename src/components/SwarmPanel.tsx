import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Users, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { SwarmResult, AgentView, ANALYST_AGENTS } from '../services/swarm';

interface SwarmPanelProps {
  swarm: SwarmResult | null;
  loading: boolean;
}

const DEPTH_LABELS = {
  initial: { text: '独立分析', color: 'var(--text-muted)' },
  debated: { text: '辩论完成', color: 'var(--warning)' },
  reflected: { text: '反思修正', color: 'var(--success)' },
};

export function SwarmPanel({ swarm, loading }: SwarmPanelProps) {
  if (loading && !swarm) {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            多视角分析中...
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ANALYST_AGENTS.map(a => (
            <div key={a.id} className="rounded-lg p-3 animate-pulse" style={{ background: 'var(--bg-input)' }}>
              <div className="text-center">
                <span className="text-lg">{a.emoji}</span>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{a.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!swarm || swarm.views.length === 0) return null;

  const bullCount = swarm.views.filter(v => v.direction === 'bullish').length;
  const bearCount = swarm.views.filter(v => v.direction === 'bearish').length;
  const depthInfo = DEPTH_LABELS[swarm.depth || 'initial'];
  const isStillProcessing = swarm.depth !== 'reflected' && loading;

  return (
    <div className="px-5 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            多视角 Agent 分析
          </span>
          {/* Depth badge */}
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'var(--bg-input)', color: depthInfo.color }}
          >
            {isStillProcessing && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {depthInfo.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-emerald-500 font-bold">{bullCount}</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-input)' }}>
              <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${(bullCount / swarm.views.length) * 100}%` }} />
              <div className="h-full bg-red-500 rounded-r-full transition-all" style={{ width: `${(bearCount / swarm.views.length) * 100}%`, marginLeft: 'auto' }} />
            </div>
            <span className="text-red-500 font-bold">{bearCount}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{
              background: swarm.confidenceScore > 70 ? 'var(--success-soft)' : swarm.confidenceScore > 40 ? 'var(--warning-soft)' : 'var(--danger-soft)',
              color: swarm.confidenceScore > 70 ? 'var(--success)' : swarm.confidenceScore > 40 ? 'var(--warning)' : 'var(--danger)',
            }}
          >
            {swarm.confidenceScore}%
          </span>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-4 gap-2">
        {swarm.views.map((view, i) => {
          const agent = ANALYST_AGENTS.find(a => a.id === view.agentId);
          if (!agent) return null;
          return (
            <motion.div
              key={view.agentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="rounded-lg p-2.5 group relative"
              style={{ background: 'var(--bg-input)', border: `1px solid ${agent.color}30` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-base">{agent.emoji}</span>
                {view.direction === 'bullish' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : view.direction === 'bearish' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <p className="text-[10px] font-semibold mb-1" style={{ color: agent.color }}>{agent.name}</p>
              <p className="text-[10.5px] leading-[1.5] line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                {view.oneLiner}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${view.confidence}%`, background: agent.color }} />
                </div>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{view.confidence}%</span>
              </div>

              {/* Hover tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', boxShadow: 'var(--shadow-lg)' }}
              >
                <p className="text-[11px] font-semibold mb-1" style={{ color: agent.color }}>{agent.name}</p>
                <p className="text-[10.5px] leading-[1.6] mb-2" style={{ color: 'var(--text-primary)' }}>{view.reasoning}</p>
                <div className="space-y-1 text-[10px]">
                  <p style={{ color: 'var(--text-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--warning)' }}>风险：</span>{view.keyRisk}
                  </p>
                  <p style={{ color: 'var(--text-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--success)' }}>操作：</span>{view.topPick}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Debate section — BettaFish innovation */}
      {swarm.debate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg p-3 space-y-2"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              投委会辩论
            </span>
            {swarm.depth === 'reflected' && (
              <span className="text-[9px] flex items-center gap-0.5 ml-auto" style={{ color: 'var(--success)' }}>
                <RefreshCw className="w-2.5 h-2.5" />
                已反思修正
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-[11px] leading-[1.6]">
            <p style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--warning)' }}>矛盾点：</span>
              {swarm.debate.contradictions}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--danger)' }}>盲区：</span>
              {swarm.debate.blindSpots}
            </p>
            <p className="rounded px-2 py-1.5" style={{ background: 'var(--accent-soft)', color: 'var(--text-primary)' }}>
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>追问：</span>
              {swarm.debate.probingQuestion}
            </p>
          </div>
        </motion.div>
      )}

      {/* Consensus + Risk */}
      <div className="flex gap-2 text-[11px]">
        <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'var(--accent-soft)' }}>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>共识：</span>
          <span style={{ color: 'var(--text-secondary)' }}>{swarm.consensus}</span>
          {swarm.divergence && swarm.divergence !== '所有分析师观点一致' && (
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--warning)' }}>分歧：</span>{swarm.divergence}
            </p>
          )}
        </div>
      </div>

      {swarm.riskAlert && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <span className="font-semibold text-red-500">风控警示：</span>
            <span style={{ color: 'var(--text-secondary)' }}>{swarm.riskAlert}</span>
          </div>
        </div>
      )}
    </div>
  );
}
