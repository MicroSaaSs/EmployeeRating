import React from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import type { Professional } from "../index";

type ProfessionalCardProps = {
  professional: Professional;
  onClick: (prof: Professional) => void;
  onRate: (prof: Professional) => void;
  onPreview?: (prof: Professional) => void;
};

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  professional,
  onClick,
  onRate,
  onPreview,
}) => {
  const {
    name,
    title,
    company,
    avatar,
    rating,
    reviewCount,
    skills,
    verified,
    responseRate,
    lastActive,
  } = professional;

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick(professional);
  };

  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRate(professional);
  };
  const handlePreviewHover = () => {
    onPreview?.(professional);
  };

  const getLastActiveColor = () => {
    if (lastActive.includes("hour")) return "text-success";
    if (lastActive.includes("day")) return "text-warning";
    return "text-text-secondary";
  };

  return (
    <div
      className="bg-surface rounded-lg border border-border hover:border-primary-200 hover:shadow-card transition-all duration-200 cursor-pointer group overflow-hidden min-h-[260px] min-w-[260px]"
      onClick={handleCardClick}
      onMouseEnter={handlePreviewHover}
    >
      <div className="p-6 flex flex-col h-full">
        {/* Row 1: Avatar + Rating with reviewCount */}
        <div className="flex items-center stretch mb-3">
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
          <div className="flex flex-col items-end w-full space-y-1">
            <div className="flex items-end space-x-1">
              <Icon
                name="Star"
                size={34}
                className="text-yellow-400 fill-current"
              />
              <span className="font-semibold text-text-primary text-xl md:text-2xl leading-none">
                {rating}
              </span>
            </div>
            <span className="text-sm md:text-base text-text-secondary">
              ({reviewCount} reviews)
            </span>
          </div>
        </div>

        {/* Row 2: Name + lastActive */}
        <div className="flex items-center justify-between gap-3 mb-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{name}</h3>
        </div>

        {/* Row 3: Title */}
        <p className="text-text-secondary text-sm truncate mb-1">{title}</p>

        {/* Row 4: Company */}
        <div className="flex items-center space-x-2 text-sm text-text-secondary mb-3">
          <Icon name="Building" size={14} />
          <span className="truncate">{company}</span>
        </div>

        <div>
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
        <div className="flex items-center justify-between text-sm mt-auto pt-2">
          <div className="flex items-center space-x-1">
            <Icon name="TrendingUp" size={14} className="text-success" />
            <span className="text-text-secondary">
              {responseRate}% response
            </span>
          </div>
          <div>
            <button
              onClick={handleRateClick}
              className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-primary-50 hover:border-primary-200 transition-smooth text-sm font-medium"
            >
              <Icon name="Star" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-b-lg"></div>
    </div>
  );
};

export default ProfessionalCard;
