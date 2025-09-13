import React from 'react';
import Icon from '../../../components/AppIcon';

const SearchHistory = ({ history, onSelect, onClear }) => {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-modal z-50">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Recent Searches
          </span>
          <button
            onClick={onClear}
            className="text-xs text-primary hover:text-primary-700 transition-smooth"
          >
            Clear All
          </button>
        </div>
        
        <div className="space-y-1">
          {history.slice(0, 5).map((query, index) => (
            <button
              key={index}
              onClick={() => onSelect(query)}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-smooth rounded-lg group"
            >
              <div className="flex items-center space-x-3">
                <Icon 
                  name="Clock" 
                  size={16} 
                  className="text-text-secondary group-hover:text-primary transition-smooth" 
                />
                <span className="text-text-primary group-hover:text-primary transition-smooth">
                  {query}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        {history.length > 5 && (
          <div className="px-3 py-2 text-xs text-text-secondary text-center border-t border-border mt-2">
            +{history.length - 5} more searches
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchHistory;