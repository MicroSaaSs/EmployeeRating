import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ProfessionalCard = ({ professional, onClick, onRate, onPreview }) => {
  const {
    name,
    title,
    company,
    location,
    avatar,
    rating,
    reviewCount,
    skills,
    verified,
    responseRate,
    lastActive,
    recentRatings
  } = professional;

  const handleCardClick = (e) => {
    e.preventDefault();
    onClick(professional);
  };

  const handleRateClick = (e) => {
    e.stopPropagation();
    onRate(professional);
  };

  const handlePreviewHover = () => {
    if (onPreview) {
      onPreview(professional);
    }
  };

  const getLastActiveColor = () => {
    if (lastActive.includes('hour')) return 'text-success';
    if (lastActive.includes('day')) return 'text-warning';
    return 'text-text-secondary';
  };

  return (
    <div 
      className="bg-surface rounded-lg border border-border hover:border-primary-200 hover:shadow-card transition-all duration-200 cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={handlePreviewHover}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="relative">
              <Image
                src={avatar}
                alt={name}
                className="w-16 h-16 rounded-full object-cover"
              />
              {verified && (
                <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-1">
                  <Icon name="Check" size={12} color="white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-text-primary truncate">{name}</h3>
                {verified && (
                  <Icon name="CheckCircle" size={16} className="text-success flex-shrink-0" />
                )}
              </div>
              <p className="text-text-secondary text-sm mb-1 truncate">{title}</p>
              <div className="flex items-center space-x-2 text-sm text-text-secondary">
                <Icon name="Building" size={14} />
                <span className="truncate">{company}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <Icon name="Star" size={16} className="text-yellow-400 fill-current" />
              <span className="font-medium text-text-primary">{rating}</span>
            </div>
            <span className="text-xs text-text-secondary">({reviewCount} reviews)</span>
          </div>
        </div>

        {/* Location and Last Active */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center space-x-2 text-text-secondary">
            <Icon name="MapPin" size={14} />
            <span className="truncate">{location}</span>
          </div>
          <div className={`flex items-center space-x-1 ${getLastActiveColor()}`}>
            <Icon name="Clock" size={14} />
            <span className="text-xs">{lastActive}</span>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-primary-50 text-primary text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-text-secondary text-xs rounded-full">
                +{skills.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Recent Ratings Preview */}
        {recentRatings && recentRatings.length > 0 && (
          <div className="mb-4 p-3 bg-background rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="MessageSquare" size={14} className="text-text-secondary" />
              <span className="text-xs font-medium text-text-secondary">Recent Feedback</span>
            </div>
            <div className="space-y-2">
              {recentRatings.slice(0, 1).map((review, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        name="Star"
                        size={12}
                        className={i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2 flex-1">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Icon name="TrendingUp" size={14} className="text-success" />
              <span className="text-text-secondary">{responseRate}% response</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-text-secondary">
            <Icon name="Eye" size={14} />
            <span className="text-xs">View profile</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleCardClick}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth text-sm font-medium"
          >
            View Profile
          </button>
          <button
            onClick={handleRateClick}
            className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-primary-50 hover:border-primary-200 transition-smooth text-sm font-medium"
          >
            <Icon name="Star" size={16} />
          </button>
        </div>
      </div>

      {/* Hover Effect Indicator */}
      <div className="h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-b-lg"></div>
    </div>
  );
};

export default ProfessionalCard;