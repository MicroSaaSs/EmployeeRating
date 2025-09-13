import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const RecentActivity = ({ refreshing }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [hasMore, setHasMore] = useState(true);

  // Mock activity data
  const mockActivities = [
    {
      id: 1,
      type: 'rating_received',
      raterName: "Michael Chen",
      raterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      raterTitle: "Engineering Manager at TechCorp",
      rating: 5,
      category: "Technical Skills",
      comment: "Exceptional problem-solving abilities and clean code architecture. Sarah consistently delivers high-quality solutions.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isNew: true
    },
    {
      id: 2,
      type: 'rating_given',
      rateeeName: "Jennifer Rodriguez",
      rateeAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      rateeTitle: "UX Designer at DesignStudio",
      rating: 4,
      category: "Collaboration",
      comment: "Great team player with excellent communication skills. Always willing to help and share knowledge.",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      isNew: false
    },
    {
      id: 3,
      type: 'rating_received',
      raterName: "David Park",
      raterAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      raterTitle: "Product Owner at StartupXYZ",
      rating: 5,
      category: "Leadership",
      comment: "Outstanding leadership during our product launch. Sarah guided the team through complex challenges with clarity and vision.",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isNew: false
    },
    {
      id: 4,
      type: 'rating_given',
      rateeeName: "Alex Thompson",
      rateeAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      rateeTitle: "Senior Developer at WebSolutions",
      rating: 4,
      category: "Technical Skills",
      comment: "Solid technical foundation and good mentoring skills. Helped junior developers grow significantly.",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isNew: false
    },
    {
      id: 5,
      type: 'rating_received',
      raterName: "Lisa Wang",
      raterAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      raterTitle: "HR Director at GlobalTech",
      rating: 5,
      category: "Communication",
      comment: "Excellent presentation skills and ability to explain complex concepts to stakeholders. Very professional approach.",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      isNew: false
    }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Activity', icon: 'Activity' },
    { value: 'received', label: 'Received', icon: 'ArrowDown' },
    { value: 'given', label: 'Given', icon: 'ArrowUp' }
  ];

  useEffect(() => {
    loadActivities();
  }, [filter, refreshing]);

  const loadActivities = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let filteredActivities = mockActivities;
    if (filter === 'received') {
      filteredActivities = mockActivities.filter(a => a.type === 'rating_received');
    } else if (filter === 'given') {
      filteredActivities = mockActivities.filter(a => a.type === 'rating_given');
    }
    
    setActivities(filteredActivities);
    setLoading(false);
  };

  const loadMore = () => {
    // Simulate loading more activities
    setHasMore(false);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        name="Star"
        size={16}
        className={i < rating ? 'text-warning fill-current' : 'text-border'}
      />
    ));
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary flex items-center">
            <Icon name="Activity" size={24} className="mr-3 text-primary" />
            Recent Activity
          </h2>
          <Link
            to="/my-ratings-dashboard"
            className="text-primary hover:text-primary-700 text-sm font-medium transition-smooth"
          >
            View All
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-background rounded-lg p-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth ${
                filter === option.value
                  ? 'bg-surface text-primary shadow-sm border border-primary-200'
                  : 'text-text-secondary hover:text-primary hover:bg-primary-50'
              }`}
            >
              <Icon name={option.icon} size={16} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex space-x-4">
                    <div className="w-12 h-12 bg-border rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-border rounded w-3/4"></div>
                      <div className="h-3 bg-border rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="Activity" size={48} className="mx-auto text-border mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No Recent Activity</h3>
            <p className="text-text-secondary mb-6">
              Start rating professionals or get rated to see activity here
            </p>
            <Link
              to="/professional-search-discovery"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
            >
              <Icon name="Search" size={16} className="mr-2" />
              Find Professionals
            </Link>
          </div>
        ) : (
          <>
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-background transition-smooth">
                <div className="flex space-x-4">
                  {/* Avatar */}
                  <div className="relative">
                    <Image
                      src={activity.type === 'rating_received' ? activity.raterAvatar : activity.rateeAvatar}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {activity.isNew && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-surface"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {activity.type === 'rating_received' ? (
                          <p className="text-text-primary">
                            <span className="font-medium">{activity.raterName}</span>
                            <span className="text-text-secondary"> rated you</span>
                          </p>
                        ) : (
                          <p className="text-text-primary">
                            <span className="text-text-secondary">You rated </span>
                            <span className="font-medium">{activity.rateeeName}</span>
                          </p>
                        )}
                        <p className="text-sm text-text-secondary">
                          {activity.type === 'rating_received' ? activity.raterTitle : activity.rateeTitle}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary whitespace-nowrap ml-4">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>

                    {/* Rating and Category */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(activity.rating)}
                      </div>
                      <span className="text-sm text-primary bg-primary-50 px-2 py-1 rounded-full">
                        {activity.category}
                      </span>
                    </div>

                    {/* Comment */}
                    {activity.comment && (
                      <p className="text-sm text-text-secondary bg-background p-3 rounded-lg">
                        "{activity.comment}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="p-6 text-center border-t border-border">
                <button
                  onClick={loadMore}
                  className="text-primary hover:text-primary-700 text-sm font-medium transition-smooth"
                >
                  Load More Activity
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;