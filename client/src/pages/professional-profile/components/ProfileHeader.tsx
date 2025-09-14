import React from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";

type Professional = {
  profileImage: string;
  name: string;
  isVerified: boolean;
  title: string;
  company: string;
  location: string;
  averageRating: number;
  totalRatings: number;
  linkedinUrl: string;
};

type ProfileHeaderProps = {
  professional: Professional;
  onRate: () => void;
  onShare: () => void;
};

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  professional,
  onRate,
  onShare,
}) => {
  const renderStars = (rating: number) => {
    const stars: React.ReactNode[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon
          key={i}
          name="Star"
          size={20}
          className="text-warning fill-current"
        />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Icon
          key="half"
          name="StarHalf"
          size={20}
          className="text-warning fill-current"
        />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Icon
          key={`empty-${i}`}
          name="Star"
          size={20}
          className="text-border-dark"
        />
      );
    }
    return stars;
  };

  return (
    <div className="bg-surface rounded-xl shadow-card p-6 border border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
        <div className="relative">
          <Image
            src={professional.profileImage}
            alt={professional.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
          />
          {professional.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-success rounded-full flex items-center justify-center border-2 border-surface">
              <Icon name="Check" size={16} color="white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                {professional.name}
              </h1>
              <p className="text-lg text-text-secondary mb-2">
                {professional.title}
              </p>
              <div className="flex items-center space-x-4 text-sm text-text-secondary">
                <div className="flex items-center space-x-1">
                  <Icon name="Building2" size={16} />
                  <span>{professional.company}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="MapPin" size={16} />
                  <span>{professional.location}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onShare}
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-lg transition-smooth"
            >
              <Icon name="Share2" size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-primary-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center space-x-1">
                {renderStars(professional.averageRating)}
              </div>
              <span className="text-2xl font-bold text-text-primary">
                {professional.averageRating}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Based on {professional.totalRatings} reviews
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary mb-1">
              {professional.totalRatings}
            </div>
            <p className="text-sm text-text-secondary">Total Ratings</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          onClick={onRate}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-smooth"
        >
          <Icon name="Star" size={20} />
          <span>Rate This Professional</span>
        </button>

        <a
          href={professional.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 px-6 py-3 border border-border text-text-primary font-medium rounded-lg hover:bg-primary-50 transition-smooth"
        >
          <Icon name="ExternalLink" size={20} />
          <span>View LinkedIn</span>
        </a>
      </div>
    </div>
  );
};

export default ProfileHeader;
