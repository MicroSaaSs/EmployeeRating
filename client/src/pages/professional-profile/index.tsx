import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";
import { getApiBaseUrl } from "../../utils/auth";

import ProfileHeader from "./components/ProfileHeader";
import LinkedInData from "./components/LinkedInData";
import RatingsSection from "./components/RatingsSection";
import AnalyticsSection from "./components/AnalyticsSection";
import ClaimProfileBanner from "./components/ClaimProfileBanner";

const ProfessionalProfile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "all" | "technical" | "communication" | "leadership" | "teamwork"
  >("all");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isProfileClaimed, setIsProfileClaimed] = useState(false);

  const [professionalData, setProfessionalData] = useState<any | null>(null);

  const [ratingsData, setRatingsData] = useState<any[]>([]);

  const analyticsData = React.useMemo(() => {
    // Derive minimal analytics from ratingsData
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingsData.forEach((r) => {
      const s = Math.max(1, Math.min(5, Math.round(r.rating)));
      dist[s] = (dist[s] || 0) + 1;
    });
    const categories = ratingsData.reduce<
      Record<string, { sum: number; n: number }>
    >((acc, r) => {
      const key = r.category || "overall";
      if (!acc[key]) acc[key] = { sum: 0, n: 0 };
      acc[key].sum += r.rating;
      acc[key].n += 1;
      return acc;
    }, {});
    const categoryBreakdown = Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, v.n ? v.sum / v.n : 0])
    );
    return {
      ratingTrends: [],
      categoryBreakdown,
      ratingDistribution: dist,
    };
  }, [ratingsData]);

  const breadcrumbs = [
    { label: "Search", path: "/professional-search-discovery" },
    { label: "Professionals", path: "/professional-search-discovery" },
    {
      label: professionalData?.name || "Profile",
      path: "/professional-profile",
    },
  ];

  const filterTabs = [
    { id: "all", label: "All Reviews", count: ratingsData.length },
    {
      id: "technical",
      label: "Technical Skills",
      count: ratingsData.filter((r) => r.category === "technical").length,
    },
    {
      id: "communication",
      label: "Communication",
      count: ratingsData.filter((r) => r.category === "communication").length,
    },
    {
      id: "leadership",
      label: "Leadership",
      count: ratingsData.filter((r) => r.category === "leadership").length,
    },
    {
      id: "teamwork",
      label: "Teamwork",
      count: ratingsData.filter((r) => r.category === "teamwork").length,
    },
  ] as const;

  const filteredRatings =
    activeTab === "all"
      ? ratingsData
      : ratingsData.filter((rating) => rating.category === activeTab);

  const handleRateClick = () => {
    navigate(
      `/rate-professional?id=${professionalData.id}&name=${encodeURIComponent(
        professionalData.name
      )}`
    );
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${professionalData.name} - Professional Profile`,
          text: `Check out ${professionalData.name}'s professional profile and ratings`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Profile link copied to clipboard!");
    }
  };

  const handleClaimProfile = () => {
    setIsProfileClaimed(true);
    alert(
      "Profile claim request submitted! You will receive a verification email shortly."
    );
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    const load = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/users/profile/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        setProfessionalData(data?.profile || null);

        const rres = await fetch(`${getApiBaseUrl()}/ratings/for/${id}`, {
          credentials: "include",
        });
        const rdata = await rres.json();
        const mapped = ((rdata?.ratings || []) as any[]).map((r) => ({
          id: r.id,
          reviewerName: "Anonymous",
          reviewerTitle: undefined,
          reviewerImage: null,
          reviewerCompany: undefined,
          relationshipType: undefined,
          rating: r.score,
          category: (r.category || "overall").toLowerCase(),
          date: new Date(r.createdAt).toISOString(),
          helpfulVotes: 0,
          comment: r.comment || "",
          categories: undefined,
        }));
        setRatingsData(mapped);
      } catch (e) {
        setProfessionalData(null);
        setRatingsData([]);
      }
    };
    load();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm text-text-secondary mb-6 pt-6">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`${crumb.path}-${index}`}>
                {index > 0 && <Icon name="ChevronRight" size={16} />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-text-primary font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="hover:text-primary transition-smooth"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {!isProfileClaimed && (
            <ClaimProfileBanner onClaim={handleClaimProfile} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {professionalData && (
                <ProfileHeader
                  professional={professionalData}
                  onRate={handleRateClick}
                  onShare={handleShareProfile}
                />
              )}
              {professionalData && (
                <LinkedInData
                  experience={professionalData.experience as any}
                  education={professionalData.education as any}
                  skills={professionalData.skills as any}
                  certifications={professionalData.certifications as any}
                  connectionsCount={professionalData.connectionsCount}
                />
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">
                  Community Ratings & Reviews
                </h2>
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary-50 transition-smooth"
                >
                  <Icon name="BarChart3" size={16} />
                  <span>{showAnalytics ? "Hide" : "Show"} Analytics</span>
                </button>
              </div>
              {professionalData && showAnalytics && (
                <AnalyticsSection
                  analyticsData={analyticsData as any}
                  professionalName={professionalData.name}
                />
              )}
              {professionalData && (
                <RatingsSection
                  ratings={filteredRatings as any}
                  filterTabs={filterTabs as any}
                  activeTab={activeTab}
                  onTabChange={setActiveTab as any}
                  totalRatings={professionalData.totalRatings}
                  averageRating={professionalData.averageRating}
                />
              )}
            </div>
          </div>
        </div>

        {professionalData && (
          <div className="fixed bottom-20 right-4 md:hidden z-50">
            <button
              onClick={handleRateClick}
              className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-smooth"
            >
              <Icon name="Star" size={24} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfessionalProfile;
