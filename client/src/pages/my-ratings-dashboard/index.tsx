import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";
import { getApiBaseUrl } from "../../utils/auth";
import RatingsGivenTab from "./components/RatingsGivenTab";
import RatingsReceivedTab from "./components/RatingsReceivedTab";
import AnalyticsTab from "./components/AnalyticsTab";

const MyRatingsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "given" | "received" | "analytics"
  >("given");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "rating" | "name">("date");
  const [filterBy, setFilterBy] = useState<"all" | "high" | "medium" | "low">(
    "all"
  );

  const [ratingsGiven, setRatingsGiven] = useState<any[]>([]);
  const [ratingsReceived, setRatingsReceived] = useState<any[]>([]);

  const analyticsData = {
    overallRating: 0,
    totalRatingsReceived: 0,
    totalRatingsGiven: 0,
    profileViews: 0,
    ratingTrends: [],
    categoryBreakdown: [],
  };

  const reloadRatings = async () => {
    try {
      // Load professionals for enrichment
      const profRes = await fetch(`${getApiBaseUrl()}/users/search`, {
        credentials: "include",
      });
      const profData = await profRes.json();
      const professionals = (profData?.professionals || []) as Array<{
        id: number;
        name: string;
        title: string;
        company: string;
        avatar: string;
      }>;
      const byId = new Map<number, any>();
      professionals.forEach((p) => byId.set(p.id, p));

      // Load ratings given
      const givenRes = await fetch(`${getApiBaseUrl()}/ratings/given`, {
        credentials: "include",
      });
      const givenData = await givenRes.json();
      const given = ((givenData?.ratings || []) as any[]).map((r) => {
        const targetId = Number(r.targetUserId);
        const prof = byId.get(targetId);
        return {
          id: r.id,
          professionalName: prof?.name || `User ${r.targetUserId}`,
          professionalTitle: prof?.title || "",
          company: prof?.company || "",
          avatar: prof?.avatar || "/assets/images/no_image.png",
          rating: r.score,
          category: r.category || "Overall",
          comment: r.comment || "",
          submittedDate: new Date(r.createdAt),
          canEdit: true,
          canDelete: false,
        };
      });
      setRatingsGiven(given);

      // Load ratings received
      const recRes = await fetch(`${getApiBaseUrl()}/ratings/received`, {
        credentials: "include",
      });
      const recData = await recRes.json();
      const received = ((recData?.ratings || []) as any[]).map((r) => {
        const raterId = Number(r.raterUserId);
        const prof = byId.get(raterId);
        return {
          id: r.id,
          raterName: prof?.name || `User ${r.raterUserId}`,
          raterTitle: prof?.title || "",
          company: prof?.company || "",
          avatar: prof?.avatar || "/assets/images/no_image.png",
          rating: r.score,
          category: r.category || "Overall",
          comment: r.comment || "",
          receivedDate: new Date(r.createdAt),
          hasResponded: false,
          canRespond: true,
        };
      });
      setRatingsReceived(received);
    } catch (e) {
      setRatingsGiven([]);
      setRatingsReceived([]);
    }
  };

  useEffect(() => {
    reloadRatings();
  }, []);

  const handleDeleteRatings = async (ids: Array<string | number>) => {
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`${getApiBaseUrl()}/ratings/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
    } finally {
      reloadRatings();
    }
  };

  const handleUpdateRating = async (
    id: string | number,
    payload: { score?: number; comment?: string; category?: string }
  ) => {
    try {
      await fetch(`${getApiBaseUrl()}/ratings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } finally {
      reloadRatings();
    }
  };

  const tabs = [
    { id: "given", label: "Ratings Given", count: ratingsGiven.length },
    {
      id: "received",
      label: "Ratings Received",
      count: ratingsReceived.length,
    },
    { id: "analytics", label: "My Profile Analytics", count: null },
  ] as const;

  const filteredData = useMemo(() => {
    let data: any[] = activeTab === "given" ? ratingsGiven : ratingsReceived;
    if (searchQuery) {
      data = data.filter(
        (item) =>
          (activeTab === "given" ? item.professionalName : item.raterName)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.company.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterBy !== "all") {
      if (filterBy === "high") data = data.filter((item) => item.rating >= 4.5);
      else if (filterBy === "medium")
        data = data.filter((item) => item.rating >= 3.5 && item.rating < 4.5);
      else if (filterBy === "low")
        data = data.filter((item) => item.rating < 3.5);
    }
    data.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = activeTab === "given" ? a.submittedDate : a.receivedDate;
        const dateB = activeTab === "given" ? b.submittedDate : b.receivedDate;
        return (dateB as any) - (dateA as any);
      } else if (sortBy === "rating") {
        return b.rating - a.rating;
      } else if (sortBy === "name") {
        const nameA = activeTab === "given" ? a.professionalName : a.raterName;
        const nameB = activeTab === "given" ? b.professionalName : b.raterName;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
    return data;
  }, [activeTab, searchQuery, sortBy, filterBy, ratingsGiven, ratingsReceived]);

  const handleExportData = () => {
    const dataToExport = activeTab === "given" ? ratingsGiven : ratingsReceived;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        activeTab === "given"
          ? "Professional Name,Company,Rating,Category,Date,Comment"
          : "Rater Name,Company,Rating,Category,Date,Comment",
        ...dataToExport.map((item: any) =>
          activeTab === "given"
            ? `"${item.professionalName}","${item.company}",${item.rating},"${
                item.category
              }","${item.submittedDate.toLocaleDateString()}","${item.comment.replace(
                /"/g,
                '""'
              )}"`
            : `"${item.raterName}","${item.company}",${item.rating},"${
                item.category
              }","${item.receivedDate.toLocaleDateString()}","${item.comment.replace(
                /"/g,
                '""'
              )}"`
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}-ratings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                  My Ratings Dashboard
                </h1>
                <p className="text-text-secondary">
                  Manage your rating activity and track your professional
                  reputation
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-primary hover:border-primary transition-smooth"
                >
                  <Icon name="Download" size={18} />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <Link
                  to="/professional-search-discovery"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
                >
                  <Icon name="Plus" size={18} />
                  <span className="hidden sm:inline">Rate Professional</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Icon name="Star" size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {analyticsData.overallRating}
                  </p>
                  <p className="text-sm text-text-secondary">Overall Rating</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
                  <Icon name="TrendingUp" size={20} className="text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {analyticsData.totalRatingsReceived}
                  </p>
                  <p className="text-sm text-text-secondary">Received</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                  <Icon
                    name="MessageSquare"
                    size={20}
                    className="text-accent"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {analyticsData.totalRatingsGiven}
                  </p>
                  <p className="text-sm text-text-secondary">Given</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary-50 rounded-lg flex items-center justify-center">
                  <Icon name="Eye" size={20} className="text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {analyticsData.profileViews}
                  </p>
                  <p className="text-sm text-text-secondary">Profile Views</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg mb-6">
            <div className="border-b border-border">
              <nav className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-smooth ${
                      activeTab === tab.id
                        ? "border-primary text-primary bg-primary-50"
                        : "border-transparent text-text-secondary hover:text-primary hover:bg-primary-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          activeTab === tab.id
                            ? "bg-primary text-white"
                            : "bg-border text-text-secondary"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab !== "analytics" && (
              <div className="p-4 border-b border-border">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Icon
                        name="Search"
                        size={20}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                      />
                      <input
                        type="text"
                        placeholder={`Search ${
                          activeTab === "given" ? "professionals" : "raters"
                        }...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="date">Sort by Date</option>
                      <option value="rating">Sort by Rating</option>
                      <option value="name">Sort by Name</option>
                    </select>

                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">All Ratings</option>
                      <option value="high">High (4.5+)</option>
                      <option value="medium">Medium (3.5-4.4)</option>
                      <option value="low">Low (&lt;3.5)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6">
              {activeTab === "given" && (
                <RatingsGivenTab
                  ratings={filteredData as any}
                  onDelete={handleDeleteRatings}
                  onUpdate={handleUpdateRating}
                />
              )}
              {activeTab === "received" && (
                <RatingsReceivedTab ratings={filteredData as any} />
              )}
              {activeTab === "analytics" && (
                <AnalyticsTab data={analyticsData as any} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyRatingsDashboard;
