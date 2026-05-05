import React, { useState } from "react";
import toast from "react-hot-toast";
import { generatePlacementOpportunities } from "../api/ResumeService";
import { FiTarget, FiMapPin, FiBriefcase, FiTrendingUp, FiInfo } from "react-icons/fi";

const companyDetailsMap = {
  Google: {
    description:
      "Google is a global technology leader known for search, cloud, AI, and developer tools. It hires across software engineering, product, and data roles.",
    focus: "Search, Cloud, AI, Android, Chrome",
    employeeSize: "150k+",
  },
  Microsoft: {
    description:
      "Microsoft builds productivity and cloud solutions like Azure, Office, and Windows. It often hires engineers for cloud, security, and enterprise apps.",
    focus: "Cloud, AI, Security, Productivity",
    employeeSize: "220k+",
  },
  Amazon: {
    description:
      "Amazon is a major e-commerce and cloud company. Its engineering teams build AWS services, logistics systems, and customer-facing applications.",
    focus: "Cloud, Retail, Logistics, AI",
    employeeSize: "1M+",
  },
  Meta: {
    description:
      "Meta focuses on social connections and immersive experiences. It hires developers for apps, metaverse work, and infrastructure engineering.",
    focus: "Social, Apps, VR/AR, Infrastructure",
    employeeSize: "70k+",
  },
  Netflix: {
    description:
      "Netflix builds streaming services and content delivery platforms. It values strong engineering skills in scalable systems and media technology.",
    focus: "Streaming, Cloud, Scale, Video Delivery",
    employeeSize: "12k+",
  },
  Uber: {
    description:
      "Uber operates mobility and delivery platforms. It hires engineers for distributed systems, mobile, mapping, and logistics optimization.",
    focus: "Mobility, Delivery, Mapping, Data",
    employeeSize: "31k+",
  },
  Apple: {
    description:
      "Apple designs and manufactures consumer electronics, software, and services. It hires engineers for hardware, software, and user experience innovation.",
    focus: "Hardware, Software, UX, AI",
    employeeSize: "150k+",
  },
  Tesla: {
    description:
      "Tesla builds electric vehicles, energy storage, and solar products. It focuses on autonomous driving, battery technology, and sustainable energy.",
    focus: "Electric Vehicles, Autonomy, Energy",
    employeeSize: "140k+",
  },
  Adobe: {
    description:
      "Adobe creates creative software like Photoshop, Illustrator, and Acrobat. It hires developers for design tools, cloud services, and AI-powered features.",
    focus: "Creative Software, Cloud, AI",
    employeeSize: "29k+",
  },
  Salesforce: {
    description:
      "Salesforce provides CRM and cloud computing solutions. It builds enterprise software for sales, marketing, and customer service automation.",
    focus: "CRM, Cloud, Enterprise Software",
    employeeSize: "79k+",
  },
  Oracle: {
    description:
      "Oracle develops database software, cloud infrastructure, and enterprise applications. It focuses on data management, cloud services, and business intelligence.",
    focus: "Databases, Cloud, Enterprise Apps",
    employeeSize: "164k+",
  },
  Spotify: {
    description:
      "Spotify is a music streaming platform that hires engineers for audio processing, recommendation systems, and scalable web services.",
    focus: "Music Streaming, AI, Scale",
    employeeSize: "9k+",
  },
  Airbnb: {
    description:
      "Airbnb connects hosts and travelers worldwide. It builds platforms for booking, payments, and community features.",
    focus: "Hospitality, Payments, Community",
    employeeSize: "6k+",
  },
  LinkedIn: {
    description:
      "LinkedIn is a professional networking platform. It hires engineers for social features, job matching, and data analytics.",
    focus: "Networking, Jobs, Data",
    employeeSize: "22k+",
  },
};

