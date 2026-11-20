import React from "react";
import { WarningCircle } from "@phosphor-icons/react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, fullWidth = false, className = "", ...props }, ref) => {
    const base =
      "bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-text-sub/50 disabled:opacity-50 disabled:cursor-not-allowed";
    const state = error
      ? "border-status-danger/50 focus:border-status-danger focus:ring-status-danger/50"
      : "focus:border-primary focus:ring-1 focus:ring-primary/50";
    const widthCls = fullWidth ? "" : "w-full";

    return (
      <div className={`${widthCls} text-left`}>
        {label && (
          <label className="block text-sm font-medium text-text-sub mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`${base} ${state} ${icon ? "pl-10" : ""} ${widthCls} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 ml-1 text-xs text-status-danger flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
            <WarningCircle size={14} weight="fill" className="shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
