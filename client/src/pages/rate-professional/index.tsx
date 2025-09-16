// Converted from JSX to TSX (kept logic, added minimal types)
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/ui/Header";
import Icon from "../../components/AppIcon";
import Image from "../../components/AppImage";
import {
  verifyCompanyEligibility,
  extractCompaniesFromExperience,
  type VerificationResult,
} from "../../utils/companyVerification";

type ExperienceHistoryItem = { company: string; duration: string };
type ProfessionalData = {
  id: number | string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  location: string;
  experience: string;
  experienceHistory: ExperienceHistoryItem[];
};

type LocationState = { professional?: ProfessionalData };

const RateProfessional: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as LocationState | undefined;

  const professionalData: ProfessionalData = locState?.professional || {
    id: 1,
    name: "Sarah Johnson",
    title: "Senior Software Engineer",
    company: "TechCorp Solutions",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
    location: "San Francisco, CA",
    experience: "8+ years",
    experienceHistory: [
      { company: "TechCorp Solutions", duration: "2021 - Present" },
      { company: "StartupXYZ", duration: "2019 - 2021" },
      { company: "WebDev Agency", duration: "2018 - 2019" },
    ],
  };

  const currentUserCompanies: ExperienceHistoryItem[] = [
    { company: "TechCorp Solutions", duration: "2022 - Present" },
    { company: "Another Company", duration: "2020 - 2022" },
  ];

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [formData, setFormData] = useState({
    overallRating: 0,
    categoryRatings: {
      technicalSkills: 0,
      communication: 0,
      leadership: 0,
      reliability: 0,
      teamwork: 0,
    },
    writtenFeedback: "",
    relationshipType: "",
    workDuration: "",
    isDraft: false,
    isAnonymous: true,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 5;
  const maxFeedbackLength = 1000;

  useEffect(() => {
    const professionalCompanies = extractCompaniesFromExperience(
      professionalData.experienceHistory
    );
    const raterCompanies = extractCompaniesFromExperience(currentUserCompanies);
    const result = verifyCompanyEligibility(
      raterCompanies,
      professionalCompanies
    );
    setVerificationResult(result);
    setIsEligible(result.isEligible);
  }, []);

  const ratingCategories = [
    {
      key: "technicalSkills",
      label: "Technical Skills",
      description: "Expertise in their field and technical competency",
    },
    {
      key: "communication",
      label: "Communication",
      description: "Clarity in verbal and written communication",
    },
    {
      key: "leadership",
      label: "Leadership",
      description: "Ability to guide and inspire others",
    },
    {
      key: "reliability",
      label: "Reliability",
      description: "Consistency in meeting deadlines and commitments",
    },
    {
      key: "teamwork",
      label: "Teamwork",
      description: "Collaboration and team contribution",
    },
  ] as const;

  const relationshipTypes = [
    { value: "colleague", label: "Colleague" },
    { value: "manager", label: "Manager" },
    { value: "direct-report", label: "Direct Report" },
    { value: "client", label: "Client" },
    { value: "other", label: "Other" },
  ] as const;

  const workDurations = [
    { value: "0-6months", label: "0-6 months" },
    { value: "6months-1year", label: "6 months - 1 year" },
    { value: "1-2years", label: "1-2 years" },
    { value: "2-5years", label: "2-5 years" },
    { value: "5+years", label: "5+ years" },
  ] as const;

  const ratingGuidelines = [
    {
      title: "Privacy & Identity",
      description:
        "You can submit anonymously or choose to show your name. Anonymous ratings never reveal your identity.",
    },
    {
      title: "Company Colleagues Only",
      description:
        "Only individuals who have worked at the same company can provide ratings, ensuring relevant and informed feedback.",
    },
    {
      title: "Be Fair and Objective",
      description:
        "Base your ratings on actual work experience and observable behaviors.",
    },
    {
      title: "Provide Constructive Feedback",
      description:
        "Focus on specific examples and actionable insights that can help professional growth.",
    },
    {
      title: "Maintain Professionalism",
      description:
        "Keep feedback respectful and professional, avoiding personal attacks or bias.",
    },
  ];

  const renderCompanyVerification = () => {
    if (isEligible === null) {
      return (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">
            Verifying Eligibility
          </h3>
          <p className="text-text-secondary">
            Checking your company history with {professionalData.name}...
          </p>
        </div>
      );
    }
    if (!isEligible) {
      return (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto">
            <Icon name="XCircle" size={32} className="text-error" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">
            Unable to Rate This Professional
          </h3>
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error font-medium mb-2">
              Company Verification Failed
            </p>
            <p className="text-text-secondary text-sm">
              {verificationResult?.reason}
            </p>
          </div>
          <div className="bg-background border border-border rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-2">
              Why can't I rate this professional?
            </h4>
            <p className="text-text-secondary text-sm mb-3">
              To ensure the quality and relevance of ratings, only colleagues
              who have worked at the same company can provide ratings.
            </p>
            <p className="text-text-secondary text-sm">
              This requirement helps maintain the integrity of our professional
              rating system and ensures feedback comes from those with direct
              work experience.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate("/professional-search-discovery")}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
            >
              Find Other Professionals
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-border text-text-primary rounded-lg hover:bg-primary-50 transition-smooth"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto">
          <Icon name="CheckCircle" size={32} className="text-success" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">
          Verification Successful!
        </h3>
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <p className="text-success font-medium mb-2">
            Company History Verified
          </p>
          <p className="text-text-secondary text-sm">
            {verificationResult?.reason}
          </p>
        </div>
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-2">
            Privacy & Identity Options
          </h4>
          <p className="text-primary text-sm">
            By default, your rating is anonymous. You can optionally choose to
            show your name before submitting.
          </p>
        </div>
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
        >
          Continue to Rating
        </button>
      </div>
    );
  };

  const StarRating: React.FC<{
    rating: number;
    onRatingChange?: (val: number) => void;
    size?: number;
    disabled?: boolean;
  }> = ({ rating, onRatingChange, size = 24, disabled = false }) => {
    const [hoverRating, setHoverRating] = useState(0);
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`transition-smooth ${
              disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            onClick={() => !disabled && onRatingChange && onRatingChange(star)}
          >
            <Icon
              name="Star"
              size={size}
              className={`${
                star <= (hoverRating || rating)
                  ? "text-warning fill-current"
                  : "text-border"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.overallRating === 0)
      newErrors.overallRating = "Overall rating is required";
    const categoryRatingsCount = Object.values(formData.categoryRatings).filter(
      (r) => r > 0
    ).length;
    if (categoryRatingsCount < 3)
      newErrors.categoryRatings = "Please rate at least 3 categories";
    if (formData.writtenFeedback.trim().length < 50)
      newErrors.writtenFeedback =
        "Please provide at least 50 characters of feedback";
    if (!formData.relationshipType)
      newErrors.relationshipType = "Please specify your relationship";
    if (!formData.workDuration)
      newErrors.workDuration = "Please specify work duration";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStarRating = (category: string, rating: number) => {
    if (category === "overall") {
      setFormData((prev) => ({ ...prev, overallRating: rating }));
    } else {
      setFormData((prev) => ({
        ...prev,
        categoryRatings: { ...prev.categoryRatings, [category]: rating },
      }));
    }
    if (
      errors[category] ||
      (category !== "overall" && errors.categoryRatings)
    ) {
      const newErrors = { ...errors };
      delete newErrors[category];
      if (category !== "overall") delete newErrors.categoryRatings;
      setErrors(newErrors);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleNextStep = () =>
    setCurrentStep((s) => (s < totalSteps - 1 ? s + 1 : s));
  const handlePrevStep = () => setCurrentStep((s) => (s > 1 ? s - 1 : s));
  const handleSaveDraft = () => {
    setFormData((prev) => ({ ...prev, isDraft: true }));
    localStorage.setItem(
      "ratingDraft",
      JSON.stringify({ ...formData, professionalId: professionalData.id })
    );
    navigate("/my-ratings-dashboard");
  };

  const handleSubmit = async () => {
    const valid = validateForm();
    if (!valid) {
      if (formData.overallRating === 0) {
        setCurrentStep(1);
        return;
      }
      const ratedCount = Object.values(formData.categoryRatings).filter(
        (r) => r > 0
      ).length;
      if (ratedCount < 3) {
        setCurrentStep(2);
        return;
      }
      if (formData.writtenFeedback.trim().length < 50) {
        setCurrentStep(3);
        return;
      }
      setCurrentStep(4);
      return;
    }
    setIsSubmitting(true);
    const submissionData = {
      ...formData,
      professionalId: professionalData.id,
      isAnonymous: formData.isAnonymous,
      verificationResult,
      submittedAt: new Date().toISOString(),
    };
    console.log(
      formData.isAnonymous
        ? "Anonymous rating submitted:"
        : "Identified rating submitted:",
      submissionData
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSubmitting(false);
    setShowSuccess(true);
  };

  const handleCancel = () => {
    const hasData =
      formData.overallRating > 0 ||
      Object.values(formData.categoryRatings).some((rating) => rating > 0) ||
      formData.writtenFeedback.trim().length > 0;
    if (hasData) setShowCancelDialog(true);
    else navigate(-1);
  };

  const renderProgressBar = () => {
    if (currentStep === 0) return null;
    const adjustedStep = currentStep;
    const adjustedTotal = totalSteps - 1;
    const percent = Math.round((adjustedStep / adjustedTotal) * 100);
    return (
      <div className="mb-8">
        <div className="flex items-center mb-2 text-sm">
          <span className="font-medium text-text-primary">
            Step {adjustedStep} of {adjustedTotal}
          </span>
          <span className="mx-2 text-border">•</span>
          <span className="text-text-secondary">{percent}% Complete</span>
        </div>
        <div className="w-full bg-border-light rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-smooth"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  const renderProfessionalHeader = () => {
    if (currentStep === 0) return null;
    return (
      <div className="bg-surface border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center space-x-4">
          <Image
            src={professionalData.avatar}
            alt={professionalData.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">
              {professionalData.name}
            </h2>
            <p className="text-text-secondary">{professionalData.title}</p>
            <p className="text-sm text-text-secondary">
              {professionalData.company} • {professionalData.location}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, isAnonymous: true }))
                }
                className={`px-3 py-2 flex items-center space-x-1 text-sm transition-smooth ${
                  formData.isAnonymous
                    ? "bg-primary-50 text-primary"
                    : "text-text-secondary hover:bg-primary-50"
                }`}
              >
                <Icon
                  name="EyeOff"
                  size={16}
                  className={
                    formData.isAnonymous
                      ? "text-primary"
                      : "text-text-secondary"
                  }
                />
                <span>Anonymous</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, isAnonymous: false }))
                }
                className={`px-3 py-2 flex items-center space-x-1 text-sm border-l border-border transition-smooth ${
                  !formData.isAnonymous
                    ? "bg-primary-50 text-primary"
                    : "text-text-secondary hover:bg-primary-50"
                }`}
              >
                <Icon
                  name="User"
                  size={16}
                  className={
                    !formData.isAnonymous
                      ? "text-primary"
                      : "text-text-secondary"
                  }
                />
                <span>Show name</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOverallRating = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Overall Rating
        </h3>
        <p className="text-text-secondary mb-4">
          How would you rate {professionalData.name} overall?
        </p>
        <div className="flex items-center space-x-4">
          <StarRating
            rating={formData.overallRating}
            onRatingChange={(rating) => handleStarRating("overall", rating)}
            size={32}
          />
          <span className="text-lg font-medium text-text-primary">
            {formData.overallRating > 0
              ? `${formData.overallRating}/5`
              : "Not rated"}
          </span>
        </div>
        {errors.overallRating && (
          <p className="text-error text-sm mt-2">{errors.overallRating}</p>
        )}
      </div>
    </div>
  );

  const renderCategoryRatings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Category Ratings
        </h3>
        <p className="text-text-secondary mb-6">
          Rate specific aspects of their professional performance
        </p>
      </div>
      <div className="space-y-6">
        {ratingCategories.map((category) => (
          <div
            key={category.key}
            className="border border-border rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
              <div className="mb-2 sm:mb-0">
                <h4 className="font-medium text-text-primary">
                  {category.label}
                </h4>
                <p className="text-sm text-text-secondary">
                  {category.description}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <StarRating
                  rating={
                    formData.categoryRatings[
                      category.key as keyof typeof formData.categoryRatings
                    ] as number
                  }
                  onRatingChange={(rating) =>
                    handleStarRating(category.key, rating)
                  }
                />
                <span className="text-sm font-medium text-text-primary min-w-[60px]">
                  {formData.categoryRatings[
                    category.key as keyof typeof formData.categoryRatings
                  ] > 0
                    ? `${
                        formData.categoryRatings[
                          category.key as keyof typeof formData.categoryRatings
                        ]
                      }/5`
                    : "Not rated"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {errors.categoryRatings && (
        <p className="text-error text-sm">{errors.categoryRatings}</p>
      )}
    </div>
  );

  const renderWrittenFeedback = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Written Feedback
        </h3>
        <p className="text-text-secondary mb-4">
          Provide detailed feedback about your experience working with{" "}
          {professionalData.name}
        </p>
      </div>
      <div>
        <textarea
          value={formData.writtenFeedback}
          onChange={(e) => handleInputChange("writtenFeedback", e.target.value)}
          placeholder="Share specific examples of their work, strengths, areas for improvement, and overall collaboration experience..."
          className="w-full h-32 px-4 py-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          maxLength={maxFeedbackLength}
        />
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-text-secondary">
            {formData.writtenFeedback.length < 50 && (
              <span className="text-warning">
                Minimum 50 characters required
              </span>
            )}
          </div>
          <span className="text-sm text-text-secondary">
            {formData.writtenFeedback.length}/{maxFeedbackLength}
          </span>
        </div>
        {errors.writtenFeedback && (
          <p className="text-error text-sm mt-2">{errors.writtenFeedback}</p>
        )}
      </div>
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h4 className="font-medium text-primary mb-2">Feedback Tips</h4>
        <ul className="text-sm text-primary space-y-1">
          <li>• Be specific with examples</li>
          <li>• Focus on professional behavior and skills</li>
          <li>• Provide constructive suggestions</li>
          <li>• Keep feedback respectful and objective</li>
          {formData.isAnonymous ? (
            <li>• Your identity will not be shown</li>
          ) : (
            <li>• Your name will be visible to others</li>
          )}
        </ul>
      </div>
    </div>
  );

  const renderRelationshipContext = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Relationship Context
        </h3>
        <p className="text-text-secondary mb-6">
          Help others understand your working relationship (this information
          remains anonymous)
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Relationship Type *
          </label>
          <select
            value={formData.relationshipType}
            onChange={(e) =>
              handleInputChange("relationshipType", e.target.value)
            }
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Select relationship type</option>
            {relationshipTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.relationshipType && (
            <p className="text-error text-sm mt-1">{errors.relationshipType}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Work Duration *
          </label>
          <select
            value={formData.workDuration}
            onChange={(e) => handleInputChange("workDuration", e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Select duration</option>
            {workDurations.map((duration) => (
              <option key={duration.value} value={duration.value}>
                {duration.label}
              </option>
            ))}
          </select>
          {errors.workDuration && (
            <p className="text-error text-sm mt-1">{errors.workDuration}</p>
          )}
        </div>
      </div>
      <div className="bg-success-50 border border-success-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Icon name="Shield" size={20} className="text-success mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-success mb-1">
              {formData.isAnonymous
                ? "Complete Anonymity"
                : "Identified Submission"}
            </h4>
            {formData.isAnonymous ? (
              <p className="text-success text-sm">
                Your identity will not be revealed. This rating will appear from
                an "Anonymous Colleague" with only relationship context and
                company verification.
              </p>
            ) : (
              <p className="text-success text-sm">
                Your name and public profile will be shown with this rating.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {formData.isAnonymous
            ? "Review Your Anonymous Rating"
            : "Review Your Identified Rating"}
        </h3>
        <p className="text-text-secondary mb-6">
          Please review your rating before submitting
        </p>
      </div>
      <div className="bg-surface border border-border rounded-lg p-6 space-y-6">
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Icon
              name={formData.isAnonymous ? "EyeOff" : "User"}
              size={16}
              className="text-warning"
            />
            <span className="text-sm font-medium text-warning">
              {formData.isAnonymous
                ? "This rating will be submitted anonymously"
                : "This rating will be submitted with your identity"}
            </span>
          </div>
        </div>
        <div>
          <h4 className="font-medium text-text-primary mb-2">Overall Rating</h4>
          <div className="flex items-center space-x-3">
            <StarRating rating={formData.overallRating} disabled />
            <span className="font-medium text-text-primary">
              {formData.overallRating}/5
            </span>
          </div>
        </div>
        <div>
          <h4 className="font-medium text-text-primary mb-3">
            Category Ratings
          </h4>
          <div className="space-y-2">
            {ratingCategories.map(
              (category) =>
                formData.categoryRatings[category.key] > 0 && (
                  <div
                    key={category.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-text-secondary">
                      {category.label}
                    </span>
                    <div className="flex items-center space-x-2">
                      <StarRating
                        rating={formData.categoryRatings[category.key]}
                        disabled
                        size={16}
                      />
                      <span className="text-sm font-medium text-text-primary">
                        {formData.categoryRatings[category.key]}/5
                      </span>
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-text-primary mb-2">
            Written Feedback
          </h4>
          <p className="text-text-secondary text-sm leading-relaxed">
            {formData.writtenFeedback}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <span className="text-sm text-text-secondary">Relationship:</span>
            <p className="font-medium text-text-primary">
              {
                relationshipTypes.find(
                  (type) => type.value === formData.relationshipType
                )?.label
              }
            </p>
          </div>
          <div>
            <span className="text-sm text-text-secondary">Duration:</span>
            <p className="font-medium text-text-primary">
              {
                workDurations.find((d) => d.value === formData.workDuration)
                  ?.label
              }
            </p>
          </div>
        </div>
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
          <h4 className="font-medium text-primary mb-1">
            How this will appear:
          </h4>
          <p className="text-primary text-sm">
            {formData.isAnonymous
              ? '"Anonymous Colleague"'
              : '"Your public profile name"'}{" "}
            •{" "}
            {
              relationshipTypes.find(
                (t) => t.value === formData.relationshipType
              )?.label
            }{" "}
            • {verificationResult?.matchedCompanies?.[0]}
          </p>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderCompanyVerification();
      case 1:
        return renderOverallRating();
      case 2:
        return renderCategoryRatings();
      case 3:
        return renderWrittenFeedback();
      case 4:
        return renderRelationshipContext();
      default:
        return renderCompanyVerification();
    }
  };

  const renderNavigationButtons = () => {
    if (currentStep === 0) return null;
    return (
      <div className="pt-8 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="h-10 px-4 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-smooth"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-primary-50 transition-smooth"
            >
              Save Draft
            </button>
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className="h-10 px-4 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-primary-50 transition-smooth"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto flex-wrap justify-end w-full sm:w-auto">
            {currentStep < totalSteps - 1 ? (
              <button
                onClick={handleNextStep}
                className="h-10 px-4 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-700 transition-smooth"
              >
                Next
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-10 px-4 rounded-lg text-sm font-medium border border-primary text-primary hover:bg-primary-50 transition-smooth w-full sm:w-auto"
                >
                  {showPreview ? "Edit" : "Preview"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting && (
                    <Icon name="Loader2" size={16} className="animate-spin" />
                  )}
                  <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 pb-20 md:pb-8">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="CheckCircle" size={32} className="text-success" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-4">
                {formData.isAnonymous
                  ? "Anonymous Rating Submitted Successfully!"
                  : "Rating Submitted Successfully!"}
              </h1>
              <p className="text-text-secondary mb-4">
                {formData.isAnonymous
                  ? "Thank you for providing anonymous feedback about "
                  : "Thank you for providing feedback about "}
                {professionalData.name}.
              </p>
              {formData.isAnonymous && (
                <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-8">
                  <div className="flex items-center space-x-2 justify-center">
                    <Icon name="Shield" size={16} className="text-success" />
                    <span className="text-success text-sm font-medium">
                      Your identity remains completely anonymous
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => navigate("/professional-search-discovery")}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
                >
                  Rate Another Professional
                </button>
                <button
                  onClick={() => navigate("/my-ratings-dashboard")}
                  className="px-6 py-3 border border-border text-text-primary rounded-lg hover:bg-primary-50 transition-smooth"
                >
                  View My Ratings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-16 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              {currentStep === 0
                ? "Verify Rating Eligibility"
                : "Rate Professional"}
            </h1>
            <p className="text-text-secondary">
              {currentStep === 0
                ? "We need to verify your company history to ensure rating authenticity."
                : "Share your experience working with this professional to help others make informed decisions."}
            </p>
          </div>
          {renderProgressBar()}
          {renderProfessionalHeader()}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-surface border border-border rounded-lg p-6">
                {showPreview ? renderPreview() : renderStepContent()}
                {renderNavigationButtons()}
              </div>
            </div>
            {currentStep > 0 && (
              <div className="hidden lg:block">
                <div className="bg-surface border border-border rounded-lg p-6 sticky top-24">
                  <h3 className="font-semibold text-text-primary mb-4">
                    Anonymous Rating Guidelines
                  </h3>
                  <div className="space-y-4">
                    {ratingGuidelines.map((guideline, index) => (
                      <div key={index}>
                        <h4 className="font-medium text-text-primary text-sm mb-1">
                          {guideline.title}
                        </h4>
                        <p className="text-text-secondary text-sm">
                          {guideline.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowGuidelines(true)}
                    className="mt-6 text-primary text-sm hover:text-primary-700 transition-smooth flex items-center space-x-1"
                  >
                    <Icon name="HelpCircle" size={16} />
                    <span>View Detailed Guidelines</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showGuidelines && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-1020">
          <div className="bg-surface rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  Anonymous Rating Guidelines
                </h2>
                <button
                  onClick={() => setShowGuidelines(false)}
                  className="p-2 hover:bg-primary-50 rounded-lg transition-smooth"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {ratingGuidelines.map((guideline, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h3 className="font-medium text-text-primary mb-2">
                      {guideline.title}
                    </h3>
                    <p className="text-text-secondary">
                      {guideline.description}
                    </p>
                  </div>
                ))}

                <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                  <h3 className="font-medium text-success mb-2">
                    Complete Anonymity
                  </h3>
                  <p className="text-success text-sm">
                    Your identity will never be revealed. All ratings appear as
                    "Anonymous Colleague" with only relationship context and
                    company verification shown.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-1020">
          <div className="bg-surface rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-warning-50 rounded-full flex items-center justify-center">
                  <Icon
                    name="AlertTriangle"
                    size={20}
                    className="text-warning"
                  />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Unsaved Changes
                </h2>
              </div>

              <p className="text-text-secondary mb-6">
                You have unsaved changes. Are you sure you want to leave? Your
                progress will be lost.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-primary-50 transition-smooth"
                >
                  Continue Rating
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 px-4 py-2 bg-error text-white rounded-lg hover:bg-error-700 transition-smooth"
                >
                  Leave Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateProfessional;
