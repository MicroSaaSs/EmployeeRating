import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const QuickActions = () => {
  const quickActions = [
    {
      title: "Rate Someone",
      description: "Share your experience working with a professional",
      icon: "Star",
      iconColor: "text-warning",
      bgColor: "bg-warning-50",
      borderColor: "border-warning-200",
      hoverColor: "hover:bg-warning-100",
      path: "/rate-professional",
      isPrimary: true
    },
    {
      title: "Search Professionals",
      description: "Find and discover professionals in your network",
      icon: "Search",
      iconColor: "text-primary",
      bgColor: "bg-primary-50",
      borderColor: "border-primary-200",
      hoverColor: "hover:bg-primary-100",
      path: "/professional-search-discovery",
      isPrimary: true
    },
    {
      title: "My Ratings",
      description: "View your rating history and analytics",
      icon: "BarChart3",
      iconColor: "text-secondary",
      bgColor: "bg-secondary-50",
      borderColor: "border-secondary-200",
      hoverColor: "hover:bg-secondary-100",
      path: "/my-ratings-dashboard",
      isPrimary: false
    },
    {
      title: "My Profile",
      description: "Manage your professional profile and settings",
      icon: "User",
      iconColor: "text-accent",
      bgColor: "bg-accent-50",
      borderColor: "border-accent-200",
      hoverColor: "hover:bg-accent-100",
      path: "/professional-profile",
      isPrimary: false
    }
  ];

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-text-primary flex items-center">
          <Icon name="Zap" size={24} className="mr-3 text-accent" />
          Quick Actions
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          Get started with these common tasks
        </p>
      </div>

      {/* Actions Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.path}
              className={`group relative p-4 rounded-lg border transition-smooth ${action.bgColor} ${action.borderColor} ${action.hoverColor} hover:shadow-card ${
                action.isPrimary ? 'ring-2 ring-transparent hover:ring-primary-200' : ''
              }`}
            >
              {/* Primary Badge */}
              {action.isPrimary && (
                <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">
                  Popular
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-3">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full bg-surface border ${action.borderColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon name={action.icon} size={24} className={action.iconColor} />
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-medium text-text-primary mb-1 group-hover:text-primary transition-smooth">
                    {action.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {action.description}
                  </p>
                </div>

                {/* Arrow Icon */}
                <Icon 
                  name="ArrowRight" 
                  size={16} 
                  className="text-text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all" 
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Additional Actions */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/professional-search-discovery"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition-smooth"
            >
              <Icon name="Users" size={16} className="mr-2" />
              Browse Network
            </Link>
            <Link
              to="/my-ratings-dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-text-secondary bg-background rounded-lg hover:bg-primary-50 hover:text-primary transition-smooth"
            >
              <Icon name="TrendingUp" size={16} className="mr-2" />
              View Analytics
            </Link>
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-text-secondary bg-background rounded-lg hover:bg-primary-50 hover:text-primary transition-smooth">
              <Icon name="HelpCircle" size={16} className="mr-2" />
              Get Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;