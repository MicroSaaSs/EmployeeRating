import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import { getApiBaseUrl } from "../../../utils/auth";

type ActivityReceived = {
  id: number;
  type: "rating_received";
  raterName: string;
  raterAvatar: string;
  raterTitle: string;
  rating: number;
  category: string;
  comment?: string;
  timestamp: Date;
  isNew: boolean;
};

type ActivityGiven = {
  id: number;
  type: "rating_given";
  rateeeName: string;
  rateeAvatar: string;
  rateeTitle: string;
  rating: number;
  category: string;
  comment?: string;
  timestamp: Date;
  isNew: boolean;
};

type Activity = ActivityReceived | ActivityGiven;

type RecentActivityProps = {
  refreshing: boolean;
};

const RecentActivity: React.FC<RecentActivityProps> = ({ refreshing }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "received" | "given">("all");
  const [hasMore, setHasMore] = useState(true);

  /* Mock removed
  const mockActivities: Activity[] = [ ... ];
  */

  const filterOptions: Array<{
    value: "all" | "received" | "given";
    label: string;
    icon: string;
  }> = [
    { value: "all", label: "All Activity", icon: "Activity" },
    { value: "received", label: "Received", icon: "ArrowDown" },
    { value: "given", label: "Given", icon: "ArrowUp" },
  ];

  useEffect(() => {
    loadActivities();
  }, [filter, refreshing]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${getApiBaseUrl()}/users/activities?filter=${encodeURIComponent(
          filter
        )}`,
        { credentials: "include" }
      );
      const data = await res.json();
      const list = (data?.activities || []).map((a: any) => ({
        ...a,
        timestamp: new Date(
          typeof a.timestamp === "number" ? a.timestamp : Date.now()
        ),
      }));
      setActivities(list);
      setHasMore(false);
    } catch (e) {
      setActivities([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setHasMore(false);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        name="Star"
        size={16}
        className={i < rating ? "text-warning fill-current" : "text-border"}
      />
    ));
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify_between mb-4">
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

        <div className="flex space-x-1 bg-background rounded-lg p-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth ${
                filter === option.value
                  ? "bg-surface text-primary shadow-sm border border-primary-200"
                  : "text-text-secondary hover:text-primary hover:bg-primary-50"
              }`}
            >
              <Icon name={option.icon as any} size={16} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

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
            <Icon
              name="Activity"
              size={48}
              className="mx-auto text-border mb-4"
            />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No Recent Activity
            </h3>
            <p className="text-text-secondary mb-6">
              Start rating professionals or get rated to see activity here
            </p>
            <Link
              to="/professional-search-discovery"
              className="inline-flex items_center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
            >
              <Icon name="Search" size={16} className="mr-2" />
              Find Professionals
            </Link>
          </div>
        ) : (
          <>
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-6 hover:bg-background transition-smooth"
              >
                <div className="flex space-x-4">
                  <div className="relative">
                    <Image
                      src={
                        activity.type === "rating_received"
                          ? activity.raterAvatar
                          : activity.rateeAvatar
                      }
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {activity.isNew && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-surface"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {activity.type === "rating_received" ? (
                          <p className="text-text-primary">
                            <span className="font-medium">
                              {activity.raterName}
                            </span>
                            <span className="text-text-secondary">
                              {" "}
                              rated you
                            </span>
                          </p>
                        ) : (
                          <p className="text-text-primary">
                            <span className="text-text-secondary">
                              You rated{" "}
                            </span>
                            <span className="font-medium">
                              {activity.rateeeName}
                            </span>
                          </p>
                        )}
                        <p className="text-sm text-text-secondary">
                          {activity.type === "rating_received"
                            ? activity.raterTitle
                            : activity.rateeTitle}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary whitespace-nowrap ml-4">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(activity.rating)}
                      </div>
                      <span className="text-sm text-primary bg-primary-50 px-2 py-1 rounded-full">
                        {activity.category}
                      </span>
                    </div>
                    {activity.comment && (
                      <p className="text-sm text-text-secondary bg-background p-3 rounded-lg">
                        "{activity.comment}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
