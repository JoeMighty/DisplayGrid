import { db, screens, playlists, assets } from '@/lib/db';
import { count } from 'drizzle-orm';
import EmergencyOverridePanel from '@/components/EmergencyOverridePanel';
import TutorialWizard from '@/components/TutorialWizard';

async function getStats() {
  const [screenCount, playlistCount, assetCount] = await Promise.all([
    db.select({ count: count() }).from(screens).get(),
    db.select({ count: count() }).from(playlists).get(),
    db.select({ count: count() }).from(assets).get(),
  ]);
  return {
    screens:   screenCount?.count  ?? 0,
    playlists: playlistCount?.count ?? 0,
    assets:    assetCount?.count    ?? 0,
  };
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        <span className="text-gray-600">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-100">{value}</p>
    </div>
  );
}

export default async function OverviewPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Overview</h1>
      <p className="text-sm text-gray-400 mb-8">Welcome back. Here&apos;s what&apos;s happening.</p>

      <TutorialWizard />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Screens"
          value={stats.screens}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
        <StatCard
          label="Playlists"
          value={stats.playlists}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          }
        />
        <StatCard
          label="Assets"
          value={stats.assets}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          }
        />
      </div>

      <EmergencyOverridePanel />
    </div>
  );
}
