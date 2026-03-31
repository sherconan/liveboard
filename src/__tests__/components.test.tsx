import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/Header';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { LocaleProvider } from '../i18n';
import type { Analysis, SimulationData } from '../services/llm';
import type { HistoryItem } from '../services/historyStore';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref }, children)),
  },
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

// Mock theme hook
vi.mock('../theme', () => ({
  useTheme: () => ({ theme: 'light', toggle: vi.fn(), isDark: false }),
}));

/** Wrapper providing locale context (defaults to zh) */
function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(LocaleProvider, null, children);
}

function makeMockData(): SimulationData {
  return {
    scenarios: [{ name: 'Bull', probability: 0.6, rationale: 'Test' }],
    nodes: [
      { id: 'h1', label: 'Event', type: 'hotspot' },
      { id: 'a1', label: 'NVDA', type: 'asset' },
    ],
    edges: [{ source: 'h1', target: 'a1', label: 'impacts', weight: 'high' }],
    summary: 'Test summary',
    coreActions: ['Buy NVDA'],
  };
}

function makeMockAnalysis(hotspot: string): Analysis {
  return {
    id: `analysis-${hotspot}`,
    timestamp: Date.now(),
    hotspot,
    data: makeMockData(),
    eventTitle: `Event: ${hotspot}`,
  };
}

function makeMockHistoryItem(id: string, hotspot: string): HistoryItem {
  return {
    id,
    timestamp: Date.now() - 3600_000,
    hotspot,
    eventTitle: `Event: ${hotspot}`,
    data: makeMockData(),
    meta: {
      nodeCount: 2,
      edgeCount: 1,
      scenarioCount: 1,
      sectors: [],
      assets: ['NVDA'],
      sentiments: { positive: 0, negative: 0, neutral: 2 },
      chainDepth: 2,
    },
  };
}

describe('Header component', () => {
  const defaultProps = {
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
    loading: false,
    loadingStep: '',
    analyses: [] as Analysis[],
    currentIndex: 0,
    onSelectAnalysis: vi.fn(),
    onExport: vi.fn(),
    historyCount: 0,
    onOpenHistory: vi.fn(),
    onOpenCompare: vi.fn(),
  };

  it('renders without crashing', () => {
    render(<Header {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('LiveBoard')).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<Header {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Real-time Decision Engine')).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(<Header {...defaultProps} loading={true} loadingStep="Fetching news..." />, { wrapper: Wrapper });
    expect(screen.getByText('Fetching news...')).toBeInTheDocument();
  });

  it('shows history count badge when > 0', () => {
    render(<Header {...defaultProps} historyCount={5} />, { wrapper: Wrapper });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show compare button when historyCount < 2', () => {
    render(<Header {...defaultProps} historyCount={1} />, { wrapper: Wrapper });
    // Compare button only renders when historyCount >= 2
    expect(screen.queryByText(/对比|Compare/)).not.toBeInTheDocument();
  });

  it('shows compare button when historyCount >= 2', () => {
    render(<Header {...defaultProps} historyCount={3} />, { wrapper: Wrapper });
    expect(screen.getByText('对比')).toBeInTheDocument();
  });

  it('shows session history dropdown when analyses present', () => {
    const analyses = [makeMockAnalysis('Fed'), makeMockAnalysis('Trade')];
    render(<Header {...defaultProps} analyses={analyses} />, { wrapper: Wrapper });
    expect(screen.getByText(/历史 \(2\)/)).toBeInTheDocument();
  });
});

describe('HistoryDrawer component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    items: [] as HistoryItem[],
    onReplay: vi.fn(),
    onCompare: vi.fn(),
    onHistoryChange: vi.fn(),
    currentHotspot: undefined,
  };

  it('renders empty state when no items', () => {
    render(<HistoryDrawer {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('暂无历史分析')).toBeInTheDocument();
  });

  it('renders history items', () => {
    const items = [
      makeMockHistoryItem('1', 'Fed Decision'),
      makeMockHistoryItem('2', 'Trade War'),
    ];
    render(<HistoryDrawer {...defaultProps} items={items} />, { wrapper: Wrapper });
    expect(screen.getByText('Event: Fed Decision')).toBeInTheDocument();
    expect(screen.getByText('Event: Trade War')).toBeInTheDocument();
  });

  it('shows item count in header', () => {
    const items = [makeMockHistoryItem('1', 'Event A')];
    render(<HistoryDrawer {...defaultProps} items={items} />, { wrapper: Wrapper });
    expect(screen.getByText('1/50')).toBeInTheDocument();
  });

  it('shows search when >3 items', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeMockHistoryItem(`id-${i}`, `Event ${i}`)
    );
    render(<HistoryDrawer {...defaultProps} items={items} />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText('搜索事件或资产...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<HistoryDrawer {...defaultProps} isOpen={false} />, { wrapper: Wrapper });
    expect(screen.queryByText('历史分析')).not.toBeInTheDocument();
  });

  it('shows footer hint when items exist', () => {
    const items = [makeMockHistoryItem('1', 'Test')];
    render(<HistoryDrawer {...defaultProps} items={items} />, { wrapper: Wrapper });
    expect(screen.getByText(/最多保留 50 条/)).toBeInTheDocument();
  });
});
