import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-ink-50 px-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">NMQ Toolkit</h1>
        <p className="mt-2 text-sm text-ink-500">Pick a tool to get started.</p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Link
            href="/campaign-builder"
            className="group rounded-xl border border-ink-200 bg-white p-8 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <span className="text-4xl">📣</span>
            <h2 className="mt-4 text-lg font-bold text-ink-900 group-hover:text-brand-600">Campaign Builder</h2>
            <p className="mt-1 text-sm text-ink-500">From brief to bulk upload, fast. Google Ads &amp; Facebook/Instagram.</p>
          </Link>

          <Link
            href="/media-plan"
            className="group rounded-xl border border-ink-200 bg-white p-8 text-left shadow-sm transition hover:border-mint-500 hover:shadow-md"
          >
            <span className="text-4xl">📊</span>
            <h2 className="mt-4 text-lg font-bold text-ink-900 group-hover:text-mint-600">Media Plan Builder</h2>
            <p className="mt-1 text-sm text-ink-500">Scenario planning and budget allocation, with AI insights.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
