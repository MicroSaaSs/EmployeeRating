import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const PersonalStats = ({ user, isCollapsed, onToggleCollapse }) => {
  const stats = [
    {
      label: "Ratings Given",
      value: user.ratingsGiven,
      icon: "ArrowUp",
      color: "text-success",
      bgColor: "bg-success-50",
      change: "+3 this week",
      changeType: "positive"
    },
    {
      label: "Ratings Received",
      value: user.ratingsReceived,
      icon: "ArrowDown",
      color: "text-primary",
      bgColor: "bg-primary-50",
      change: "+2 this week",
      changeType: "positive"
    },
    {
      label: "Profile Views",
      value: user.profileViews,
      icon: "Eye",
      color: "text-secondary",
      bgColor: "bg-secondary-50",
      change: "+12 this week",
      changeType: "positive"
    }
  ];

  const reputationPercentage = (user.reputationScore / 5) * 100;

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary flex items-center">
            <Icon name="BarChart3" size={20} className="mr-3 text-primary" />
            Your Stats
          </h2>
          <button
            onClick={onToggleCollapse}
            className="md:hidden p-1 text-text-secondary hover:text-primary transition-smooth"
          >
            <Icon name={isCollapsed ? "ChevronDown" : "ChevronUp"} size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`${isCollapsed ? 'hidden md:block' : 'block'}`}>
        <div className="p-6 space-y-6">
          {/* Reputation Score */}
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-border"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - reputationPercentage / 100)}`}
                  className="text-primary transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xl font-bold text-text-primary">
                    {user.reputationScore}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Reputation
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              Your professional reputation score
            </p>
          </div>

          {/* Stats Grid */}
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                    <Icon name={stat.icon} size={16} className={stat.color} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {stat.label}
                    </p>
                    <p className={`text-xs ${stat.changeType === 'positive' ? 'text-success' : 'text-error'}`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Achievements */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Award" size={16} color="white" />
              </div>
              <div>
                <h3 className="font-medium text-text-primary mb-1">
                  Recent Achievement
                </h3>
                <p className="text-sm text-text-secondary">
                  You've received 5 new ratings this month! Keep up the great work.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/my-ratings-dashboard"
              className="w-full flex items-center justify-center px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
            >
              <Icon name="BarChart3" size={16} className="mr-2" />
              View Full Analytics
            </Link>
            <Link
              to="/professional-profile"
              className="w-full flex items-center justify-center px-4 py-3 border border-border text-text-primary rounded-lg hover:bg-primary-50 hover:border-primary-200 transition-smooth"
            >
              <Icon name="User" size={16} className="mr-2" />
              Edit Profile
            </Link>
          </div>

          {/* Tips Section */}
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Icon name="Lightbulb" size={16} className="text-warning mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-text-primary text-sm mb-1">
                  Pro Tip
                </h4>
                <p className="text-xs text-text-secondary">
                  Rate more professionals to increase your network visibility and build stronger professional relationships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalStats;