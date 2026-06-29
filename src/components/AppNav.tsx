'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const TOOLS = [
  { href: '/campaign-builder', label: 'Campaign',   full: 'Campaign Builder' },
  { href: '/media-plan',       label: 'Media Plan', full: 'Media Plan Builder' },
  { href: '/dashboard',        label: 'Dashboard',  full: 'Performance Dashboard' },
  { href: '/insights',         label: 'AI Insights', full: 'AI Insight Generator' },
];

export default function AppNav() {
  const pathname = usePathname();
  // Hide the nav when this page is loaded inside a workspace iframe
  const [inFrame, setInFrame] = useState(false);
  useEffect(() => {
    try { setInFrame(window.self !== window.top); } catch { setInFrame(true); }
  }, []);

  if (inFrame) return null;

  return (
    <nav className="flex h-11 flex-shrink-0 items-center justify-between border-b border-ink-100 bg-white px-4">
      {/* Left: logo + tool switcher */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/nmq-logo.png"
            alt="NMQ Digital"
            width={88}
            height={35}
            className="h-7 w-auto"
            priority
          />
        </Link>

        <div className="flex gap-0.5">
          {TOOLS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + '/');
            return (
              <Link
                key={t.href}
                href={t.href}
                title={t.full}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right: workspace button */}
      <Link
        href="/workspace"
        title="Split view — open two tools side by side"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
          pathname === '/workspace'
            ? 'border-ink-900 bg-ink-900 text-white'
            : 'border-ink-200 text-ink-600 hover:border-ink-400 hover:bg-ink-50'
        }`}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <rect x="1" y="2" width="6" height="12" rx="1" opacity="0.6" />
          <rect x="9" y="2" width="6" height="12" rx="1" />
        </svg>
        Workspace
      </Link>
    </nav>
  );
}
