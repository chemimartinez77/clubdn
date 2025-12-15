// client/src/pages/Home.tsx
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import StatsCard from '../components/dashboard/StatsCard';
import QuickActionsCard from '../components/dashboard/QuickActionsCard';

export default function Home() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <WelcomeCard user={user} />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Card - Spans 2 columns */}
          <div className="lg:col-span-2">
            <StatsCard />
          </div>

          {/* Quick Actions Card - 1 column */}
          <div className="lg:col-span-1">
            <QuickActionsCard isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
