import React, { useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { SimulationData } from '../services/llm';
import { TrendingDown, TrendingUp, Minus, Zap, Activity, Globe } from 'lucide-react';
import { useTheme } from '../theme';

const typeOrder = ['hotspot', 'variable', 'impact', 'asset'];

const typeLabels: Record<string, string> = {
  hotspot: '热点事件',
  variable: '关键变量',
  impact: '传导效应',
  asset: '受影标的',
};

function getIcon(type: string, sentiment?: string) {
  if (type === 'hotspot') return <Globe className="w-4 h-4 text-red-500" />;
  if (type === 'variable') return <Zap className="w-4 h-4 text-amber-500" />;
  if (type === 'impact') return <Activity className="w-4 h-4 text-orange-500" />;
  if (sentiment === 'positive') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (sentiment === 'negative') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />;
}

function getNodeStyle(type: string, sentiment?: string) {
  const map: Record<string, { bg: string; border: string; iconBg: string }> = {
    hotspot:  { bg: 'var(--node-hotspot-bg)',  border: 'var(--node-hotspot-border)',  iconBg: 'rgba(239,68,68,0.15)' },
    variable: { bg: 'var(--node-variable-bg)',  border: 'var(--node-variable-border)', iconBg: 'rgba(245,158,11,0.15)' },
    impact:   { bg: 'var(--node-impact-bg)',    border: 'var(--node-impact-border)',   iconBg: 'rgba(249,115,22,0.15)' },
    asset:    { bg: 'var(--node-asset-bg)',      border: 'var(--node-asset-border)',    iconBg: 'rgba(100,116,139,0.15)' },
  };
  let style = map[type] || map.asset;
  if (type === 'asset' && sentiment === 'positive') {
    style = { bg: 'var(--node-positive-bg)', border: 'var(--node-positive-border)', iconBg: 'rgba(34,197,94,0.15)' };
  } else if (type === 'asset' && sentiment === 'negative') {
    style = { bg: 'var(--node-negative-bg)', border: 'var(--node-negative-border)', iconBg: 'rgba(239,68,68,0.15)' };
  }
  return style;
}

const CustomNode = ({ data }: NodeProps) => {
  const { label, type, sentiment, phase, nodePhase, detail, quote } = data;
  const typeLabel = typeLabels[type] || type;
  const style = getNodeStyle(type, sentiment);
  const visible = phase >= nodePhase;
  const appearing = phase === nodePhase;

  return (
    <div
      className={`group relative px-4 py-3 rounded-xl flex items-center gap-3
        min-w-[160px] max-w-[260px]
        transition-all duration-700 ease-out
        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
        ${appearing ? 'ring-1 ring-blue-500/20' : ''}
      `}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-transparent !border-0 !opacity-0" />
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: style.iconBg }}>
        {getIcon(type, sentiment)}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--node-label)', opacity: 0.6 }}>
          {typeLabel}
        </span>
        <span className="text-[13px] font-medium leading-tight mt-0.5 break-words" style={{ color: 'var(--node-text)' }}>
          {label}
        </span>
      </div>
      {/* Real-time quote badge for asset nodes */}
      {quote && type === 'asset' && (
        <div className="flex flex-col items-end shrink-0 ml-1">
          <span className="metric-value text-[11px]" style={{ color: 'var(--node-text)' }}>
            {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`metric-delta ${quote.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}%
          </span>
        </div>
      )}
      {detail && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed max-w-[280px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
          style={{
            background: 'var(--tooltip-bg)',
            border: `1px solid ${('var(--tooltip-border)')}`,
            color: 'var(--tooltip-text)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {detail}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-transparent !border-0 !opacity-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };
const NODE_W = 200;
const NODE_H = 56;

function layoutElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 50, marginx: 40, marginy: 40 });
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

interface LiveGraphProps {
  data: SimulationData;
  animate?: boolean;
  assetQuotes?: Map<string, any>;
}

export function LiveGraph({ data, animate = false, assetQuotes }: LiveGraphProps) {
  const { isDark } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [phase, setPhase] = useState(animate ? -1 : 4);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (animate) {
      setPhase(-1);
      const timers = [
        setTimeout(() => setPhase(0), 300),
        setTimeout(() => setPhase(1), 800),
        setTimeout(() => setPhase(2), 1400),
        setTimeout(() => setPhase(3), 2000),
        setTimeout(() => setPhase(4), 2600),
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      setPhase(4);
    }
  }, [data, animate]);

  useEffect(() => {
    const nodePhaseMap: Record<string, number> = {};
    data.nodes.forEach(n => {
      nodePhaseMap[n.id] = typeOrder.indexOf(n.type);
      if (nodePhaseMap[n.id] === -1) nodePhaseMap[n.id] = 3;
    });

    const edgeLabelBg = isDark ? '#0f172a' : '#ffffff';
    const edgeLabelColor = isDark ? '#94a3b8' : '#64748b';

    const initialNodes: Node[] = data.nodes.map(n => ({
      id: n.id,
      type: 'custom',
      data: {
        label: n.label,
        type: n.type,
        sentiment: n.sentiment,
        detail: n.detail,
        quote: n.type === 'asset' && assetQuotes?.get(n.label) || undefined,
        phase: phaseRef.current,
        nodePhase: nodePhaseMap[n.id],
      },
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = data.edges.map((e, i) => {
      let strokeWidth = 1.5;
      let strokeColor = isDark ? '#334155' : '#cbd5e1';
      let animated = false;
      if (e.weight === 'critical') { strokeWidth = 2.5; strokeColor = '#ef4444'; animated = true; }
      else if (e.weight === 'high') { strokeWidth = 2; strokeColor = '#f59e0b'; }
      else if (e.weight === 'medium') { strokeWidth = 1.5; strokeColor = isDark ? '#475569' : '#94a3b8'; }

      const sourcePhase = nodePhaseMap[e.source] ?? 0;
      const targetPhase = nodePhaseMap[e.target] ?? 0;
      const edgePhase = Math.max(sourcePhase, targetPhase);

      return {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated,
        hidden: phaseRef.current < edgePhase,
        style: { strokeWidth, stroke: strokeColor, opacity: phaseRef.current >= edgePhase ? 1 : 0, transition: 'opacity 0.6s ease' },
        labelStyle: { fill: edgeLabelColor, fontSize: 10, fontWeight: 600, opacity: phaseRef.current >= edgePhase ? 1 : 0 },
        labelBgStyle: { fill: edgeLabelBg, fillOpacity: 0.9, rx: 5, ry: 5 },
        labelBgPadding: [5, 3] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor, width: 12, height: 12 },
      };
    });

    const laid = layoutElements(initialNodes, initialEdges);
    setNodes(laid);
    setEdges(initialEdges);
  }, [data, setNodes, setEdges, isDark, assetQuotes]);

  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, phase },
    })));
    setEdges(eds => eds.map(e => {
      const sourceNode = data.nodes.find(n => n.id === e.source);
      const targetNode = data.nodes.find(n => n.id === e.target);
      const sourcePhase = sourceNode ? typeOrder.indexOf(sourceNode.type) : 0;
      const targetPhase = targetNode ? typeOrder.indexOf(targetNode.type) : 0;
      const edgePhase = Math.max(sourcePhase, targetPhase);
      const visible = phase >= edgePhase;
      return {
        ...e,
        hidden: !visible,
        style: { ...e.style, opacity: visible ? 1 : 0 },
        labelStyle: { ...(e.labelStyle as any), opacity: visible ? 1 : 0 },
      };
    }));
  }, [phase]);

  const graphDotColor = isDark ? '#1a1f3a' : '#e2e8f0';

  return (
    <div className="w-full h-full" style={{ background: 'var(--bg-graph)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, duration: 600 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={graphDotColor} gap={32} size={1} />
        <Controls
          position="bottom-right"
          className={isDark
            ? '!bg-slate-900/80 !border-slate-700/50 !rounded-lg !shadow-lg [&>button]:!bg-slate-900 [&>button]:!border-slate-700/50 [&>button]:!fill-slate-400 [&>button:hover]:!bg-slate-800 [&>button:hover]:!fill-slate-200'
            : '!bg-white/90 !border-slate-200 !rounded-lg !shadow-md [&>button]:!bg-white [&>button]:!border-slate-200 [&>button]:!fill-slate-500 [&>button:hover]:!bg-slate-50 [&>button:hover]:!fill-slate-700'
          }
        />
      </ReactFlow>
    </div>
  );
}
