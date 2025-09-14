import React, { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";

type RatingGiven = {
  id: number | string;
  professionalName: string;
  professionalTitle: string;
  company: string;
  avatar: string;
  rating: number;
  category: string;
  comment: string;
  submittedDate: Date;
  canEdit: boolean;
  canDelete: boolean;
};

type RatingsGivenTabProps = { ratings: RatingGiven[] };

const RatingsGivenTab: React.FC<RatingsGivenTabProps> = ({ ratings }) => {
  const [selectedRatings, setSelectedRatings] = useState<
    Array<number | string>
  >([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleSelectRating = (ratingId: number | string) => {
    setSelectedRatings((prev) => {
      const newSelection = prev.includes(ratingId)
        ? prev.filter((id) => id !== ratingId)
        : [...prev, ratingId];
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedRatings.length === ratings.length) {
      setSelectedRatings([]);
      setShowBulkActions(false);
    } else {
      setSelectedRatings(ratings.map((r) => r.id));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRatings.length} rating(s)?`
      )
    ) {
      setSelectedRatings([]);
      setShowBulkActions(false);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Icon
            key={i}
            name="Star"
            size={16}
            className="text-warning fill-current"
          />
        ))}
        {hasHalfStar && (
          <Icon
            name="Star"
            size={16}
            className="text-warning fill-current opacity-50"
          />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon key={i} name="Star" size={16} className="text-border" />
        ))}
        <span className="ml-2 text-sm font-medium text-text-primary">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  if (ratings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="MessageSquare" size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No Ratings Given Yet
        </h3>
        <p className="text-text-secondary mb-6">
          Start building your professional network by rating colleagues and
          connections.
        </p>
        <Link
          to="/professional-search-discovery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
        >
          <Icon name="Plus" size={20} />
          Rate a Professional
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showBulkActions && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              {selectedRatings.length} rating(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 bg-error text-white text-sm rounded-lg hover:bg-error-700 transition-smooth"
              >
                <Icon name="Trash2" size={16} />
                Delete Selected
              </button>
              <button
                onClick={() => {
                  setSelectedRatings([]);
                  setShowBulkActions(false);
                }}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-primary transition-smooth"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedRatings.length === ratings.length}
            onChange={handleSelectAll}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
          />
          <span className="text-sm text-text-secondary">Select all</span>
        </label>
        <span className="text-sm text-text-secondary">
          {ratings.length} rating{ratings.length !== 1 ? "s" : ""} found
        </span>
      </div>

      <div className="space-y-4">
        {ratings.map((rating) => (
          <div
            key={rating.id}
            className={`bg-surface border rounded-lg p-6 transition-smooth ${
              selectedRatings.includes(rating.id)
                ? "border-primary bg-primary-50"
                : "border-border hover:border-primary-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <label className="flex items-center mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRatings.includes(rating.id)}
                  onChange={() => handleSelectRating(rating.id)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
              </label>

              <Image
                src={rating.avatar}
                alt={rating.professionalName}
                className="w-12 h-12 rounded-full object-cover"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">
                      {rating.professionalName}
                    </h3>
                    <p className="text-sm text-text-secondary mb-1">
                      {rating.professionalTitle} at {rating.company}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span>Category: {rating.category}</span>
                      <span>•</span>
                      <span>{rating.submittedDate.toLocaleDateString()}</span>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rating.rating >= 4.5
                          ? "bg-success-50 text-success"
                          : rating.rating >= 3.5
                          ? "bg-warning-50 text-warning"
                          : "bg-error-50 text-error"
                      }`}
                    >
                      {rating.rating >= 4.5
                        ? "Excellent"
                        : rating.rating >= 3.5
                        ? "Good"
                        : "Needs Improvement"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rating.canEdit && (
                      <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary-50 rounded-lg transition-smooth">
                        <Icon name="Edit2" size={14} />
                        Edit
                      </button>
                    )}
                    {rating.canDelete && (
                      <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-error hover:bg-error-50 rounded-lg transition-smooth">
                        <Icon name="Trash2" size={14} />
                        Delete
                      </button>
                    )}
                    <Link
                      to="/professional-profile"
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-primary-50 rounded-lg transition-smooth"
                    >
                      <Icon name="ExternalLink" size={14} />
                      View Profile
                    </Link>
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

export default RatingsGivenTab;
