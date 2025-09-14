import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";

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

  const professionalData = {
    id: "prof-001",
    name: "Sarah Johnson",
    title: "Senior Software Engineer",
    company: "TechCorp Solutions",
    location: "San Francisco, CA",
    profileImage:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
    linkedinUrl: "https://linkedin.com/in/sarah-johnson-dev",
    isVerified: true,
    averageRating: 4.6,
    totalRatings: 127,
    connectionsCount: 2847,
    experience: [
      {
        id: 1,
        title: "Senior Software Engineer",
        company: "TechCorp Solutions",
        duration: "2021 - Present",
        location: "San Francisco, CA",
        description:
          "Leading frontend development initiatives for enterprise-level applications. Responsible for architecting scalable React applications and mentoring junior developers.\n\nKey achievements include reducing application load time by 40% and implementing automated testing frameworks that improved code quality metrics by 60%.",
      },
      {
        id: 2,
        title: "Software Engineer",
        company: "StartupXYZ",
        duration: "2019 - 2021",
        location: "San Francisco, CA",
        description:
          "Developed full-stack web applications using React, Node.js, and PostgreSQL. Collaborated with cross-functional teams to deliver high-quality software solutions.\n\nSuccessfully launched 3 major product features that increased user engagement by 35% and contributed to $2M in additional revenue.",
      },
      {
        id: 3,
        title: "Junior Developer",
        company: "WebDev Agency",
        duration: "2018 - 2019",
        location: "San Jose, CA",
        description:
          "Built responsive websites and web applications for various clients. Gained experience in modern web technologies and agile development methodologies.",
      },
    ],
    education: [
      {
        id: 1,
        degree: "Master of Science in Computer Science",
        school: "Stanford University",
        year: "2018",
        location: "Stanford, CA",
      },
      {
        id: 2,
        degree: "Bachelor of Science in Software Engineering",
        school: "UC Berkeley",
        year: "2016",
        location: "Berkeley, CA",
      },
    ],
    skills: [
      "JavaScript",
      "React",
      "Node.js",
      "Python",
      "TypeScript",
      "AWS",
      "Docker",
      "PostgreSQL",
      "MongoDB",
      "GraphQL",
      "REST APIs",
      "Git",
      "Agile",
      "Team Leadership",
      "Mentoring",
    ],
    certifications: [
      {
        id: 1,
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        year: "2023",
      },
      {
        id: 2,
        name: "Certified Scrum Master",
        issuer: "Scrum Alliance",
        year: "2022",
      },
    ],
  } as const;

  const ratingsData = [
    {
      id: 1,
      reviewerName: "Michael Chen",
      reviewerTitle: "Product Manager at TechCorp",
      reviewerImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      reviewerCompany: "TechCorp Solutions",
      relationshipType: "colleague",
      rating: 5,
      category: "overall",
      date: "2024-01-15",
      helpfulVotes: 12,
      comment:
        "Sarah is an exceptional engineer who consistently delivers high-quality work. Her technical expertise in React and system architecture is outstanding. She's also an excellent mentor who helped our junior developers grow significantly.\n\nWorking with Sarah on the customer portal project was a pleasure - she anticipated potential issues and provided elegant solutions that saved us weeks of development time.",
      isHelpful: false,
      categories: {
        technical: 5,
        communication: 5,
        leadership: 4,
        teamwork: 5,
      },
    },
    {
      id: 2,
      reviewerName: "Anonymous",
      reviewerTitle: "Former Colleague",
      reviewerImage: null,
      reviewerCompany: "StartupXYZ",
      relationshipType: "colleague",
      rating: 4,
      category: "technical",
      date: "2024-01-10",
      helpfulVotes: 8,
      comment:
        "Strong technical skills and good problem-solving abilities. Sarah was always willing to help team members and share knowledge. Her code reviews were thorough and constructive.",
      isHelpful: true,
      categories: {
        technical: 5,
        communication: 4,
        leadership: 3,
        teamwork: 4,
      },
    },
  ];

  const analyticsData = {
    ratingTrends: [
      { month: "Jul 2023", rating: 4.2, count: 8 },
      { month: "Aug 2023", rating: 4.3, count: 12 },
      { month: "Sep 2023", rating: 4.4, count: 15 },
      { month: "Oct 2023", rating: 4.5, count: 18 },
      { month: "Nov 2023", rating: 4.6, count: 22 },
      { month: "Dec 2023", rating: 4.6, count: 25 },
      { month: "Jan 2024", rating: 4.6, count: 27 },
    ],
    categoryBreakdown: {
      technical: 4.7,
      communication: 4.6,
      leadership: 4.4,
      teamwork: 4.8,
    },
    ratingDistribution: { 5: 78, 4: 35, 3: 10, 2: 3, 1: 1 },
  };

  const breadcrumbs = [
    { label: "Search", path: "/professional-search-discovery" },
    { label: "Professionals", path: "/professional-search-discovery" },
    { label: professionalData.name, path: "/professional-profile" },
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm text-text-secondary mb-6 pt-6">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
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
              <ProfileHeader
                professional={professionalData}
                onRate={handleRateClick}
                onShare={handleShareProfile}
              />
              <LinkedInData
                experience={professionalData.experience as any}
                education={professionalData.education as any}
                skills={professionalData.skills as any}
                certifications={professionalData.certifications as any}
                connectionsCount={professionalData.connectionsCount}
              />
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
              {showAnalytics && (
                <AnalyticsSection
                  analyticsData={analyticsData as any}
                  professionalName={professionalData.name}
                />
              )}
              <RatingsSection
                ratings={filteredRatings as any}
                filterTabs={filterTabs as any}
                activeTab={activeTab}
                onTabChange={setActiveTab as any}
                totalRatings={professionalData.totalRatings}
                averageRating={professionalData.averageRating}
              />
            </div>
          </div>
        </div>

        <div className="fixed bottom-20 right-4 md:hidden z-50">
          <button
            onClick={handleRateClick}
            className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-smooth"
          >
            <Icon name="Star" size={24} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalProfile;
