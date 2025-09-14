import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";

type Professional = {
  id: number;
  name: string;
  title: string;
  company: string;
  avatar: string;
  averageRating: number;
  totalRatings: number;
  topSkills: string[];
  recentAchievement: string;
  trending: boolean;
  location: string;
};

const TrendingProfessionals: React.FC = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const mockProfessionals: Professional[] = [
    {
      id: 1,
      name: "Emily Chen",
      title: "Senior Software Engineer",
      company: "Google",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      averageRating: 4.9,
      totalRatings: 127,
      topSkills: ["React", "Node.js", "System Design"],
      recentAchievement: "Led migration to microservices architecture",
      trending: true,
      location: "San Francisco, CA",
    },
  ];

  useEffect(() => {
    loadTrendingProfessionals();
  }, []);

  const loadTrendingProfessionals = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setProfessionals(mockProfessionals);
    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        name="Star"
        size={14}
        className={
          i < Math.floor(rating) ? "text-warning fill-current" : "text-border"
        }
      />
    ));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev + 3 >= professionals.length ? 0 : prev + 3
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev - 3 < 0 ? Math.max(0, professionals.length - 3) : prev - 3
    );
  };

  const visibleProfessionals = professionals.slice(
    currentIndex,
    currentIndex + 3
  );

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary flex items-center">
            <Icon name="TrendingUp" size={24} className="mr-3 text-accent" />
            Trending Professionals
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg border border-border hover:bg-background transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="ChevronLeft" size={16} />
            </button>
            <button
              onClick={nextSlide}
              disabled={currentIndex + 3 >= professionals.length}
              className="p-2 rounded-lg border border-border hover:bg-background transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>
        </div>
        <p className="text-text-secondary text-sm mt-1">
          Highly-rated professionals in your network
        </p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-background rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-border rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-border rounded w-3/4"></div>
                      <div className="h-3 bg-border rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-border rounded w-full"></div>
                    <div className="h-3 bg-border rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-12">
            <Icon
              name="TrendingUp"
              size={48}
              className="mx-auto text-border mb-4"
            />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No Trending Professionals
            </h3>
            <p className="text-text-secondary">
              Check back later for trending professionals in your network
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-3 gap-6">
              {visibleProfessionals.map((professional) => (
                <Link
                  key={professional.id}
                  to="/professional-profile"
                  className="bg-background rounded-lg p-4 hover:shadow-card transition-smooth border border-transparent hover:border-primary-200"
                >
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="relative">
                      <Image
                        src={professional.avatar}
                        alt={professional.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {professional.trending && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-surface flex items-center justify-center">
                          <Icon name="TrendingUp" size={8} color="white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary truncate">
                        {professional.name}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">
                        {professional.title}
                      </p>
                      <p className="text-xs text-text_secondary truncate">
                        {professional.company}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex items-center space-x-1">
                      {renderStars(professional.averageRating)}
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {professional.averageRating}
                    </span>
                    <span className="text-xs text-text-secondary">
                      ({professional.totalRatings})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {professional.topSkills.slice(0, 2).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-primary-50 text-primary px-2 py-1 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                    {professional.topSkills.length > 2 && (
                      <span className="text-xs text-text-secondary">
                        +{professional.topSkills.length - 2}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {professional.recentAchievement}
                  </p>
                </Link>
              ))}
            </div>

            <div className="lg:hidden">
              <div className="flex space-x-4 overflow-x-auto pb-4 -mx-2 px-2">
                {professionals.map((professional) => (
                  <Link
                    key={professional.id}
                    to="/professional-profile"
                    className="flex-none w-72 bg-background rounded-lg p-4 hover:shadow-card transition-smooth border border-transparent hover:border-primary-200"
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="relative">
                        <Image
                          src={professional.avatar}
                          alt={professional.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {professional.trending && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-surface flex items-center justify-center">
                            <Icon name="TrendingUp" size={8} color="white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">
                          {professional.name}
                        </h3>
                        <p className="text-sm text-text-secondary truncate">
                          {professional.title}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {professional.company}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(professional.averageRating)}
                      </div>
                      <span className="text_sm font-medium text-text-primary">
                        {professional.averageRating}
                      </span>
                      <span className="text-xs text-text-secondary">
                        ({professional.totalRatings})
                      </span>
                    </div>
                    <div className="flex flex_wrap gap-1 mb-3">
                      {professional.topSkills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="text-xs bg-primary-50 text-primary px-2 py-1 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {professional.recentAchievement}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/professional-search-discovery"
                className="inline-flex items-center text-primary hover:text-primary-700 font-medium transition-smooth"
              >
                View All Professionals
                <Icon name="ArrowRight" size={16} className="ml-2" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrendingProfessionals;
