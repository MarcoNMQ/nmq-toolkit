'use client';

import { useMediaPlanStore } from '@/lib/mediaplan/store';

/** Hamburger button that opens the sidebar drawer — mobile only, hidden on desktop where the sidebar is always visible. */
export function MobileMenuButton() {
  const setMobileSidebarOpen = useMediaPlanStore((s) => s.setMobileSidebarOpen);

  return (
    <button
      onClick={() => setMobileSidebarOpen(true)}
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-ink-100 bg-white px-4 py-3 text-sm font-bold text-ink-900 md:hidden"
      aria-label="Open menu"
    >
      <span className="text-lg leading-none">☰</span>
      Menu
    </button>
  );
}
