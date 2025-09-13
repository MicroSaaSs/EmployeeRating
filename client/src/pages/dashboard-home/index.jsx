import React, { useState, useEffect } from 'react';

import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';

import RecentActivity from './components/RecentActivity';
import TrendingProfessionals from './components/TrendingProfessionals';
import QuickActions from './components/QuickActions';
import PersonalStats from './components/PersonalStats';

const DashboardHome = () => {
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mock user data
  const currentUser = {
    name: "Sarah Johnson",
    title: "Senior Product Manager",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    ratingsGiven: 47,
    ratingsReceived: 23,
    profileViews: 156,
    reputationScore: 4.7
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  useEffect(() => {
    // Simulate initial data load
    const timer = setTimeout(() => {
      // Data loaded
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Main Content */}
      <div className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                  Welcome back, {currentUser.name}
                </h1>
                <p className="text-text-secondary mt-1">
                  Here's what's happening in your professional network
                </p>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth disabled:opacity-50"
              >
                <Icon 
                  name="RefreshCw" 
                  size={16} 
                  className={refreshing ? 'animate-spin' : ''} 
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-8 space-y-8">
              <QuickActions />
              <RecentActivity refreshing={refreshing} />
              <TrendingProfessionals />
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <PersonalStats 
                  user={currentUser}
                  isCollapsed={isStatsCollapsed}
                  onToggleCollapse={() => setIsStatsCollapsed(!isStatsCollapsed)}
                />
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden space-y-6">
            <QuickActions />
            
            {/* Collapsible Stats on Mobile */}
            <div className="md:hidden">
              <PersonalStats 
                user={currentUser}
                isCollapsed={isStatsCollapsed}
                onToggleCollapse={() => setIsStatsCollapsed(!isStatsCollapsed)}
              />
            </div>

            <RecentActivity refreshing={refreshing} />
            <TrendingProfessionals />

            {/* Stats on Tablet */}
            <div className="hidden md:block lg:hidden">
              <PersonalStats 
                user={currentUser}
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