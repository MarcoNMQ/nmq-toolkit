import { Sidebar } from '@/components/mediaplan/Sidebar';
import { MainPanel } from '@/components/mediaplan/MainPanel';
import { MobileMenuButton } from '@/components/mediaplan/MobileMenuButton';
import { GuidePanel } from '@/components/mediaplan/GuidePanel';

export default function MediaPlanPage() {
  return (
    <div className="flex h-full bg-ink-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <MobileMenuButton />
        <MainPanel />
      </main>
      <GuidePanel />
    </div>
  );
}
