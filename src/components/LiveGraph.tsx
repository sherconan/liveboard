import React, { useEffect, useMemo } from 'react';
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
import { SimulationData } from '../App';
import { AlertCircle, TrendingDown, TrendingUp, Minus, Zap, Activity } from 'lucide-react';

const typeMap: Record<string, string> = {
  hotspot: '热点',
  variable: '变量',
  impact: '传导',
  asset: '标的'
};

const typeColors: Record<string, { bg: string; border: string; text: string; glow: string; iconBg: string }> = {
  hotspot:  { bg: 'bg-red-950/60',    border: 'border-red-500/50',    text: 'text-red-300',    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.2)]',  iconBg: 'bg-red-500/20' },
  variable: { bg: 'bg-amber-950/60',   border: 'border-amber-500/50',  text: 'text-amber-300',  glow: '',                                       iconBg: 'bg-amber-500/20' },
  impact:   { bg: 'bg-orange-950/60',  border: 'border-orange-500/50', text: 'text-orange-300', glow: '',                                       iconBg: 'bg-orange-500/20' },
  asset:    { bg: 'bg-slate-800/80',   border: 'border-slate-500/50',  text: 'text-slate-200',  glow: '',                                       iconBg: 'bg-slate-600/30' },
};

const sentimentColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  positive: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/50', text: 'text-emerald-300', iconBg: 'bg-emerald-500/20' },
  negative: { bg: 'bg-red-950/60',     border: 'border-red-500/50',     text: 'text-red-300',     iconBg: 'bg-red-500/20' },
  neutral:  { bg: 'bg-slate-800/80',   border: 'border-slate-500/50',   text: 'text-slate-300',   iconBg: 'bg-slate-600/30' },
};

const CustomNode = ({ data }: NodeProps) => {
  const { label, type, sentiment } = data;
  const displayType = typeMap[type] || type;

  let colors = typeColors[type] || typeColors.asset;
  let icon = <Activity className="w-4 h-4" />;

  if (type === 'hotspot') {
    icon = <AlertCircle className="w-4 h-4 text-red-400" />;
  } else if (type === 'variable') {
    icon = <Zap className="w-4 h-4 text-amber-400" />;
  } else if (type === 'impact') {
    icon = <Activity className="w-4 h-4 text-orange-400" />;
  } else if (type === 'asset') {
    const sc = sentimentColors[sentiment] || sentimentColors.neutral;
    colors = { ...colors, ...sc };
    icon = sentiment === 'positive'
      ? <TrendingUp className="w-4 h-4 text-emerald-400" />
      : sentiment === 'negative'
      ? <TrendingDown className="w-4 h-4 text-red-400" />
      : <Minus className="w-4 h-4 text-slate-400" />;
  }

  return (
    <div className={`px-4 py-3 rounded-xl border backdrop-blur-md flex items-center gap-3 min-w-[180px] max-w-[260px] ${colors.bg} ${colors.border} ${colors.text} ${colors.glow}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400 !border-0" />
      <div className={`p-1.5 rounded-lg shrink-0 ${colors.iconBg}`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold">{displayType}</span>
        <span className="text-sm font-medium leading-tight mt-0.5 break-words">{label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400 !border-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const NODE_WIDTH = 220;
const NODE_HEIGHT = 60;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 60, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function LiveGraph({ data }: { data: SimulationData }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const initialNodes: Node[] = data.nodes.map((n) => ({
      id: n.id,
      type: 'custom',
      data: { label: n.label, type: n.type, sentiment: n.sentiment },
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = data.edges.map((e, i) => {
      let strokeWidth = 1.5;
      let strokeColor = '#475569'; // slate-600
      let animated = false;

      if (e.weight === 'critical') {
        strokeWidth = 3;
        strokeColor = '#ef4444';
        animated = true;
      } else if (e.weight === 'high') {
        strokeWidth = 2.5;
        strokeColor = '#f59e0b';
      } else if (e.weight === 'medium') {
        strokeWidth = 2;
        strokeColor = '#64748b';
      }

      return {
        id: `e${i}-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated,
        style: { strokeWidth, stroke: strokeColor },
        labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9, rx: 6, ry: 6 },
        labelBgPadding: [6, 4] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [data, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-[#0a0e1a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-400 [&>button:hover]:!bg-slate-700" />
      </ReactFlow>
    </div>
  );
}
