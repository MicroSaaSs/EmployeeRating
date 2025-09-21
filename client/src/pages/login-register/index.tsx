import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/AppIcon";
import { startLinkedInLogin } from "../../utils/auth";

/**
 * Modern, friendly redesign for the ProRate login/landing page.
 * - Lighter information density, stronger visual hierarchy
 * - Clear primary CTA (LinkedIn), supportive secondary actions
 * - Better mobile layout + accessibility
 * - Softer glassmorphism card on a gradient canvas
 * - Social proof strip and concise benefits grid
 * - Motion-free by default to keep bundle light; add `data-animate` to enable subtle transitions
 */

const people = [
  {
    name: "Sarah Johnson",
    role: "Senior Software Engineer at TechCorp",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg",
    quote:
      "E-ProRate has transformed how I connect with other professionals. The rating system helps me identify top talent for collaborations.",
  },
  {
    name: "Michael Chen",
    role: "Product Manager at InnovateLab",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    quote:
      "The platform's community-driven approach gives me confidence when reaching out to new professionals in my field.",
  },
  {
    name: "Priya Singh",
    role: "Data Scientist at QuantifyAI",
    avatar:
      "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=150&h=150&fit=crop&crop=face",
    quote:
      "Having verified, context-rich ratings saves me hours when evaluating potential collaborators on research and product experiments.",
  },
  {
    name: "Daniel Roberts",
    role: "Design Lead at FlowCreative",
    avatar:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face",
    quote:
      "E-ProRate surfaces the soft skills that rarely show up on resumes. It's become part of our hiring signal and mentoring program.",
  },
];

const benefits = [
  {
    icon: "Users" as const,
    title: "Professional Network",
    desc: "Connect with verified professionals and build meaningful relationships.",
  },
  {
    icon: "Star" as const,
    title: "Community Ratings",
    desc: "Get honest feedback from colleagues and peers to grow reputation.",
  },
  {
    icon: "Shield" as const,
    title: "Verified Profiles",
    desc: "All profiles are LinkedIn-verified for authentic connections.",
  },
  {
    icon: "TrendingUp" as const,
    title: "Career Growth",
    desc: "Track development and showcase achievements to the community.",
  },
];

const stats = [
  { number: "50,000+", label: "Active Professionals" },
  { number: "200,000+", label: "Ratings Given" },
  { number: "95%", label: "User Satisfaction" },
  { number: "150+", label: "Countries" },
];

