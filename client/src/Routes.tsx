import { BrowserRouter, Navigate, Route, Routes as RouterRoutes, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginRegister, { PilotPolicy } from "./pages/login-register";
import DashboardHome from "./pages/dashboard-home";
import ProfessionalSearchDiscovery from "./pages/professional-search-discovery";
import ProfessionalProfile from "./pages/professional-profile";
import RateProfessional from "./pages/rate-professional";
import MyRatingsDashboard from "./pages/my-ratings-dashboard";
import WorkHistory from "./pages/WorkHistory";
import ColleagueDrafts from "./pages/ColleagueDrafts";
import BrowserImport from "./pages/BrowserImport";
import Moderation from "./pages/Moderation";
import PilotOperations from "./pages/PilotOperations";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./providers/AuthProvider";

function LegacyAdministration() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/administration", search }} replace />;
}

export default function Routes() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ScrollToTop />
          <RouterRoutes>
            <Route path="/" element={<LoginRegister />} />
            <Route path="/login-register" element={<LoginRegister />} />
            <Route path="/privacy" element={<PilotPolicy privacy />} />
            <Route path="/terms" element={<PilotPolicy />} />
            <Route path="/browser-import" element={<BrowserImport />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard-home" element={<DashboardHome />} />
              <Route path="/work-history" element={<WorkHistory />} />
              <Route path="/colleague-drafts" element={<ColleagueDrafts />} />
              <Route path="/professional-search-discovery" element={<ProfessionalSearchDiscovery />} />
              <Route path="/professionals/:id" element={<ProfessionalProfile />} />
              <Route path="/professionals/:id/rate" element={<RateProfessional />} />
              <Route path="/professional-profile" element={<Navigate to="/professional-search-discovery" replace />} />
              <Route path="/rate-professional" element={<Navigate to="/professional-search-discovery" replace />} />
              <Route path="/my-ratings-dashboard" element={<MyRatingsDashboard />} />
              <Route path="/moderation" element={<Moderation />} />
              <Route path="/administration" element={<PilotOperations />} />
              <Route path="/pilot-operations" element={<LegacyAdministration />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
