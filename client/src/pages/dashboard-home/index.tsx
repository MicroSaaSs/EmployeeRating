import React, { useState, useEffect } from "react";

import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";
import { getApiBaseUrl } from "../../utils/auth";

import RecentActivity from "./components/RecentActivity";
import TrendingProfessionals from "./components/TrendingProfessionals";
import QuickActions from "./components/QuickActions";
import PersonalStats from "./components/PersonalStats";

const DashboardHome: React.FC = () => {
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>("there");
  const [stats, setStats] = useState({
    ratingsGiven: 0,
    ratingsReceived: 0,
    profileViews: 0,
    reputationScore: 0,
  });

  const loadDashboard = async () => {
    try {
      // Load current user and ratings given
      const meRes = await fetch(`${getApiBaseUrl()}/users/me`, {
        credentials: "include",
      });
      if (meRes.ok) {
        const me = await meRes.json();
        const u = me?.user;
        const given = Array.isArray(me?.ratingsGiven)
          ? me.ratingsGiven.length
          : 0;
        const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(" ");
        setUserName(fullName || "there");
        setStats((s) => ({ ...s, ratingsGiven: given }));
      }
      // Load ratings received
      const recRes = await fetch(`${getApiBaseUrl()}/ratings/received`, {
        credentials: "include",
      });
      if (recRes.ok) {
        const rec = await recRes.json();
        const receivedCount = Array.isArray(rec?.ratings)
          ? rec.ratings.length
          : 0;
        setStats((s) => ({ ...s, ratingsReceived: receivedCount }));
      }
    } catch {
      // leave defaults on failure
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                  Welcome back, {userName}
                </h1>
                <p className="text-text-secondary mt-1">
                  Here's what's happening in your professional network
                </p>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth disabled:opacity-50"
              >
                <Icon
                  name="RefreshCw"
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8 space-y-8">
              <QuickActions />
              <RecentActivity refreshing={refreshing} />
              <TrendingProfessionals />
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <PersonalStats
                  user={stats}
                  isCollapsed={isStatsCollapsed}
                  onToggleCollapse={() =>
                    setIsStatsCollapsed(!isStatsCollapsed)
                  }
                />
              </div>
            </div>
          </div>

          <div className="lg:hidden space-y-6">
            <QuickActions />

            <div className="md:hidden">
              <PersonalStats
                user={stats}
                isCollapsed={isStatsCollapsed}
                onToggleCollapse={() => setIsStatsCollapsed(!isStatsCollapsed)}
              />
            </div>

            <RecentActivity refreshing={refreshing} />
            <TrendingProfessionals />

            <div className="hidden md:block lg:hidden">
              <PersonalStats
                user={stats}
                isCollapsed={false}
                onToggleCollapse={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
