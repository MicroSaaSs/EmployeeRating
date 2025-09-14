import React from "react";
import Icon from "../../../components/AppIcon";

type ClaimProfileBannerProps = {
  onClaim: () => void;
};

const ClaimProfileBanner: React.FC<ClaimProfileBannerProps> = ({ onClaim }) => {
  return (
    <div className="bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200 rounded-xl p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="UserCheck" size={24} color="white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Is this your professional profile?
          </h3>
          <p className="text-text-secondary mb-4 leading-relaxed">
            Claim your profile to manage your professional reputation, respond
            to reviews, and showcase your verified achievements. Verified
            profiles receive higher visibility and build more trust with
            potential collaborators.
          </p>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClaim}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-600 transition-smooth"
            >
              <Icon name="Shield" size={18} />
              <span>Claim This Profile</span>
            </button>

            <button className="flex items-center justify-center space-x-2 px-6 py-3 border border-accent-300 text-accent-700 font-medium rounded-lg hover:bg-accent-50 transition-smooth">
              <Icon name="HelpCircle" size={18} />
              <span>Learn More</span>
            </button>
          </div>
        </div>

        <button className="p-2 text-accent-600 hover:text-accent-700 hover:bg-accent-200 rounded-lg transition-smooth">
          <Icon name="X" size={20} />
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-accent-200">
        <h4 className="font-medium text-text-primary mb-3">
          Benefits of claiming your profile:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Icon
              name="Check"
              size={16}
              className="text-accent flex-shrink-0"
            />
            <span className="text-sm text-text-secondary">
              Respond to reviews
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon
              name="Check"
              size={16}
              className="text-accent flex-shrink-0"
            />
            <span className="text-sm text-text-secondary">
              Update profile information
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon
              name="Check"
              size={16}
              className="text-accent flex-shrink-0"
            />
            <span className="text-sm text-text-secondary">
              Verified badge display
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon
              name="Check"
              size={16}
              className="text-accent flex-shrink-0"
            />
            <span className="text-sm text-text-secondary">
              Analytics dashboard
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon
              name="Check"
              size={16}
              className="text-accent flex-shrink-0"
            />
            <span className="text-sm text-text-secondary">
              Higher search visibility
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon
              name="Check"
              size={16}
              className="text-accent flex-shrink-0"
            />
            <span className="text-sm text-text-secondary">
              Professional networking
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimProfileBanner;
