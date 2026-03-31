import { WifiOff, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export type ErrorType = 'network' | 'timeout' | 'generic';

interface ErrorFallbackProps {
  type: ErrorType;
  message?: string;
  onRetry?: () => void;
}

const CONFIG: Record<ErrorType, { icon: typeof WifiOff; title: string; suggestion: string }> = {
  network: {
    icon: WifiOff,
    title: '无法连接分析引擎',
    suggestion: '请检查网络连接或稍后重试',
  },
  timeout: {
    icon: Clock,
    title: 'AI 分析耗时较长',
    suggestion: '服务可能繁忙，请稍后重试或缩短事件描述',
  },
  generic: {
    icon: AlertTriangle,
    title: '发生了意外错误',
    suggestion: '请刷新页面或稍后重试',
  },
};

export function classifyError(error: Error | string): ErrorType {
  const msg = typeof error === 'string' ? error : error.message;
  if (/abort|timeout|超时/i.test(msg)) return 'timeout';
  if (/network|fetch|connect|ECONNREFUSED|Failed to fetch|网络/i.test(msg)) return 'network';
  return 'generic';
}

export function ErrorFallback({ type, message, onRetry }: ErrorFallbackProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: type === 'network'
            ? 'rgba(245,158,11,0.1)'
            : type === 'timeout'
            ? 'rgba(99,102,241,0.1)'
            : 'var(--danger-soft, rgba(239,68,68,0.1))',
        }}
      >
        <Icon
          className="w-7 h-7"
          style={{
            color: type === 'network'
              ? '#f59e0b'
              : type === 'timeout'
              ? '#6366f1'
              : 'var(--danger, #ef4444)',
          }}
        />
      </div>

      <div className="text-center max-w-sm">
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {cfg.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {message || cfg.suggestion}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 cursor-pointer"
          style={{
            background: 'var(--accent, #3b82f6)',
            color: '#fff',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>
      )}
    </div>
  );
}
