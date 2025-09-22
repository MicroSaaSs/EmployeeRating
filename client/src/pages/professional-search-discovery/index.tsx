import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";
import Image from "../../components/AppImage";
import SearchFilters from "./components/SearchFilters";
import ProfessionalCard from "./components/ProfessionalCard";
import MapView from "./components/MapView";
import SearchHistory from "./components/SearchHistory";
import { getApiBaseUrl } from "../../utils/auth";

export type Professional = {
  id: number;
  name: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  experienceLevel: string;
  companySize: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  skills: string[];
  verified: boolean;
  responseRate: number;
  lastActive: string;
  recentRatings?: Array<{ rating: number; comment: string; date: string }>;
};

type FiltersState = {
  location: string;
  industry: string;
  experienceLevel: string;
  ratingRange: [number, number];
  companySize: string;
  verified?: boolean;
  responseRate?: string;
};

const ProfessionalSearchDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("q") || ""
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isMapView, setIsMapView] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    "relevance" | "rating" | "recent" | "alphabetical"
  >("relevance");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<
    Professional[]
  >([]);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    location: "",
    industry: "",
    experienceLevel: "",
    ratingRange: [0, 5],
    companySize: "",
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  /* Mock removed
  const mockProfessionals: Professional[] = [ ... ];
  */

  /* Mock removed
  const mockSuggestions = [ ... ];
  */

  const sortOptions: Array<{ value: typeof sortBy; label: string }> = [
    { value: "relevance", label: "Most Relevant" },
    { value: "rating", label: "Highest Rated" },
    { value: "recent", label: "Recently Active" },
    { value: "alphabetical", label: "A-Z" },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${getApiBaseUrl()}/users/search`, {
          credentials: "include",
        });
        const data = await res.json();
        const list = (data?.professionals || []) as Professional[];
        setProfessionals(list);
        setFilteredProfessionals(list);
      } catch (e) {
        console.error(e);
        setProfessionals([]);
        setFilteredProfessionals([]);
      } finally {
        setIsLoading(false);
      }
    };
    init();
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [professionals, filters, sortBy, searchQuery]);

  const applyFiltersAndSort = () => {
    let filtered = [...professionals];
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (prof) =>
          prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.skills.some((skill) =>
            skill.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }
    if (filters.location) {
      filtered = filtered.filter((prof) =>
        prof.location.includes(filters.location)
      );
    }
    if (filters.industry) {
      filtered = filtered.filter((prof) => prof.industry === filters.industry);
    }
    if (filters.experienceLevel) {
      filtered = filtered.filter(
        (prof) => prof.experienceLevel === filters.experienceLevel
      );
    }
    if (filters.companySize) {
      filtered = filtered.filter(
        (prof) => prof.companySize === filters.companySize
      );
    }
    if (filters.ratingRange) {
      filtered = filtered.filter(
        (prof) =>
          prof.rating >= filters.ratingRange[0] &&
          prof.rating <= filters.ratingRange[1]
      );
    }
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "recent":
        filtered.sort(
          (a, b) =>
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    setFilteredProfessionals(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    setShowSearchHistory(false);
    if (query.trim() && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.slice(0, 9)];
      setSearchHistory(newHistory);
      localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    }
    if (query.trim()) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      const fetchSuggestions = async () => {
        if (!value.trim()) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/users/suggestions?q=${encodeURIComponent(
              value
            )}`,
            { credentials: "include" }
          );
          const data = await res.json();
          const suggestions = (data?.suggestions || []) as string[];
          setSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } catch (e) {
          console.error(e);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      };
      fetchSuggestions();
    }, 300);
  };

  const handleProfessionalClick = (professional: Professional) => {
    navigate(`/professional-profile?id=${professional.id}`);
  };

  const handleRateProfessional = (professional: Professional) => {
    navigate(
      `/rate-professional?id=${professional.id}&name=${encodeURIComponent(
        professional.name
      )}`
    );
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      industry: "",
      experienceLevel: "",
      ratingRange: [0, 5],
      companySize: "",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-16 pb-20 md:pb-8">
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
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary"
                >
                  <Icon name="X" size={20} />
                </button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-modal z-50">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSearch(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-smooth border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        name="Search"
                        size={16}
                        className="text-text-secondary"
                      />
                      <span className="text-text-primary">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSearchHistory &&
              searchHistory.length > 0 &&
              !showSuggestions && (
                <SearchHistory
                  history={searchHistory}
                  onSelect={handleSearch}
                  onClear={() => {
                    setSearchHistory([]);
                    localStorage.removeItem("searchHistory");
                  }}
                />
              )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                      onClick={() => handleSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary"
                    >
                      <Icon name="X" size={20} />
                    </button>
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top_full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-modal z-50">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSearch(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-smooth border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon
                            name="Search"
                            size={16}
                            className="text-text-secondary"
                          />
                          <span className="text-text-primary">
                            {suggestion}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSearchHistory &&
                  searchHistory.length > 0 &&
                  !showSuggestions && (
                    <SearchHistory
                      history={searchHistory}
                      onSelect={handleSearch}
                      onClear={() => {
                        setSearchHistory([]);
                        localStorage.removeItem("searchHistory");
                      }}
                    />
                  )}
              </div>

              <div className="flex items-center space-x-4 ml-6">
                <button
                  onClick={() => setIsMapView(!isMapView)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-smooth ${
                    isMapView
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-primary border-border hover:bg-primary-50"
                  }`}
                >
                  <Icon name={isMapView ? "List" : "Map"} size={20} />
                  <span>{isMapView ? "List View" : "Map View"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-primary-50 transition-smooth"
              >
                <Icon name="Filter" size={20} />
                <span>Filters</span>
                {Object.values(filters).some(
                  (value) =>
                    value &&
                    value !== "" &&
                    !(Array.isArray(value) && value[0] === 0 && value[1] === 5)
                ) && (
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
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-primary border-border hover:bg-primary-50"
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
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex">
            <SearchFilters
              isOpen={isFiltersOpen}
              filters={filters}
              onFiltersChange={setFilters as any}
              onClose={() => setIsFiltersOpen(false)}
              onClear={clearFilters}
            />

            <div className="flex-1 min-w-0">
              {isMapView ? (
                <MapView
                  professionals={filteredProfessionals}
                  onProfessionalClick={handleProfessionalClick}
                />
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-stretch gap-3 p-4">
                  {isLoading &&
                    [0, 1, 2, 3, 4, 5].map((id) => (
                      <div
                        key={`skeleton-${id}`}
                        className="bg-surface rounded-lg border border-border p-6 animate-pulse"
                      >
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
                    ))}

                  {!isLoading &&
                    filteredProfessionals.length > 0 &&
                    filteredProfessionals.map((professional) => (
                      <ProfessionalCard
                        key={professional.id}
                        professional={professional}
                        onClick={() => handleProfessionalClick(professional)}
                        onRate={() => handleRateProfessional(professional)}
                        onPreview={setSelectedProfessional as any}
                      />
                    ))}

                  {!isLoading && filteredProfessionals.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon
                          name="Search"
                          size={48}
                          className="text-primary"
                        />
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

            {selectedProfessional && (
              <div className="hidden lg:block w-80 border-l border-border bg-surface p-6">
                <div className="sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text-primary">
                      Quick Preview
                    </h3>
                    <button
                      onClick={() => setSelectedProfessional(null)}
                      className="text-text-secondary hover:text-primary"
                    >
                      <Icon name="X" size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items_center space-x-3">
                      <Image
                        src={selectedProfessional.avatar}
                        alt={selectedProfessional.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-text-primary">
                          {selectedProfessional.name}
                        </h4>
                        <p className="text-sm text-text-secondary">
                          {selectedProfessional.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon
                            key={`star-${selectedProfessional.id}-${i}`}
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
                      <span className="text-sm font-medium">
                        {selectedProfessional.rating}
                      </span>
                      <span className="text-sm text-text-secondary">
                        ({selectedProfessional.reviewCount} reviews)
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon
                          name="Building"
                          size={16}
                          className="text-text-secondary"
                        />
                        <span>{selectedProfessional.company}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon
                          name="MapPin"
                          size={16}
                          className="text-text-secondary"
                        />
                        <span>{selectedProfessional.location}</span>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-text-primary mb-2">
                        Skills
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfessional.skills
                          .slice(0, 4)
                          .map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-1 bg-primary-50 text-primary text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>

                    {selectedProfessional.recentRatings &&
                      selectedProfessional.recentRatings.length > 0 && (
                        <div>
                          <h5 className="font-medium text-text-primary mb-2">
                            Recent Feedback
                          </h5>
                          <div className="space-y-2">
                            {selectedProfessional.recentRatings
                              .slice(0, 2)
                              .map((review) => (
                                <div
                                  key={`${review.date}-${review.comment}`}
                                  className="flex items-start space-x-2"
                                >
                                  <div className="flex items-center">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Icon
                                        key={`review-star-${review.date}-${i}`}
                                        name="Star"
                                        size={12}
                                        className={
                                          i < review.rating
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-300"
                                        }
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-text-secondary line-clamp-2 flex-1">
                                    "{review.comment}"
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    <div className="space-y-2">
                      <button
                        onClick={() =>
                          handleProfessionalClick(selectedProfessional)
                        }
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
                      >
                        View Full Profile
                      </button>
                      <button
                        onClick={() =>
                          handleRateProfessional(selectedProfessional)
                        }
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
