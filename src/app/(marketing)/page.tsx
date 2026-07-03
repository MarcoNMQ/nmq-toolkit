'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const tools = [
  {
    href: '/campaign-builder',
    label: 'Campaign Builder',
    descriptions: [
      'Brief in, bulk upload out. Because life\'s too short to type campaign names manually.',
      'Turn a client brief into 47 ad copies before your second coffee. Naming conventions included.',
      'Build Google Ads and Meta campaigns without opening a single spreadsheet. You\'re welcome.',
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-full w-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    accentHex: '#FF6B2C',
    accentLight: 'var(--color-brand-50)',
  },
  {
    href: '/media-plan',
    label: 'Media Plan Builder',
    descriptions: [
      'Multi-scenario budget planning that doesn\'t involve a spreadsheet that breaks when you scroll right.',
      'Build a €500K media plan without accidentally making the numbers add up to €501K.',
      'How to impress a client with an AI-backed media plan while pretending it took way longer.',
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-full w-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    accentHex: '#00C896',
    accentLight: 'var(--color-mint-100)',
  },
  {
    href: '/dashboard',
    label: 'Performance Dashboard',
    descriptions: [
      'Your campaign data, in something that isn\'t a pivot table that crashes on Fridays.',
      'Upload the export, let Claude say what you already suspected but couldn\'t prove.',
      'Because staring at raw CSVs is a war crime. Upload, view, get AI insights.',
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-full w-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    accentHex: '#4F46E5',
    accentLight: '#EEF2FF',
  },
  {
    href: '/insights',
    label: 'AI Insight Generator',
    descriptions: [
      'Drop in a CSV, get back a strategy memo. Therapists hate this one trick.',
      'Claude reads your campaign data so you don\'t have to explain why the CTR is 0.4%.',
      'The fastest way to sound smart in a performance review. Upload → Generate → Done.',
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-full w-full">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    accentHex: '#7C3AED',
    accentLight: '#F5F3FF',
  },
];

const TAGLINES = [
  'Your unfair advantage. Don\'t tell clients.',
  'Stop copy-pasting. Start doing stuff that matters.',
  'Built by media people, for media people. (And definitely not to replace us.)',
];

export default function Home() {
  const [picked, setPicked] = useState<{ tagline: number; cards: number[] } | null>(null);

  useEffect(() => {
    setPicked({
      tagline: Math.floor(Math.random() * TAGLINES.length),
      cards: tools.map((t) => Math.floor(Math.random() * t.descriptions.length)),
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f5]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-ink-100 bg-white px-8 py-4">
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
        <div className="w-full max-w-5xl">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1 className="text-5xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
              NMQ Toolkit
            </h1>
            <p className="mt-3 h-6 text-base text-ink-500">
              {picked ? TAGLINES[picked.tagline] : ''}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool, i) => {
              const desc = picked ? tool.descriptions[picked.cards[i]] : tool.descriptions[0];
              return (
                <motion.div
                  key={tool.href}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.1 }}
                  className="h-full"
                >
                  <Link
                    href={tool.href}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 40px -12px ${tool.accentHex}40`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {/* Dark icon section */}
                    <div className="relative flex items-center justify-center overflow-hidden bg-[#1a1a1a]" style={{ height: 200 }}>
                      {/* Radial glow behind icon */}
                      <div
                        className="absolute inset-0 opacity-25 transition-opacity duration-500 group-hover:opacity-40"
                        style={{
                          background: `radial-gradient(circle at 50% 65%, ${tool.accentHex}cc, transparent 65%)`,
                        }}
                      />
                      {/* Icon */}
                      <div
                        className="relative h-20 w-20 transition-transform duration-300 group-hover:scale-110"
                        style={{ color: 'white' }}
                      >
                        {tool.icon}
                      </div>
                    </div>

                    {/* White content section */}
                    <div className="flex flex-1 flex-col p-6">
                      <h2
                        className="text-lg font-extrabold leading-snug"
                        style={{ color: tool.accentHex }}
                      >
                        {tool.label}
                      </h2>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
                        {desc}
                      </p>
                      <span
                        className="mt-5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-all duration-200 group-hover:gap-2"
                        style={{ color: tool.accentHex }}
                      >
                        Open <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white px-8 py-5 text-center">
        <p className="text-xs text-ink-400">
          © {new Date().getFullYear()} NMQ Digital · Internal use only ·{' '}
          <Link href="/guide" className="underline underline-offset-2 hover:text-ink-700 transition">
            User Guide
          </Link>
        </p>
      </footer>
    </div>
  );
}
