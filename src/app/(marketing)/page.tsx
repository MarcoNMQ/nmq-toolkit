import Link from 'next/link';
import Image from 'next/image';

const tools = [
  {
    href: '/campaign-builder',
    label: 'Campaign Builder',
    description: 'From brief to bulk upload, fast. Google Ads and Facebook/Instagram.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    accent: 'var(--color-brand-500)',
    accentLight: 'var(--color-brand-50)',
    accentHover: 'var(--color-brand-600)',
    badge: 'Google Ads · Facebook',
  },
  {
    href: '/media-plan',
    label: 'Media Plan Builder',
    description: 'Multi-scenario budget planning with KPI projections and AI insights.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    accent: 'var(--color-mint-600)',
    accentLight: 'var(--color-mint-100)',
    accentHover: '#009e78',
    badge: 'Multi-market · Multi-scenario',
  },
  {
    href: '/dashboard',
    label: 'Performance Dashboard',
    description: 'Live paid media reporting with AI-powered insights, direct from Google Sheets.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    accent: '#4F46E5',
    accentLight: '#EEF2FF',
    accentHover: '#4338CA',
    badge: 'Awareness · Consideration · Purchase',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-ink-100 px-8 py-4">
        <Image
          src="/nmq-logo.png"
          alt="NMQ Digital"
          width={147}
          height={58}
          priority
          className="h-10 w-auto"
        />
        <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold tracking-widest text-ink-400 uppercase">
          Internal Tools
        </span>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
              NMQ Toolkit
            </h1>
            <p className="mt-3 text-base text-ink-500">
              Everything you need to plan, build and measure paid media campaigns — in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative flex flex-col rounded-2xl border border-ink-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={
                  {
                    '--tool-accent': tool.accent,
                    '--tool-accent-light': tool.accentLight,
                  } as React.CSSProperties
                }
              >
                {/* Accent top bar */}
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ backgroundColor: tool.accent }}
                />

                {/* Icon */}
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{
                    backgroundColor: tool.accentLight,
                    color: tool.accent,
                  }}
                >
                  {tool.icon}
                </div>

                {/* Text */}
                <h2
                  className="text-base font-bold text-ink-900 transition-colors duration-200 group-hover:text-[var(--tool-accent)]"
                >
                  {tool.label}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{tool.description}</p>

                {/* Badge */}
                <span className="mt-5 inline-block self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                  style={{ backgroundColor: tool.accentLight, color: tool.accent }}>
                  {tool.badge}
                </span>

                {/* Arrow */}
                <span
                  className="absolute bottom-6 right-6 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--tool-accent)]"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100 px-8 py-5 text-center">
        <p className="text-xs text-ink-400">
          © {new Date().getFullYear()} NMQ Digital · Internal use only
        </p>
      </footer>
    </div>
  );
}
