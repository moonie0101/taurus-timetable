import React from "react";
import { CaretDown } from "@phosphor-icons/react";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: SelectOption[];
  value: string | number;
  onChange: (value: string) => void;
  fullWidth?: boolean;
}

export function Select({
  label,
  options,
  value,
  onChange,
  className = "",
  fullWidth = true,
  ...props
}: SelectProps) {
  return (
    <div className={`${fullWidth ? "w-full" : "w-auto"} space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-sub ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`taurus-select appearance-none ${
            fullWidth ? "w-full" : "w-auto"
          } bg-surface border border-border rounded-xl px-4 py-2.5 pr-10 text-text-main text-sm font-medium outline-none transition-all hover:border-border-active focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/10 cursor-pointer`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="bg-surface text-text-main disabled:text-text-muted"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-sub group-hover:text-text-main transition-colors">
          <CaretDown weight="bold" size={16} />
        </div>
      </div>
    </div>
  );
}
