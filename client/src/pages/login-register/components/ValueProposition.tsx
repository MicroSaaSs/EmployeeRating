import React from "react";
import Icon, { IconName } from "../../../components/AppIcon";
import Image from "../../../components/AppImage";

const ValueProposition: React.FC = () => {
  const benefits: Array<{
    icon: IconName;
    title: string;
    description: string;
  }> = [
    {
      icon: "Users",
      title: "Professional Network",
      description:
        "Connect with verified professionals and build meaningful relationships in your industry.",
    },
    {
      icon: "Star",
      title: "Community Ratings",
      description:
        "Get honest feedback from colleagues and peers to build your professional reputation.",
    },
    {
      icon: "Shield",
      title: "Verified Profiles",
      description:
        "All profiles are LinkedIn-verified ensuring authentic professional connections.",
    },
    {
      icon: "TrendingUp",
      title: "Career Growth",
      description:
        "Track your professional development and showcase your achievements to the community.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Senior Software Engineer",
      company: "TechCorp",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      content: `ProRate has transformed how I connect with other professionals. The rating system helps me identify top talent for collaborations.`,
    },
    {
      name: "Michael Chen",
      role: "Product Manager",
      company: "InnovateLab",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      content: `The platform's community-driven approach gives me confidence when reaching out to new professionals in my field.`,
    },
  ];

  const stats = [
    { number: "50,000+", label: "Active Professionals" },
    { number: "200,000+", label: "Ratings Given" },
    { number: "95%", label: "User Satisfaction" },
    { number: "150+", label: "Countries" },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center lg:text-left">
        <h2 className="text-4xl font-bold text-text-primary mb-6">
          Build Your Professional Reputation
        </h2>
        <p className="text-xl text-text-secondary mb-8">
          Join thousands of professionals who trust ProRate to showcase their
          skills, connect with peers, and advance their careers through
          community-driven ratings.
        </p>
        <div className="grid grid-cols-2 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-text-secondary">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-text-primary">
          Why Choose ProRate?
        </h3>
        <div className="space-y-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name={benefit.icon} size={24} className="text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-2">
                  {benefit.title}
                </h4>
                <p className="text-text-secondary">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-text-primary">
          What Professionals Say
        </h3>
        <div className="space-y-6">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-primary-50 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded_full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-text-primary mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold text-text-primary">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-center space-x-8">
          <div className="flex items-center space-x-2">
            <Icon name="Shield" size={20} className="text-success" />
            <span className="text-sm text-text-secondary">SSL Secured</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="Lock" size={20} className="text-success" />
            <span className="text-sm text-text_secondary">GDPR Compliant</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="Linkedin" size={20} className="text-[#0077B5]" />
            <span className="text-sm text-text-secondary">
              LinkedIn Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValueProposition;
