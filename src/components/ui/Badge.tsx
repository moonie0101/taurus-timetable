import React from "react";

const BADGE_VARIANTS = {
  default: "bg-surface-elevated text-text-sub border border-border",
  brand: "bg-brand-red/10 text-brand-red border border-brand-red/20",
  success: "bg-status-success/10 text-status-success border border-status-success/20",
  warn: "bg-status-warn/10 text-status-warn border border-status-warn/20",
  danger: "bg-status-danger/10 text-status-danger border border-status-danger/20",
  info: "bg-status-info/10 text-status-info border border-status-info/20",
  outline: "bg-transparent text-text-sub border border-border",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof BADGE_VARIANTS;
}

export function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
