import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/AppIcon";

import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ValueProposition from "./components/ValueProposition";

const LoginRegister: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLinkedInAuth = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard-home");
    }, 2000);
  };

  const handleAuthSuccess = () => {
    navigate("/dashboard-home");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Users" size={20} color="white" />
              </div>
              <span className="font-heading font-semibold text-xl text-primary">
                ProRate
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <select className="text-sm border border-border rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="bg-surface rounded-2xl shadow-modal p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-text-primary mb-2">
                    Welcome to ProRate
                  </h1>
                  <p className="text-text-secondary">
                    Professional networking with community-driven ratings
                  </p>
                </div>

                <button
                  onClick={handleLinkedInAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-border rounded-lg bg-[#0077B5] text-white font-medium hover:bg-[#005885] transition-smooth mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </div>
                  ) : (
                    <>
                      <Icon name="Linkedin" size={20} className="mr-2" />
                      Continue with LinkedIn
                    </>
                  )}
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-surface text-text-secondary">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <div className="flex bg-primary-50 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-smooth ${
                      activeTab === "login"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-text-secondary hover:text-primary"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-smooth ${
                      activeTab === "register"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-text-secondary hover:text-primary"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {activeTab === "login" ? (
                  <LoginForm onSuccess={handleAuthSuccess} />
                ) : (
                  <RegisterForm onSuccess={handleAuthSuccess} />
                )}

                <div className="mt-8 pt-6 border-t border-border text-center">
                  <p className="text-sm text-text-secondary mb-2">
                    Trusted by over 50,000+ professionals
                  </p>
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        name="Star"
                        size={16}
                        className="text-warning fill-current"
                      />
                    ))}
                    <span className="text-sm text-text-secondary ml-2">
                      4.8/5 rating
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <ValueProposition />
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-surface border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-text-secondary">
              <Link
                to="/privacy"
                className="hover:text-primary transition-smooth"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="hover:text-primary transition-smooth"
              >
                Terms of Service
              </Link>
              <Link to="/help" className="hover:text-primary transition-smooth">
                Help Center
              </Link>
            </div>
            <p className="text-sm text-text-secondary">
              © {new Date().getFullYear()} ProRate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-text-primary font-medium">
              Authenticating...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginRegister;