const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm ${
      className ?? ""
    }`}
  >
    <Icon name="Users" size={20} color="white" />
  </div>
);

const SocialProofStrip: React.FC = () => (
  <div className="mt-8">
    <div className="flex items-center gap-3 text-sm text-text-secondary">
      <div className="flex -space-x-2">
        {people.map((p, i) => (
          <img
            key={i}
            src={p.avatar}
            alt={p.name}
            className="w-7 h-7 rounded-full ring-2 ring-white/80 object-cover"
            loading={i > 1 ? "lazy" : undefined}
          />
        ))}
      </div>
      <span>Trusted by 50,000+ professionals</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="Star" size={14} className="text-warning" />
        ))}
        <span className="ml-1">4.8/5</span>
      </span>
    </div>
  </div>
);

const BenefitsGrid: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {benefits.map((b) => (
      <div
        key={b.title}
        className="group rounded-2xl border border-border bg-surface/70 backdrop-blur p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
            <Icon name={b.icon} size={22} className="text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary">{b.title}</h4>
            <p className="text-sm text-text-secondary mt-1">{b.desc}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const StatPills: React.FC = () => (
  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
    {stats.map((s) => (
      <div
        key={s.label}
        className="rounded-xl border border-border bg-background/70 px-4 py-3 text-center"
      >
        <div className="text-lg font-semibold text-primary">{s.number}</div>
        <div className="text-xs text-text-secondary">{s.label}</div>
      </div>
    ))}
  </div>
);

const TestimonialCards: React.FC = () => (
  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
    {people.map((p) => (
      <figure key={p.name} className="rounded-2xl bg-primary-50 p-5">
        <div className="flex items-start gap-3">
          <img
            src={p.avatar}
            alt={p.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <blockquote className="text-sm text-text-primary italic">
              “{p.quote}”
            </blockquote>
            <figcaption className="mt-3">
              <div className="font-medium text-text-primary">{p.name}</div>
              <div className="text-xs text-text-secondary">{p.role}</div>
            </figcaption>
          </div>
        </div>
      </figure>
    ))}
  </div>
);

const WhyLinkedInDisclosure: React.FC = () => (
  <div className="mt-4 flex justify-center">
    <div className="relative group inline-block">
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-700 cursor-help">
        <Icon name="Info" size={14} className="text-primary" />
        Why LinkedIn?
      </span>
      <div
        id="why-linkedin-tooltip"
        role="tooltip"
        className="pointer-events-none absolute left-full top-0 z-20 ml-3 w-72 max-w-[min(95vw,18rem)] rounded-xl border border-primary-200 bg-primary-50 p-3 text-left text-sm text-text-secondary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <ul className="list-disc pl-5 space-y-1">
          <li>Ensure ratings come from real professionals</li>
          <li>Verify shared company history for credibility</li>
          <li>No passwords stored; convenient one-tap sign-in</li>
        </ul>
      </div>
    </div>
  </div>
);

const LinkedInButton: React.FC<{
  isLoading: boolean;
  onClick(): void;
}> = ({ isLoading, onClick }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    aria-busy={isLoading}
    className="relative z-10 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#0A66C2] text-white font-semibold shadow-lg hover:bg-[#0a58a5] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A66C2] disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        Redirecting to LinkedIn…
      </>
    ) : (
      <>
        <Icon name="Linkedin" size={22} />
        Continue with LinkedIn
      </>
    )}
  </button>
);

const PageChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background relative">
    {/* Radial spotlights */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary-200/30 blur-3xl" />
      <div className="absolute -bottom-56 -left-32 w-[560px] h-[560px] rounded-full bg-secondary-200/20 blur-3xl" />
    </div>

    <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-surface/70 bg-surface/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <LogoMark />
          <span className="font-heading font-semibold text-xl text-primary">
            E-ProRate
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <a
            href="#benefits"
            className="text-text-secondary hover:text-primary"
          >
            Benefits
          </a>
          <a
            href="#testimonials"
            className="text-text-secondary hover:text-primary"
          >
            Testimonials
          </a>
          <Link to="/help" className="text-text-secondary hover:text-primary">
            Help
          </Link>
        </nav>
      </div>
    </header>

    <main className="relative flex-1">{children}</main>

    <footer className="bg-surface border-t border-border py-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 text-sm">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-text-secondary">
            <Link to="/privacy" className="hover:text-primary">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary">
              Terms of Service
            </Link>
            <Link to="/help" className="hover:text-primary">
              Help Center
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1">
              <Icon name="Shield" size={14} className="text-success" /> SSL
              Secured
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1">
              <Icon name="CheckCircle" size={14} className="text-success" />{" "}
              GDPR Compliant
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1">
              <Icon name="Linkedin" size={14} className="text-[#0A66C2]" />{" "}
              LinkedIn Verified
            </span>
          </div>
          <p className="text-text-secondary">
            © {new Date().getFullYear()} E-ProRate. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
);

const LoginRegister: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  // Tooltip hover/FOCUS handled in WhyLinkedInDisclosure; no state needed here

  const handleLinkedInAuth = async () => {
    setIsLoading(true);
    startLinkedInLogin();
  };

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <PageChrome>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-14 pb-12 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Hero copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
              <Icon name="Shield" size={14} className="text-primary" />
              LinkedIn-Verified Community
            </span>

            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
              Build your professional reputation
            </h1>
            <p className="mt-4 text-lg text-text-secondary">
              Join thousands of professionals who trust ProRate to showcase
              skills, connect with peers, and advance their careers through
              community-driven ratings.
            </p>

            <div className="mt-6 max-w-md">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#0A66C2]/25 via-primary/20 to-secondary/20 blur-xl opacity-70 animate-pulse" />
                <LinkedInButton
                  isLoading={isLoading}
                  onClick={handleLinkedInAuth}
                />
              </div>
              <p className="mt-2 text-xs text-text-secondary text-center">
                We never post to LinkedIn. Used only for identity & company
                verification.
              </p>
              <WhyLinkedInDisclosure />

              <p className="mt-6 text-xs text-text-secondary text-center">
                By continuing you agree to our{" "}
                <Link
                  to="/terms"
                  className="text-primary hover:text-primary-700"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-primary hover:text-primary-700"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <SocialProofStrip />
          </div>

          {/* Right: Benefits + Stats */}
          <div className="w-full max-w-xl lg:ml-auto">
            <div className="relative rounded-3xl border border-border bg-surface/80 backdrop-blur p-6 shadow-modal">
              <div className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 opacity-20 hidden sm:block">
                <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0A66C2" stopOpacity="0.5" />
                      <stop
                        offset="100%"
                        stopColor="#7c3aed"
                        stopOpacity="0.3"
                      />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="58" fill="url(#g1)" />
                </svg>
              </div>
              <BenefitsGrid />
              <StatPills />
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div id="testimonials" className="mt-16">
          <h3 className="text-2xl font-semibold text-text-primary">
            What professionals say
          </h3>
          <TestimonialCards />
        </div>

        {/* Minimal legal copy for mobile-only bottom spacing */}
        <p className="mt-10 text-center text-xs text-text-secondary lg:hidden">
          © {year} E-ProRate
        </p>
      </section>

      {isLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center z-50">
          <div className="bg-surface rounded-xl p-5 border border-border shadow-lg flex items-center gap-3">
            <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
            <span className="text-text-primary font-medium">
              Authenticating…
            </span>
          </div>
        </div>
      )}
    </PageChrome>
  );
};

export default LoginRegister;
