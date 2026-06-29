import { Sidebar } from '@/components/campaign/Sidebar';
import { MainPanel } from '@/components/campaign/MainPanel';
import { GuidePanel } from '@/components/campaign/GuidePanel';
import { MobileMenuButton } from '@/components/campaign/MobileMenuButton';

export default function CampaignBuilderPage() {
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
