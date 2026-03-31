import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, showDetails } = this.state;
    const title = this.props.fallbackTitle || '出了点问题';

    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--danger-soft, rgba(239,68,68,0.1))' }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger, #ef4444)' }} />
        </div>

        <div className="text-center max-w-md">
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {error?.message || '发生了意外错误，请重试'}
          </p>
        </div>

        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 cursor-pointer"
          style={{
            background: 'var(--accent, #3b82f6)',
            color: '#fff',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>

        {error?.stack && (
          <div className="w-full max-w-lg mt-2">
            <button
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="flex items-center gap-1 text-xs cursor-pointer mx-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? '收起详情' : '查看详情'}
            </button>
            {showDetails && (
              <pre
                className="mt-2 p-3 rounded-lg text-[11px] leading-relaxed overflow-x-auto max-h-48 overflow-y-auto"
                style={{
                  background: 'var(--bg-input, #f3f4f6)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }
}
