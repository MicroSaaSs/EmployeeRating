import React, { useState } from "react";
import Icon from "../../../components/AppIcon";

type RegisterFormProps = {
  onSuccess: () => void;
};

type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type RegisterFormErrors = Partial<Record<keyof RegisterFormState, string>>;

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name as keyof RegisterFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { text: "Very Weak", color: "text-error" } as const;
      case 2:
        return { text: "Weak", color: "text-warning" } as const;
      case 3:
        return { text: "Fair", color: "text-warning" } as const;
      case 4:
        return { text: "Good", color: "text-success" } as const;
      case 5:
        return { text: "Strong", color: "text-success" } as const;
      default:
        return { text: "", color: "" } as const;
    }
  };

  const validateForm = () => {
    const newErrors: RegisterFormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setTimeout(() => {
      onSuccess();
      setIsLoading(false);
    }, 2000);
  };

  const strengthIndicator = getPasswordStrengthText();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth ${
              errors.firstName ? "border-error" : "border-border"
            }`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-error">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth ${
              errors.lastName ? "border-error" : "border-border"
            }`}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-error">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Email Address
        </label>
        <div className="relative">
          <Icon
            name="Mail"
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
          />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth ${
              errors.email ? "border-error" : "border-border"
            }`}
            placeholder="john.doe@example.com"
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-error">{errors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text_sm font-medium text-text-primary mb-2"
        >
          Password
        </label>
        <div className="relative">
          <Icon
            name="Lock"
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
          />
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth ${
              errors.password ? "border-error" : "border-border"
            }`}
            placeholder="Create a strong password"
          />
        </div>
        {formData.password && (
          <div className="mt-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-border rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength <= 2
                      ? "bg-error"
                      : passwordStrength <= 3
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                ></div>
              </div>
              <span
                className={`text-sm font-medium ${strengthIndicator.color}`}
              >
                {strengthIndicator.text}
              </span>
            </div>
          </div>
        )}
        {errors.password && (
          <p className="mt-1 text-sm text-error">{errors.password}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Confirm Password
        </label>
        <div className="relative">
          <Icon
            name="Lock"
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
          />
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth ${
              errors.confirmPassword ? "border-error" : "border-border"
            }`}
            placeholder="Confirm your password"
          />
          {formData.confirmPassword &&
            formData.password === formData.confirmPassword && (
              <Icon
                name="Check"
                size={20}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-success"
              />
            )}
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-error">{errors.confirmPassword}</p>
        )}
      </div>

      <div>
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary focus:ring-primary border-border rounded mt-1"
          />
          <span className="text-sm text-text-secondary">
            I agree to the{" "}
            <button
              type="button"
              className="text-primary hover:text-primary-700 font-medium"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="text-primary hover:text-primary-700 font-medium"
            >
              Privacy Policy
            </button>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1 text-sm text-error">{errors.acceptTerms}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Creating account...
          </div>
        ) : (
          <>
            <Icon name="UserPlus" size={20} className="mr-2" />
            Create Account
          </>
        )}
      </button>
    </form>
  );
};

export default RegisterForm;
