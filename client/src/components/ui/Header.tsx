import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../AppIcon";
import Image from "../AppImage";
import { useAuth } from "../../providers/AuthProvider";

const Header: React.FC = () => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount] = useState(3);

  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const navigationItems = [
    { label: "Dashboard", path: "/dashboard-home", icon: "Home" as const },
    {
      label: "Search",
      path: "/professional-search-discovery",
      icon: "Search" as const,
    },
    {
      label: "My Ratings",
      path: "/my-ratings-dashboard",
      icon: "Star" as const,
    },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(
        `/professional-search-discovery?q=${encodeURIComponent(searchQuery)}`
      );
      setIsSearchExpanded(false);
    }
  };

  const handleProfileMenuToggle = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate("/login-register");
    setIsProfileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchExpanded(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-1000 bg-surface border-b border-border shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/dashboard-home"
              className="flex items-center space-x-3 transition-smooth hover:opacity-80"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Users" size={20} color="white" />
              </div>
              <span className="font-heading font-semibold text-xl text-primary hidden sm:block">
                ProRate
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-smooth ${
                    isActivePath(item.path)
                      ? "bg-primary-50 text-primary border border-primary-200"
                      : "text-text-secondary hover:text-primary hover:bg-primary-50"
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div
              className="hidden md:flex flex-1 max-w-md mx-8"
              ref={searchRef}
            >
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <div className="relative">
                  <Icon
                    name="Search"
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    placeholder="Search professionals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchExpanded(true)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
                  />
                </div>
                {isSearchExpanded && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-modal z-1010">
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm text-text-secondary">
                        Press Enter to search for "{searchQuery}"
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                className="md:hidden p-2 text-text-secondary hover:text-primary transition-smooth"
              >
                <Icon name="Search" size={20} />
              </button>

              <button className="relative p-2 text-text-secondary hover:text-primary transition-smooth">
                <Icon name="Bell" size={20} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {notificationCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={handleProfileMenuToggle}
                  className="flex items-center space-x-2 p-1 rounded-lg hover:bg-primary-50 transition-smooth"
                >
                  <Image
                    src="/assets/images/avatar-placeholder.jpg"
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <Icon
                    name="ChevronDown"
                    size={16}
                    className="text-text-secondary"
                  />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-modal z-1010">
                    <div className="py-1">
                      <Link
                        to="/professional-profile"
                        className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-primary-50 transition-smooth"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Icon name="User" size={16} className="mr-3" />
                        My Profile
                      </Link>
                      <Link
                        to="/my-ratings-dashboard"
                        className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-primary-50 transition-smooth"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Icon name="BarChart3" size={16} className="mr-3" />
                        Rating Analytics
                      </Link>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-error hover:bg-error-50 transition-smooth"
                      >
                        <Icon name="LogOut" size={16} className="mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-primary transition-smooth"
              >
                <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={20} />
              </button>
            </div>
          </div>
        </div>

        {isSearchExpanded && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-border shadow-card z-1010">
            <div className="p-4">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Icon
                    name="Search"
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    placeholder="Search professionals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    autoFocus
                  />
                </div>
              </form>
            </div>
          </div>
        )}

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-border shadow-card z-1010">
            <nav className="px-4 py-2 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-smooth ${
                    isActivePath(item.path)
                      ? "bg-primary-50 text-primary border border-primary-200"
                      : "text-text-secondary hover:text-primary hover:bg-primary-50"
                  }`}
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-1000">
        <nav className="flex items-center justify-around py-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-smooth min-w-0 ${
                isActivePath(item.path)
                  ? "text-primary"
                  : "text-text-secondary hover:text-primary"
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Header;
