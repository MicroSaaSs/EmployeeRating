import React, { useState } from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import type { Professional } from "../index";

type MapViewProps = {
  professionals: Professional[];
  onProfessionalClick: (prof: Professional) => void;
};

const MapView: React.FC<MapViewProps> = ({
  professionals,
  onProfessionalClick,
}) => {
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);

  const getCoordinates = (location: string) => {
    const locationCoords: Record<string, { lat: number; lng: number }> = {
      "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
      "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
      "Austin, TX": { lat: 30.2672, lng: -97.7431 },
      "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
      "New York, NY": { lat: 40.7128, lng: -74.006 },
      "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
      "Boston, MA": { lat: 42.3601, lng: -71.0589 },
      "Denver, CO": { lat: 39.7392, lng: -104.9903 },
    };
    return locationCoords[location] || { lat: 37.7749, lng: -122.4194 };
  };

  const handleMarkerClick = (professional: Professional) => {
    setSelectedProfessional(professional);
  };

  const handleViewProfile = (professional: Professional) => {
    onProfessionalClick(professional);
  };

  const centerCoords =
    professionals.length > 0
      ? getCoordinates(professionals[0].location)
      : { lat: 37.7749, lng: -122.4194 };

  return (
    <div className="relative h-96 md:h-[600px] bg-gray-100 rounded-lg overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        loading="lazy"
        title="Professionals Map"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps?q=${centerCoords.lat},${centerCoords.lng}&z=10&output=embed`}
        className="border-0"
      />

      <div className="absolute top-4 right-4 bg-surface rounded-lg shadow-modal p-2">
        <div className="flex flex-col space-y-2">
          <button className="p-2 hover:bg-primary-50 rounded transition-smooth">
            <Icon name="Plus" size={20} className="text-text-primary" />
          </button>
          <button className="p-2 hover:bg-primary-50 rounded transition-smooth">
            <Icon name="Minus" size={20} className="text-text-primary" />
          </button>
          <button className="p-2 hover:bg-primary-50 rounded transition-smooth">
            <Icon name="Locate" size={20} className="text-text-primary" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-surface rounded-lg shadow-modal max-h-48 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify_between mb-3">
            <h3 className="font-semibold text-text-primary">
              Professionals in View ({professionals.length})
            </h3>
            <button className="text-text-secondary hover:text-primary">
              <Icon name="ChevronUp" size={20} />
            </button>
          </div>

          <div className="space-y-3 max-h-32 overflow-y-auto">
            {professionals.map((professional) => (
              <div
                key={professional.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-primary-50 cursor-pointer transition-smooth"
                onClick={() => handleMarkerClick(professional)}
              >
                <div className="relative">
                  <Image
                    src={professional.avatar}
                    alt={professional.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {professional.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-0.5">
                      <Icon name="Check" size={8} color="white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-text-primary text-sm truncate">
                      {professional.name}
                    </h4>
                    <div className="flex items-center space-x-1">
                      <Icon
                        name="Star"
                        size={12}
                        className="text-yellow-400 fill-current"
                      />
                      <span className="text-xs font-medium">
                        {professional.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary truncate">
                    {professional.title} at {professional.company}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(professional);
                  }}
                  className="px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-primary-700 transition-smooth"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedProfessional && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-modal max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">
                Professional Details
              </h3>
              <button
                onClick={() => setSelectedProfessional(null)}
                className="text-text-secondary hover:text-primary"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Image
                    src={selectedProfessional.avatar}
                    alt={selectedProfessional.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {selectedProfessional.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-1">
                      <Icon name="Check" size={12} color="white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-text-primary">
                      {selectedProfessional.name}
                    </h4>
                    {selectedProfessional.verified && (
                      <Icon
                        name="CheckCircle"
                        size={16}
                        className="text-success"
                      />
                    )}
                  </div>
                  <p className="text-text_secondary text-sm mb-1">
                    {selectedProfessional.title}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {selectedProfessional.company}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify_between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        name="Star"
                        size={16}
                        className={
                          i < Math.floor(selectedProfessional.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <span className="font-medium">
                    {selectedProfessional.rating}
                  </span>
                  <span className="text-text-secondary text-sm">
                    ({selectedProfessional.reviewCount} reviews)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Icon
                    name="MapPin"
                    size={16}
                    className="text-text-secondary"
                  />
                  <span>{selectedProfessional.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Icon name="TrendingUp" size={16} className="text-success" />
                  <span>
                    {selectedProfessional.responseRate}% response rate
                  </span>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => handleViewProfile(selectedProfessional)}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
                >
                  View Full Profile
                </button>
                <button
                  onClick={() => setSelectedProfessional(null)}
                  className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-primary-50 transition-smooth"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
