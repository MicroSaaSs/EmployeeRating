// src/pages/professional-profile/components/RatingsSection.tsx
import React, { useState } from "react";
import Icon from "../../../components/AppIcon";
import {
  anonymizeReview,
  generateAnonymousTitle,
} from "../../../utils/companyVerification";

type Rating = {
  id: number | string;
  reviewerName: string;
  reviewerTitle?: string;
  reviewerImage?: string | null;
  reviewerCompany?: string;
  relationshipType?: string;
  rating: number;
  category: string;
  date: string;
  helpfulVotes: number;
  comment: string;
  categories?: Record<string, number>;
};

type Tab = { id: string; label: string; count: number };

type RatingsSectionProps = {
  ratings: Rating[];
  filterTabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  totalRatings: number;
  averageRating: number;
};

const RatingsSection: React.FC<RatingsSectionProps> = ({
  ratings,
  filterTabs,
  activeTab,
  onTabChange,
  totalRatings,
  averageRating,
}) => {
  const [helpfulVotes, setHelpfulVotes] = useState<
    Record<string | number, boolean>
  >({});
  const [reportedReviews, setReportedReviews] = useState<Set<string | number>>(
    new Set()
  );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        name="Star"
        size={16}
        className={
          i + 1 <= rating ? "text-warning fill-current" : "text-border-dark"
        }
      />
    ));
  };

  const handleHelpfulVote = (reviewId: string | number, isHelpful: boolean) => {
    setHelpfulVotes((prev) => ({ ...prev, [reviewId]: isHelpful }));
  };

  const handleReportReview = (reviewId: string | number) => {
    setReportedReviews((prev) => new Set([...prev, reviewId]));
    alert("Review reported. Thank you for helping maintain quality standards.");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      technical: "bg-blue-50 text-blue-700 border-blue-200",
      communication: "bg-green-50 text-green-700 border-green-200",
      leadership: "bg-purple-50 text-purple-700 border-purple-200",
      teamwork: "bg-orange-50 text-orange-700 border-orange-200",
      overall: "bg-primary-50 text-primary border-primary-200",
    };
    return colors[category] || colors.overall;
  };

  const anonymizedRatings = ratings.map((review) => {
    const anonymized = anonymizeReview(review as any) as any;
    if (review.relationshipType && review.reviewerCompany) {
      anonymized.reviewerTitle = generateAnonymousTitle(
        review.relationshipType,
        review.reviewerCompany
      );
    }
    return anonymized as Rating;
  });

  return (
    <div className="bg-surface rounded-xl shadow-card border border-border">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold text-text-primary">
              Reviews & Ratings
            </h3>
            <div className="bg-success-50 border border-success-200 rounded-full px-3 py-1">
              <div className="flex items-center space-x-2">
                <Icon name="Shield" size={14} className="text-success" />
                <span className="text-xs font-medium text-success">
                  Anonymous & Verified
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <span className="font-semibold text-text-primary">
                {averageRating}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {totalRatings} verified colleague reviews
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-primary-50 text-primary hover:bg-primary-100"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border">
        {anonymizedRatings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Icon
              name="MessageSquare"
              size={48}
              className="text-border-dark mx-auto mb-4"
            />
            <h4 className="text-lg font-medium text-text-primary mb-2">
              No reviews in this category
            </h4>
            <p className="text-text-secondary mb-4">
              Only verified colleagues can leave reviews in this category.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 max-w-md mx-auto">
              <p className="text-primary text-sm">
                Reviews are anonymous and only from verified colleagues who have
                worked at the same company.
              </p>
            </div>
          </div>
        ) : (
          anonymizedRatings.map((review) => (
            <div key={review.id} className="px-6 py-6">
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Icon name="User" size={20} className="text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-text-primary">
                          {review.reviewerName}
                        </h4>
                        <div className="bg-success-50 border border-success-200 rounded-full px-2 py-0.5">
                          <div className="flex items-center space-x-1">
                            <Icon
                              name="Shield"
                              size={12}
                              className="text-success"
                            />
                            <span className="text-xs font-medium text-success">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-2">
                        {review.reviewerTitle}
                      </p>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          {renderStars(review.rating)}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(
                            review.category
                          )}`}
                        >
                          {review.category.charAt(0).toUpperCase() +
                            review.category.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">
                        {formatDate(review.date)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-text-primary leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                  {review.categories && (
                    <div className="mb-4 p-3 bg-background rounded-lg">
                      <h5 className="text-sm font-medium text-text-primary mb-2">
                        Category Ratings:
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(review.categories).map(
                          ([category, rating]) => (
                            <div
                              key={category}
                              className="flex items-center justify-between"
                            >
                              <span className="text-text-secondary capitalize">
                                {category}:
                              </span>
                              <div className="flex items-center space-x-1">
                                {renderStars(Number(rating))}
                                <span className="text-text-primary font-medium ml-1">
                                  {rating as any}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleHelpfulVote(review.id, true)}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-smooth ${
                            helpfulVotes[review.id] === true
                              ? "bg-success-50 text-success border border-success-200"
                              : "text-text-secondary hover:text-success hover:bg-success-50"
                          }`}
                        >
                          <Icon name="ThumbsUp" size={14} />
                          <span>Helpful</span>
                        </button>
                        <button
                          onClick={() => handleHelpfulVote(review.id, false)}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-smooth ${
                            helpfulVotes[review.id] === false
                              ? "bg-error-50 text-error border border-error-200"
                              : "text-text-secondary hover:text-error hover:bg-error-50"
                          }`}
                        >
                          <Icon name="ThumbsDown" size={14} />
                          <span>Not Helpful</span>
                        </button>
                      </div>
                      <span className="text-sm text-text-secondary">
                        {review.helpfulVotes} found this helpful
                      </span>
                    </div>
                    <button
                      onClick={() => handleReportReview(review.id)}
                      disabled={reportedReviews.has(review.id)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-smooth ${
                        reportedReviews.has(review.id)
                          ? "text-text-secondary cursor-not-allowed"
                          : "text-text-secondary hover:text-error hover:bg-error-50"
                      }`}
                    >
                      <Icon name="Flag" size={14} />
                      <span>
                        {reportedReviews.has(review.id) ? "Reported" : "Report"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-6 py-4 border-t border-border">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Icon name="Info" size={20} className="text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-primary mb-1">
                Anonymous & Verified Reviews
              </h4>
              <p className="text-primary text-sm">
                All reviews are completely anonymous and only from verified
                colleagues who have worked at the same company. This ensures
                authentic, relevant feedback while protecting reviewer privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
      {anonymizedRatings.length > 0 && (
        <div className="px-6 py-4 border-t border-border text-center">
          <button className="px-6 py-2 text-primary font-medium hover:bg-primary-50 rounded-lg transition-smooth">
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default RatingsSection;
