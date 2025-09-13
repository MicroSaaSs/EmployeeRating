import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Image from '../../components/AppImage';
import SearchFilters from './components/SearchFilters';
import ProfessionalCard from './components/ProfessionalCard';
import MapView from './components/MapView';
import SearchHistory from './components/SearchHistory';

const ProfessionalSearchDiscovery = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMapView, setIsMapView] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [isLoading, setIsLoading] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [filters, setFilters] = useState({
    location: '',
    industry: '',
    experienceLevel: '',
    ratingRange: [0, 5],
    companySize: ''
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Mock data for professionals
  const mockProfessionals = [
    {
      id: 1,
      name: "Sarah Johnson",
      title: "Senior Software Engineer",
      company: "Google",
      location: "San Francisco, CA",
      industry: "Technology",
      experienceLevel: "Senior",
      companySize: "Large",
      avatar: "https://randomuser.me/api/portraits/women/1.jpg",
      rating: 4.8,
      reviewCount: 127,
      skills: ["React", "JavaScript", "Node.js", "Python"],
      recentRatings: [
        { rating: 5, comment: "Excellent technical skills and leadership", date: "2024-01-15" },
        { rating: 4, comment: "Great team player", date: "2024-01-10" }
      ],
      verified: true,
      responseRate: 95,
      lastActive: "2 hours ago"
    },
    {
      id: 2,
      name: "Michael Chen",
      title: "Product Manager",
      company: "Microsoft",
      location: "Seattle, WA",
      industry: "Technology",
      experienceLevel: "Mid-level",
      companySize: "Large",
      avatar: "https://randomuser.me/api/portraits/men/2.jpg",
      rating: 4.6,
      reviewCount: 89,
      skills: ["Product Strategy", "Agile", "Data Analysis", "Leadership"],
      recentRatings: [
        { rating: 5, comment: "Outstanding product vision", date: "2024-01-12" },
        { rating: 4, comment: "Strong analytical skills", date: "2024-01-08" }
      ],
      verified: true,
      responseRate: 88,
      lastActive: "1 day ago"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      title: "UX Designer",
      company: "Adobe",
      location: "Austin, TX",
      industry: "Design",
      experienceLevel: "Senior",
      companySize: "Large",
      avatar: "https://randomuser.me/api/portraits/women/3.jpg",
      rating: 4.9,
      reviewCount: 156,
      skills: ["UI/UX Design", "Figma", "User Research", "Prototyping"],
      recentRatings: [
        { rating: 5, comment: "Incredible design thinking", date: "2024-01-14" },
        { rating: 5, comment: "User-centered approach", date: "2024-01-11" }
      ],
      verified: true,
      responseRate: 92,
      lastActive: "3 hours ago"
    },
    {
      id: 4,
      name: "David Kim",
      title: "Data Scientist",
      company: "Netflix",
      location: "Los Angeles, CA",
      industry: "Entertainment",
      experienceLevel: "Senior",
      companySize: "Large",
      avatar: "https://randomuser.me/api/portraits/men/4.jpg",
      rating: 4.7,
      reviewCount: 98,
      skills: ["Machine Learning", "Python", "SQL", "Statistics"],
      recentRatings: [
        { rating: 5, comment: "Expert in ML algorithms", date: "2024-01-13" },
        { rating: 4, comment: "Great problem solver", date: "2024-01-09" }
      ],
      verified: true,
      responseRate: 90,
      lastActive: "5 hours ago"
    },
    {
      id: 5,
      name: "Lisa Thompson",
      title: "Marketing Director",
      company: "Salesforce",
      location: "New York, NY",
      industry: "Technology",
      experienceLevel: "Senior",
      companySize: "Large",
      avatar: "https://randomuser.me/api/portraits/women/5.jpg",
      rating: 4.5,
      reviewCount: 73,
      skills: ["Digital Marketing", "Brand Strategy", "Analytics", "Leadership"],
      recentRatings: [
        { rating: 4, comment: "Strong marketing strategy", date: "2024-01-16" },
        { rating: 5, comment: "Excellent team leadership", date: "2024-01-07" }
      ],
      verified: true,
      responseRate: 85,
      lastActive: "1 hour ago"
    },
    {
      id: 6,
      name: "James Wilson",
      title: "DevOps Engineer",
      company: "Amazon",
      location: "Seattle, WA",
      industry: "Technology",
      experienceLevel: "Mid-level",
      companySize: "Large",
      avatar: "https://randomuser.me/api/portraits/men/6.jpg",
      rating: 4.4,
      reviewCount: 64,
      skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
      recentRatings: [
        { rating: 4, comment: "Solid DevOps knowledge", date: "2024-01-15" },
        { rating: 5, comment: "Great automation skills", date: "2024-01-06" }
      ],
      verified: false,
      responseRate: 78,
      lastActive: "2 days ago"
    }
  ];

  const mockSuggestions = [
    "Software Engineer", "Product Manager", "UX Designer", "Data Scientist",
    "Marketing Director", "DevOps Engineer", "Frontend Developer", "Backend Developer",
    "Full Stack Developer", "Business Analyst", "Project Manager", "Scrum Master"
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'recent', label: 'Recently Active' },
    { value: 'alphabetical', label: 'A-Z' }
  ];

  useEffect(() => {
    setProfessionals(mockProfessionals);
    setFilteredProfessionals(mockProfessionals);
    
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [professionals, filters, sortBy, searchQuery]);

  const applyFiltersAndSort = () => {
    let filtered = [...professionals];

    // Apply search query filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(prof => 
        prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply other filters
    if (filters.location) {
      filtered = filtered.filter(prof => prof.location.includes(filters.location));
    }
    if (filters.industry) {
      filtered = filtered.filter(prof => prof.industry === filters.industry);
    }
    if (filters.experienceLevel) {
      filtered = filtered.filter(prof => prof.experienceLevel === filters.experienceLevel);
    }
    if (filters.companySize) {
      filtered = filtered.filter(prof => prof.companySize === filters.companySize);
    }
    if (filters.ratingRange) {
      filtered = filtered.filter(prof => 
        prof.rating >= filters.ratingRange[0] && prof.rating <= filters.ratingRange[1]
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Keep relevance order (default)
        break;
    }

    setFilteredProfessionals(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    setShowSearchHistory(false);
    
    // Add to search history
    if (query.trim() && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.slice(0, 9)];
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
    
    // Update URL params
    if (query.trim()) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        const filtered = mockSuggestions.filter(suggestion =>
          suggestion.toLowerCase().includes(value.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 5));
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);
  };

  const handleProfessionalClick = (professional) => {
    navigate('/professional-profile', { state: { professional } });
  };

  const handleRateProfessional = (professional) => {
    navigate('/rate-professional', { state: { professional } });
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      industry: '',
      experienceLevel: '',
      ratingRange: [0, 5],
      companySize: ''
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-16 pb-20 md:pb-8">
        {/* Mobile Search Header */}
        <div className="md:hidden bg-surface border-b border-border p-4">
          <div className="relative">
            <div className="relative">
              <Icon 
                name="Search" 
                size={20} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search professionals..."
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => setShowSearchHistory(true)}
                className="w-full pl-10 pr-12 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary"
                >
                  <Icon name="X" size={20} />
                </button>
              )}
            </div>
            
            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-modal z-50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-smooth border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon name="Search" size={16} className="text-text-secondary" />
                      <span className="text-text-primary">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Search History */}
            {showSearchHistory && searchHistory.length > 0 && !showSuggestions && (
              <SearchHistory 
                history={searchHistory}
                onSelect={handleSearch}
                onClear={() => {
                  setSearchHistory([]);
                  localStorage.removeItem('searchHistory');
                }}
              />
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Search and Controls */}
          <div className="hidden md:block py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 max-w-2xl relative">
                <div className="relative">
                  <Icon 
                    name="Search" 
                    size={20} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search professionals by name, title, company, or skills..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => setShowSearchHistory(true)}
                    className="w-full pl-10 pr-12 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary"
                    >
                      <Icon name="X" size={20} />
                    </button>
                  )}
                </div>
                
                {/* Desktop Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-modal z-50">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-smooth border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon name="Search" size={16} className="text-text-secondary" />
                          <span className="text-text-primary">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Desktop Search History */}
                {showSearchHistory && searchHistory.length > 0 && !showSuggestions && (
                  <SearchHistory 
                    history={searchHistory}
                    onSelect={handleSearch}
                    onClear={() => {
                      setSearchHistory([]);
                      localStorage.removeItem('searchHistory');
                    }}
                  />
                )}
              </div>
              
              <div className="flex items-center space-x-4 ml-6">
                <button
                  onClick={() => setIsMapView(!isMapView)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-smooth ${
                    isMapView 
                      ? 'bg-primary text-white border-primary' :'bg-surface text-text-primary border-border hover:bg-primary-50'
                  }`}
                >
                  <Icon name={isMapView ? "List" : "Map"} size={20} />
                  <span>{isMapView ? "List View" : "Map View"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-primary-50 transition-smooth"
              >
                <Icon name="Filter" size={20} />
                <span>Filters</span>
                {Object.values(filters).some(value => value && value !== '' && !(Array.isArray(value) && value[0] === 0 && value[1] === 5)) && (
                  <span className="bg-primary text-white text-xs rounded-full px-2 py-1">
                    Active
                  </span>
                )}
              </button>
              
              <div className="md:hidden">
                <button
                  onClick={() => setIsMapView(!isMapView)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-smooth ${
                    isMapView 
                      ? 'bg-primary text-white border-primary' :'bg-surface text-text-primary border-border hover:bg-primary-50'
                  }`}
                >
                  <Icon name={isMapView ? "List" : "Map"} size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary text-sm">
                {filteredProfessionals.length} professionals found
              </span>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex">
            {/* Filters Sidebar */}
            <SearchFilters
              isOpen={isFiltersOpen}
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setIsFiltersOpen(false)}
              onClear={clearFilters}
            />

            {/* Results Area */}
            <div className="flex-1 min-w-0">
              {isMapView ? (
                <MapView 
                  professionals={filteredProfessionals}
                  onProfessionalClick={handleProfessionalClick}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {isLoading ? (
                    // Skeleton loading
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="bg-surface rounded-lg border border-border p-6 animate-pulse">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))
                  ) : filteredProfessionals.length > 0 ? (
                    filteredProfessionals.map((professional) => (
                      <ProfessionalCard
                        key={professional.id}
                        professional={professional}
                        onClick={() => handleProfessionalClick(professional)}
                        onRate={() => handleRateProfessional(professional)}
                        onPreview={setSelectedProfessional}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon name="Search" size={48} className="text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        No professionals found
                      </h3>
                      <p className="text-text-secondary mb-6">
                        Try adjusting your search criteria or filters
                      </p>
                      <button
                        onClick={clearFilters}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Preview Panel */}
            {selectedProfessional && (
              <div className="hidden lg:block w-80 border-l border-border bg-surface p-6">
                <div className="sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text-primary">Quick Preview</h3>
                    <button
                      onClick={() => setSelectedProfessional(null)}
                      className="text-text-secondary hover:text-primary"
                    >
                      <Icon name="X" size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={selectedProfessional.avatar}
                        alt={selectedProfessional.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-text-primary">{selectedProfessional.name}</h4>
                        <p className="text-sm text-text-secondary">{selectedProfessional.title}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon
                            key={i}
                            name="Star"
                            size={16}
                            className={i < Math.floor(selectedProfessional.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{selectedProfessional.rating}</span>
                      <span className="text-sm text-text-secondary">({selectedProfessional.reviewCount} reviews)</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon name="Building" size={16} className="text-text-secondary" />
                        <span>{selectedProfessional.company}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon name="MapPin" size={16} className="text-text-secondary" />
                        <span>{selectedProfessional.location}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-text-primary mb-2">Skills</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfessional.skills.slice(0, 4).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-50 text-primary text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => handleProfessionalClick(selectedProfessional)}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
                      >
                        View Full Profile
                      </button>
                      <button
                        onClick={() => handleRateProfessional(selectedProfessional)}
                        className="w-full px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-primary-50 transition-smooth"
                      >
                        Rate Professional
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalSearchDiscovery;