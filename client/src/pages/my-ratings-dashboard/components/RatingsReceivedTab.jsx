import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const RatingsReceivedTab = ({ ratings }) => {
  const [responseText, setResponseText] = useState({});
  const [showResponseForm, setShowResponseForm] = useState({});

  const handleResponseSubmit = (ratingId) => {
    const response = responseText[ratingId];
    if (response && response.trim()) {
      // Handle response submission logic here
      console.log('Submitting response for rating:', ratingId, response);
      setResponseText(prev => ({ ...prev, [ratingId]: '' }));
      setShowResponseForm(prev => ({ ...prev, [ratingId]: false }));
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Icon key={i} name="Star" size={16} className="text-warning fill-current" />
        ))}
        {hasHalfStar && (
          <Icon name="Star" size={16} className="text-warning fill-current opacity-50" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon key={i} name="Star" size={16} className="text-border" />
        ))}
        <span className="ml-2 text-sm font-medium text-text-primary">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const calculateAggregateStats = () => {
    if (ratings.length === 0) return { average: 0, distribution: {} };
    
    const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const average = total / ratings.length;
    
    const distribution = {
      5: ratings.filter(r => r.rating >= 4.5).length,
      4: ratings.filter(r => r.rating >= 3.5 && r.rating < 4.5).length,
      3: ratings.filter(r => r.rating >= 2.5 && r.rating < 3.5).length,
      2: ratings.filter(r => r.rating >= 1.5 && r.rating < 2.5).length,
      1: ratings.filter(r => r.rating < 1.5).length,
    };
    
    return { average, distribution };
  };

  const { average, distribution } = calculateAggregateStats();

  if (ratings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Star" size={32} className="text-success" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Ratings Received Yet</h3>
        <p className="text-text-secondary mb-6">
          Complete your profile and start networking to receive professional ratings.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/professional-profile"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
          >
            <Icon name="User" size={20} />
            Complete Profile
          </Link>
          <Link
            to="/professional-search-discovery"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border text-text-primary rounded-lg hover:bg-primary-50 hover:border-primary transition-smooth"
          >
            <Icon name="Users" size={20} />
            Find Professionals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregate Statistics */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Overall Rating</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-primary">{average.toFixed(1)}</div>
              <div>
                {renderStars(average)}
                <p className="text-sm text-text-secondary mt-1">
                  Based on {ratings.length} rating{ratings.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Rating Distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-sm w-8">{stars}★</span>
                  <div className="flex-1 bg-border rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{
                        width: `${ratings.length > 0 ? (distribution[stars] / ratings.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary w-8">{distribution[stars]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ratings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Recent Ratings</h3>
          <span className="text-sm text-text-secondary">
            {ratings.length} rating{ratings.length !== 1 ? 's' : ''} received
          </span>
        </div>

        {ratings.map((rating) => (
          <div
            key={rating.id}
            className="bg-surface border border-border rounded-lg p-6 hover:border-primary-200 transition-smooth"
          >
            <div className="flex items-start gap-4">
              <Image
                src={rating.avatar}
                alt={rating.raterName}
                className="w-12 h-12 rounded-full object-cover"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-text-primary mb-1">
                      {rating.raterName}
                    </h4>
                    <p className="text-sm text-text-secondary mb-1">
                      {rating.raterTitle} at {rating.company}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span>Category: {rating.category}</span>
                      <span>•</span>
                      <span>{rating.receivedDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {renderStars(rating.rating)}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-text-primary text-sm leading-relaxed whitespace-pre-line">
                    {rating.comment}
                  </p>
                </div>

                {/* Response Section */}
                {rating.hasResponded && rating.response && (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Icon name="MessageCircle" size={16} className="text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-primary mb-1">Your Response:</p>
                        <p className="text-sm text-text-primary">{rating.response}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Response Form */}
                {showResponseForm[rating.id] && !rating.hasResponded && (
                  <div className="border border-border rounded-lg p-4 mb-4">
                    <textarea
                      value={responseText[rating.id] || ''}
                      onChange={(e) => setResponseText(prev => ({ ...prev, [rating.id]: e.target.value }))}
                      placeholder="Write your response..."
                      rows={3}
                      className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button
                        onClick={() => setShowResponseForm(prev => ({ ...prev, [rating.id]: false }))}
                        className="px-4 py-2 text-sm text-text-secondary hover:text-primary transition-smooth"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResponseSubmit(rating.id)}
                        disabled={!responseText[rating.id]?.trim()}
                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
                      >
                        Submit Response
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rating.rating >= 4.5
                        ? 'bg-success-50 text-success'
                        : rating.rating >= 3.5
                        ? 'bg-warning-50 text-warning' :'bg-error-50 text-error'
                    }`}>
                      {rating.rating >= 4.5 ? 'Excellent' : rating.rating >= 3.5 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {rating.canRespond && !rating.hasResponded && (
                      <button
                        onClick={() => setShowResponseForm(prev => ({ ...prev, [rating.id]: true }))}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary-50 rounded-lg transition-smooth"
                      >
                        <Icon name="MessageCircle" size={14} />
                        Respond
                      </button>
                    )}
                    
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-primary-50 rounded-lg transition-smooth">
                      <Icon name="Flag" size={14} />
                      Report
                    </button>
                    
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-primary-50 rounded-lg transition-smooth">
                      <Icon name="Share2" size={14} />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingsReceivedTab;