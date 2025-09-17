import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
// Page imports
import LoginRegister from "./pages/login-register";
import DashboardHome from "./pages/dashboard-home";
import ProfessionalSearchDiscovery from "./pages/professional-search-discovery";
import ProfessionalProfile from "./pages/professional-profile";
import RateProfessional from "./pages/rate-professional";
import MyRatingsDashboard from "./pages/my-ratings-dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider } from "./providers/AuthProvider";

const Routes: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ScrollToTop />
          <RouterRoutes>
            <Route path="/login-register" element={<LoginRegister />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/dashboard-home"
              element={
                <ProtectedRoute>
                  <DashboardHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professional-search-discovery"
              element={
                <ProtectedRoute>
                  <ProfessionalSearchDiscovery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professional-profile"
              element={
                <ProtectedRoute>
                  <ProfessionalProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rate-professional"
              element={
                <ProtectedRoute>
                  <RateProfessional />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-ratings-dashboard"
              element={
                <ProtectedRoute>
                  <MyRatingsDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<LoginRegister />} />
            <Route path="*" element={<div>Page Not Found</div>} />
          </RouterRoutes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
