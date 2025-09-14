import React from "react";
import * as LucideIcons from "lucide-react";
import { HelpCircle } from "lucide-react";

export type IconName = keyof typeof LucideIcons;

export interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

const Icon: React.FC<AppIconProps> = ({
  name,
  size = 24,
  color = "currentColor",
  className = "",
  strokeWidth = 2,
  ...props
}) => {
  const IconComponent = (
    LucideIcons as unknown as Record<string, React.ComponentType<any>>
  )[name] as React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined;

  if (!IconComponent) {
    return (
      <HelpCircle
        size={size}
        color="gray"
        strokeWidth={strokeWidth}
        className={className}
        {...props}
      />
    );
  }

  return (
    <IconComponent
      width={size}
      height={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
};

export default Icon;
