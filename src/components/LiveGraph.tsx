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
import { AlertCircle, TrendingDown, TrendingUp, Minus, Zap, Activity, Globe } from 'lucide-react';

const typeOrder = ['hotspot', 'variable', 'impact', 'asset'];

const typeLabels: Record<string, string> = {
  hotspot: '热点事件',
  variable: '关键变量',
  impact: '传导效应',
  asset: '受影标的',
};

const typeStyles: Record<string, { bg: string; border: string; glow: string; iconBg: string }> = {
  hotspot:  { bg: 'bg-red-950/70',   border: 'border-red-500/40',   glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]', iconBg: 'bg-red-500/20' },
  variable: { bg: 'bg-amber-950/70',  border: 'border-amber-500/40', glow: '', iconBg: 'bg-amber-500/20' },
  impact:   { bg: 'bg-orange-950/70', border: 'border-orange-500/40',glow: '', iconBg: 'bg-orange-500/20' },
  asset:    { bg: 'bg-slate-800/80',  border: 'border-slate-600/40', glow: '', iconBg: 'bg-slate-600/30' },
};

const sentimentStyle: Record<string, { bg: string; border: string; iconBg: string }> = {
  positive: { bg: 'bg-emerald-950/70', border: 'border-emerald-500/40', iconBg: 'bg-emerald-500/20' },
  negative: { bg: 'bg-red-950/70',     border: 'border-red-500/40',     iconBg: 'bg-red-500/20' },
  neutral:  { bg: 'bg-slate-800/80',   border: 'border-slate-600/40',   iconBg: 'bg-slate-600/30' },
};

function getIcon(type: string, sentiment?: string) {
  if (type === 'hotspot') return <Globe className="w-4 h-4 text-red-400" />;
  if (type === 'variable') return <Zap className="w-4 h-4 text-amber-400" />;
  if (type === 'impact') return <Activity className="w-4 h-4 text-orange-400" />;
  if (sentiment === 'positive') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (sentiment === 'negative') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

const CustomNode = ({ data }: NodeProps) => {
  const { label, type, sentiment, phase, nodePhase, detail } = data;
  const typeLabel = typeLabels[type] || type;

  let style = typeStyles[type] || typeStyles.asset;
  if (type === 'asset' && sentiment) {
    const ss = sentimentStyle[sentiment] || sentimentStyle.neutral;
    style = { ...style, ...ss };
  }

  const visible = phase >= nodePhase;
  const appearing = phase === nodePhase;

  return (
    <div
      className={`
        group relative px-4 py-3 rounded-xl border backdrop-blur-md flex items-center gap-3
        min-w-[160px] max-w-[240px]
        ${style.bg} ${style.border} ${style.glow}
        transition-all duration-700 ease-out
        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
        ${appearing ? 'ring-1 ring-white/10' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-500 !border-0 !opacity-0" />
      <div className={`p-1.5 rounded-lg shrink-0 ${style.iconBg}`}>
        {getIcon(type, sentiment)}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold text-slate-300">{typeLabel}</span>
        <span className="text-[13px] font-medium leading-tight mt-0.5 text-slate-100 break-words">{label}</span>
      </div>
      {/* Tooltip on hover */}
      {detail && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 leading-relaxed max-w-[280px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
          {detail}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-500 !border-0 !opacity-0" />
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
}

export function LiveGraph({ data, animate = false }: LiveGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [phase, setPhase] = useState(animate ? -1 : 4);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Reset phase when data changes
  useEffect(() => {
    if (animate) {
      setPhase(-1);
      // Start animation sequence
      const timers = [
        setTimeout(() => setPhase(0), 300),   // hotspots
        setTimeout(() => setPhase(1), 800),   // variables
        setTimeout(() => setPhase(2), 1400),  // impacts
        setTimeout(() => setPhase(3), 2000),  // assets
        setTimeout(() => setPhase(4), 2600),  // all edges visible
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

    const initialNodes: Node[] = data.nodes.map(n => ({
      id: n.id,
      type: 'custom',
      data: {
        label: n.label,
        type: n.type,
        sentiment: n.sentiment,
        detail: n.detail,
        phase: phaseRef.current,
        nodePhase: nodePhaseMap[n.id],
      },
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = data.edges.map((e, i) => {
      let strokeWidth = 1.5;
      let strokeColor = '#334155';
      let animated = false;
      if (e.weight === 'critical') { strokeWidth = 2.5; strokeColor = '#ef4444'; animated = true; }
      else if (e.weight === 'high') { strokeWidth = 2; strokeColor = '#f59e0b'; }
      else if (e.weight === 'medium') { strokeWidth = 1.5; strokeColor = '#475569'; }

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
        labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600, opacity: phaseRef.current >= edgePhase ? 1 : 0 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85, rx: 5, ry: 5 },
        labelBgPadding: [5, 3] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor, width: 12, height: 12 },
      };
    });

    const laid = layoutElements(initialNodes, initialEdges);
    setNodes(laid);
    setEdges(initialEdges);
  }, [data, setNodes, setEdges]);

  // Update phase in node/edge data
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

  return (
    <div className="w-full h-full bg-[#080c16]">
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
        <Background color="#1a1f3a" gap={32} size={1} />
        <Controls
          position="bottom-right"
          className="!bg-slate-900/80 !border-slate-700/50 !rounded-lg !shadow-lg [&>button]:!bg-slate-900 [&>button]:!border-slate-700/50 [&>button]:!fill-slate-400 [&>button:hover]:!bg-slate-800 [&>button:hover]:!fill-slate-200"
        />
      </ReactFlow>
    </div>
  );
}
