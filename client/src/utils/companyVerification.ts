// Utility functions for company verification and rating eligibility

export type ExperienceItem = {
  company?: string;
  duration?: string;
};

export const extractCompaniesFromExperience = (
  experience: Array<ExperienceItem | { company?: string }> | undefined
): string[] => {
  if (!experience || !Array.isArray(experience)) {
    return [];
  }

  return experience
    .map((exp) => exp?.company?.toLowerCase().trim())
    .filter((val): val is string => Boolean(val));
};

export type VerificationResult = {
  isEligible: boolean;
  matchedCompanies: string[];
  reason: string;
};

export const verifyCompanyEligibility = (
  raterCompanies: Array<string | { company?: string }> | undefined,
  professionalCompanies: Array<string | { company?: string }> | undefined
): VerificationResult => {
  if (!raterCompanies?.length || !professionalCompanies?.length) {
    return {
      isEligible: false,
      matchedCompanies: [],
      reason: "Insufficient company data available",
    };
  }

  const toName = (c: string | { company?: string }) =>
    (typeof c === "string" ? c : c?.company || "").toLowerCase().trim();

  const normalizedRaterCompanies = raterCompanies.map(toName).filter(Boolean);
  const normalizedProfessionalCompanies = professionalCompanies
    .map(toName)
    .filter(Boolean);

  const set = new Set(normalizedProfessionalCompanies);
  const matchedCompanies = normalizedRaterCompanies.filter((c) => set.has(c));

  return {
    isEligible: matchedCompanies.length > 0,
    matchedCompanies,
    reason:
      matchedCompanies.length > 0
        ? `Verified colleague from: ${matchedCompanies.join(", ")}`
        : "No shared company history found",
  };
};

export type Review = {
  reviewerName?: string;
  reviewerTitle?: string;
  reviewerCompany?: string;
  reviewerImage?: string | null;
  [key: string]: any;
};

export const anonymizeReview = (
  review: Review | null | undefined
): Review | null | undefined => {
  if (!review) return review;

  return {
    ...review,
    reviewerName: "Anonymous Colleague",
    reviewerTitle: review.reviewerCompany
      ? `Colleague at ${review.reviewerCompany}`
      : "Former/Current Colleague",
    reviewerImage: null,
    isAnonymous: true,
  };
};

export const generateAnonymousTitle = (
  relationshipType?: string,
  company?: string
): string => {
  const relationshipMap: Record<string, string> = {
    colleague: "Colleague",
    manager: "Former/Current Manager",
    "direct-report": "Former/Current Direct Report",
    client: "Client",
    other: "Professional Contact",
  };

  const title =
    relationshipMap[relationshipType || ""] || "Professional Contact";
  return company ? `${title} at ${company}` : title;
};

export default {
  extractCompaniesFromExperience,
  verifyCompanyEligibility,
  anonymizeReview,
  generateAnonymousTitle,
};
