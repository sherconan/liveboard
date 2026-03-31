import { useLocale } from '../i18n';

export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      title={locale === 'zh' ? 'Switch to English' : '切换中文'}
    >
      <span style={{ color: locale === 'zh' ? 'var(--accent)' : 'var(--text-muted)' }}>中</span>
      <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>/</span>
      <span style={{ color: locale === 'en' ? 'var(--accent)' : 'var(--text-muted)' }}>EN</span>
    </button>
  );
}
