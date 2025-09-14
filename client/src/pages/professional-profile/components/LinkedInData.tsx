import React, { useState } from "react";
import Icon from "../../../components/AppIcon";

type Experience = {
  id: number | string;
  title: string;
  company: string;
  duration: string;
  location: string;
  description: string;
};
type Education = {
  id: number | string;
  degree: string;
  school: string;
  year: string;
  location: string;
};
type Certification = {
  id: number | string;
  name: string;
  issuer: string;
  year: string;
};

type LinkedInDataProps = {
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  connectionsCount: number;
};

const LinkedInData: React.FC<LinkedInDataProps> = ({
  experience,
  education,
  skills,
  certifications,
  connectionsCount,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    experience: true,
    education: false,
    skills: false,
    certifications: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader: React.FC<{
    title: string;
    icon: any;
    isExpanded: boolean;
    onToggle: () => void;
    count?: number;
  }> = ({ title, icon, isExpanded, onToggle, count }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-primary-50 transition-smooth"
    >
      <div className="flex items-center space-x-3">
        <Icon name={icon as any} size={20} className="text-primary" />
        <h3 className="font-semibold text-text-primary">{title}</h3>
        {typeof count === "number" && (
          <span className="text-sm text-text-secondary">({count})</span>
        )}
      </div>
      <Icon
        name={isExpanded ? "ChevronUp" : "ChevronDown"}
        size={20}
        className="text-text-secondary"
      />
    </button>
  );

  return (
    <div className="bg-surface rounded-xl shadow-card border border-border overflow-hidden">
      <div className="bg-primary-50 px-6 py-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Icon name="Linkedin" size={16} color="white" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">
              LinkedIn Profile Data
            </h2>
            <p className="text-sm text-text-secondary">
              {connectionsCount.toLocaleString()} connections
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <SectionHeader
          title="Work Experience"
          icon="Briefcase"
          isExpanded={expandedSections.experience}
          onToggle={() => toggleSection("experience")}
          count={experience.length}
        />
        {expandedSections.experience && (
          <div className="px-6 pb-6">
            <div className="space-y-6">
              {experience.map((exp, index) => (
                <div key={exp.id} className="relative">
                  {index < experience.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-full bg-border"></div>
                  )}
                  <div className="flex space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon
                        name="Building2"
                        size={20}
                        className="text-primary"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-text-primary mb-1">
                        {exp.title}
                      </h4>
                      <p className="text-primary font-medium mb-1">
                        {exp.company}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-text-secondary mb-3">
                        <span>{exp.duration}</span>
                        <span>•</span>
                        <span>{exp.location}</span>
                      </div>
                      <div className="text-sm text-text-secondary leading-relaxed">
                        <p>{exp.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-border">
        <SectionHeader
          title="Education"
          icon="GraduationCap"
          isExpanded={expandedSections.education}
          onToggle={() => toggleSection("education")}
          count={education.length}
        />
        {expandedSections.education && (
          <div className="px-6 pb-6">
            <div className="space-y-4">
              {education.map((edu) => (
                <div key={edu.id} className="flex space-x-4">
                  <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon
                      name="GraduationCap"
                      size={20}
                      className="text-secondary"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-primary mb-1">
                      {edu.degree}
                    </h4>
                    <p className="text-secondary font-medium mb-1">
                      {edu.school}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span>{edu.year}</span>
                      <span>•</span>
                      <span>{edu.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-border">
        <SectionHeader
          title="Skills & Expertise"
          icon="Zap"
          isExpanded={expandedSections.skills}
          onToggle={() => toggleSection("skills")}
          count={skills.length}
        />
        {expandedSections.skills && (
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-accent-50 text-accent-700 text-sm font-medium rounded-full border border-accent-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Certifications"
          icon="Award"
          isExpanded={expandedSections.certifications}
          onToggle={() => toggleSection("certifications")}
          count={certifications.length}
        />
        {expandedSections.certifications && (
          <div className="px-6 pb-6">
            <div className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex space-x-4">
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Award" size={20} className="text-success" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-primary mb-1">
                      {cert.name}
                    </h4>
                    <p className="text-success font-medium mb-1">
                      {cert.issuer}
                    </p>
                    <p className="text-sm text-text-secondary">{cert.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInData;