const PlacementOpportunities = () => {
  const [description, setDescription] = useState("");
  const [opportunities, setOpportunities] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState({});
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("priority");
  const [fetchError, setFetchError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (description.trim().length < 30) {
      toast.error("Please provide at least 30 characters describing your background.");
      return;
    }

    setLoading(true);
    setFetchError("");
    try {
      const response = await generatePlacementOpportunities(description);
      const payload =
        response && typeof response === "object" && response.data && typeof response.data === "object"
          ? response.data
          : response;

      if (payload?.error) {
        setFetchError(payload.error);
        toast.error(payload.error);
      } else if (payload && typeof payload === "object" && payload.opportunities) {
        setOpportunities(payload);
        toast.success("Placement opportunities generated!");
      } else {
        setFetchError("Failed to generate opportunities. Please try again.");
        toast.error("Failed to generate opportunities. Please try again.");
      }
    } catch (error) {
      console.error("Error generating placement opportunities:", error);
      setFetchError("Failed to generate placement opportunities. Please check your connection.");
      toast.error("Failed to generate placement opportunities. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const toggleCompanyDetails = (cardIndex, company) => {
    setExpandedCompany((current) => ({
      ...current,
      [cardIndex]: current[cardIndex] === company ? null : company,
    }));
  };

  const uniqueLocations = opportunities?.opportunities
    ? Array.from(
        new Set(
          opportunities.opportunities.flatMap((opp) => opp.locations || [])
        )
      )
    : [];

  const uniqueRoles = opportunities?.opportunities
    ? Array.from(new Set(opportunities.opportunities.map((opp) => opp.role)))
    : [];

  const filteredOpportunities = opportunities?.opportunities
    ? opportunities.opportunities.filter((opp) => {
        const matchesPriority = priorityFilter === "All" || opp.priority === priorityFilter;
        const matchesRole = roleFilter === "All" || opp.role === roleFilter;
        const matchesLocation =
          locationFilter === "All" || (opp.locations || []).includes(locationFilter);
        return matchesPriority && matchesRole && matchesLocation;
      })
    : [];

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    } else if (sortBy === "fitScore") {
      return (b.fitScore || 0) - (a.fitScore || 0);
    } else if (sortBy === "company") {
      return (a.companies[0] || "").localeCompare(b.companies[0] || "");
    } else if (sortBy === "role") {
      return a.role.localeCompare(b.role);
    }
    return 0;
  });

  const renderCompanyDetails = (company) => {
    const details = companyDetailsMap[company];
    if (!details) {
      return (
        <p className="text-sm text-gray-600">
          More details are not available for {company} yet.
        </p>
      );
    }

    return (
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
        <p className="mb-2 font-medium text-blue-900">About {company}</p>
        <p className="mb-2">{details.description}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            Focus: {details.focus}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            Size: {details.employeeSize}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Placement Opportunities
          </h1>
          <p className="text-lg text-gray-600">
            Discover career opportunities based on your skills and experience
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Describe your background, skills, and experience
              </label>
              <textarea
                id="description"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: I am a software engineer with 3 years of experience in Java, Spring Boot, and React. I have worked on web applications and have knowledge of databases like MySQL and MongoDB..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <p className="mt-3 text-sm text-gray-500">
                Include your current role, top tools, project type, and career goal. Mention locations you prefer, like Bangalore, Remote, or Hyderabad.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Get Placement Opportunities"}
            </button>
            {fetchError && (
              <p className="mt-3 text-sm text-red-600">{fetchError}</p>
            )}
          </form>
        </div>

        {opportunities && (
          <div className="space-y-6">
            {opportunities.opportunities && opportunities.opportunities.length > 0 && (
              <div>
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <FiTarget className="mr-2" />
                      Recommended Opportunities
                    </h2>
                    <p className="text-sm text-gray-500">
                      Use your profile details to discover the best-fit roles and then filter by priority, location, or role.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Sort By</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option value="priority">Priority (High to Low)</option>
                        <option value="fitScore">Fit Score (High to Low)</option>
                        <option value="company">Company (A-Z)</option>
                        <option value="role">Role (A-Z)</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Priority</span>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option>All</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Location</span>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option>All</option>
                        {uniqueLocations.map((location) => (
                          <option key={location}>{location}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Role</span>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option>All</option>
                        {uniqueRoles.map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="mb-4 text-sm text-slate-600">
                  Showing {sortedOpportunities.length} of {opportunities.opportunities.length} opportunities
                </div>
                {sortedOpportunities.length === 0 ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                    No opportunities match your selected filters. Try changing priority, location, or role.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {sortedOpportunities.map((opp, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                            <FiBriefcase className="mr-2" />
                            {opp.role}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(opp.priority)}`}>
                              {opp.priority} Priority
                            </span>
                            {opp.fitScore && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Fit: {opp.fitScore}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Companies:</h4>
                          <div className="flex flex-wrap gap-2">
                            {opp.companies.map((company, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleCompanyDetails(index, company)}
                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm transition hover:bg-blue-200"
                              >
                                <FiInfo className="h-4 w-4" />
                                {company}
                              </button>
                            ))}
                          </div>
                          {expandedCompany[index] && (
                            <div className="mt-4">
                              {renderCompanyDetails(expandedCompany[index])}
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <FiMapPin className="mr-1" />
                            Locations:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {opp.locations.map((location, idx) => (
                              <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                                {location}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Why this fits:</h4>
                          <p className="text-sm text-gray-600">{opp.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-950/5 rounded-2xl border border-slate-200/70 p-6 text-sm text-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                After real placement opportunities like LinkedIn
              </h2>
              <p className="mb-4">
                Explore the recommended roles and companies above, then use a professional platform like LinkedIn to connect with recruiters, track hiring trends, and apply to the best-fit openings.
              </p>
              <a
                href="https://www.linkedin.com/jobs/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Search jobs on LinkedIn
              </a>
            </div>

            {opportunities.careerAdvice && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <FiTrendingUp className="mr-2" />
                  Career Advice
                </h2>
                <p className="text-gray-700">{opportunities.careerAdvice}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlacementOpportunities;
