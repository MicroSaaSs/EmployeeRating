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

const Routes: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          <Route path="/login-register" element={<LoginRegister />} />
          <Route path="/dashboard-home" element={<DashboardHome />} />
          <Route
            path="/professional-search-discovery"
            element={<ProfessionalSearchDiscovery />}
          />
          <Route
            path="/professional-profile"
            element={<ProfessionalProfile />}
          />
          <Route path="/rate-professional" element={<RateProfessional />} />
          <Route
            path="/my-ratings-dashboard"
            element={<MyRatingsDashboard />}
          />
          <Route path="/" element={<LoginRegister />} />
          <Route path="*" element={<div>Page Not Found</div>} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
