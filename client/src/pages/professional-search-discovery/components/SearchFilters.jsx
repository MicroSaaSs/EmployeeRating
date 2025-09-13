import React from 'react';
import Icon from '../../../components/AppIcon';

const SearchFilters = ({ isOpen, filters, onFiltersChange, onClose, onClear }) => {
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
    'Design', 'Sales', 'Consulting', 'Manufacturing', 'Entertainment'
  ];

  const experienceLevels = [
    'Entry-level', 'Mid-level', 'Senior', 'Executive', 'Director'
  ];

  const companySizes = [
    'Startup (1-50)', 'Small (51-200)', 'Medium (201-1000)', 
    'Large (1001-5000)', 'Enterprise (5000+)'
  ];

  const locations = [
    'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX',
    'Los Angeles, CA', 'Chicago, IL', 'Boston, MA', 'Denver, CO'
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRatingChange = (value) => {
    onFiltersChange(prev => ({
      ...prev,
      ratingRange: [value, 5]
    }));
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value && value !== '' && !(Array.isArray(value) && value[0] === 0 && value[1] === 5)
  ).length;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Filters Panel */}
      <div className={`
        fixed md:relative top-0 left-0 h-full w-80 bg-surface border-r border-border z-50
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isOpen ? 'md:block' : 'md:block'}
      `}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-text-primary">Filters</h3>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-white text-xs rounded-full px-2 py-1">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClear}
                className="text-sm text-primary hover:text-primary-700 transition-smooth"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="md:hidden text-text-secondary hover:text-primary"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
          </div>

          {/* Location Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Location
            </label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Industry
            </label>
            <select
              value={filters.industry}
              onChange={(e) => handleFilterChange('industry', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          {/* Experience Level Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Experience Level
            </label>
            <select
              value={filters.experienceLevel}
              onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Levels</option>
              {experienceLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Company Size Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Company Size
            </label>
            <select
              value={filters.companySize}
              onChange={(e) => handleFilterChange('companySize', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Sizes</option>
              {companySizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Minimum Rating
            </label>
            <div className="space-y-2">
              {[4, 3, 2, 1].map(rating => (
                <label key={rating} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    value={rating}
                    checked={filters.ratingRange[0] === rating}
                    onChange={() => handleRatingChange(rating)}
                    className="text-primary focus:ring-primary"
                  />
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        name="Star"
                        size={16}
                        className={i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}
                      />
                    ))}
                    <span className="text-sm text-text-secondary ml-1">& up</span>
                  </div>
                </label>
              ))}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={0}
                  checked={filters.ratingRange[0] === 0}
                  onChange={() => handleRatingChange(0)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">All Ratings</span>
              </label>
            </div>
          </div>

          {/* Verification Filter */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.verified}
                onChange={(e) => handleFilterChange('verified', e.target.checked)}
                className="text-primary focus:ring-primary rounded"
              />
              <div className="flex items-center space-x-2">
                <Icon name="CheckCircle" size={16} className="text-success" />
                <span className="text-sm text-text-primary">Verified Profiles Only</span>
              </div>
            </label>
          </div>

          {/* Response Rate Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Minimum Response Rate
            </label>
            <select
              value={filters.responseRate || ''}
              onChange={(e) => handleFilterChange('responseRate', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Any Response Rate</option>
              <option value="90">90% and above</option>
              <option value="80">80% and above</option>
              <option value="70">70% and above</option>
              <option value="60">60% and above</option>
            </select>
          </div>

          {/* Apply Button (Mobile) */}
          <div className="md:hidden">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchFilters;