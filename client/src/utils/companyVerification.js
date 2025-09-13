// src/utils/companyVerification.js

/**
 * Utility functions for company verification and rating eligibility
 */

/**
 * Extract companies from LinkedIn experience data
 * @param {Array} experience - Array of experience objects
 * @returns {Array} Array of company names
 */
export const extractCompaniesFromExperience = (experience) => {
  if (!experience || !Array.isArray(experience)) {
    return [];
  }
  
  return experience.map(exp => exp?.company?.toLowerCase().trim()).filter(Boolean);
};

/**
 * Check if a rater is eligible to rate a professional based on company history
 * @param {Array} raterCompanies - Companies where the rater has worked
 * @param {Array} professionalCompanies - Companies where the professional has worked
 * @returns {Object} Verification result with isEligible boolean and matchedCompanies array
 */
export const verifyCompanyEligibility = (raterCompanies, professionalCompanies) => {
  if (!raterCompanies?.length || !professionalCompanies?.length) {
    return {
      isEligible: false,
      matchedCompanies: [],
      reason: 'Insufficient company data available'
    };
  }

  // Normalize company names for comparison
  const normalizedRaterCompanies = raterCompanies.map(company => 
    company?.toLowerCase().trim()
  ).filter(Boolean);
  
  const normalizedProfessionalCompanies = professionalCompanies.map(company => 
    company?.toLowerCase().trim()
  ).filter(Boolean);

  // Find common companies
  const matchedCompanies = normalizedRaterCompanies.filter(company => 
    normalizedProfessionalCompanies.includes(company)
  );

  return {
    isEligible: matchedCompanies.length > 0,
    matchedCompanies,
    reason: matchedCompanies.length > 0 
      ? `Verified colleague from: ${matchedCompanies.join(', ')}`
      : 'No shared company history found'
  };
};

/**
 * Anonymize reviewer information for display
 * @param {Object} review - Review object
 * @returns {Object} Anonymized review object
 */
export const anonymizeReview = (review) => {
  if (!review) return review;

  return {
    ...review,
    reviewerName: 'Anonymous Colleague',
    reviewerTitle: review.reviewerCompany 
      ? `Colleague at ${review.reviewerCompany}`
      : 'Former/Current Colleague', 
    reviewerImage: null,
    isAnonymous: true
  };
};

/**
 * Generate anonymous reviewer title based on relationship and company
 * @param {string} relationshipType - Type of relationship (colleague, manager, etc.)
 * @param {string} company - Company name
 * @returns {string} Anonymous title
 */
export const generateAnonymousTitle = (relationshipType, company) => {
  const relationshipMap = {
    'colleague': 'Colleague',
    'manager': 'Former/Current Manager',
    'direct-report': 'Former/Current Direct Report',
    'client': 'Client',
    'other': 'Professional Contact'
  };

  const title = relationshipMap[relationshipType] || 'Professional Contact';
  return company ? `${title} at ${company}` : title;
};

export default {
  extractCompaniesFromExperience,
  verifyCompanyEligibility,
  anonymizeReview,
  generateAnonymousTitle
};