import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/AppIcon';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="AlertTriangle" size={48} className="text-primary" />
          </div>
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-text-primary mb-4">Page Not Found</h2>
          <p className="text-text-secondary mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/dashboard-home"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-smooth"
          >
            <Icon name="Home" size={20} className="mr-2" />
            Go to Dashboard
          </Link>
          
          <Link
            to="/professional-search-discovery"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-border text-text-primary font-medium rounded-lg hover:bg-primary-50 transition-smooth"
          >
            <Icon name="Search" size={20} className="mr-2" />
            Search Professionals
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;