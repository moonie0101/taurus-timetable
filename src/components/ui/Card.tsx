import React from "react";

export function Card({
  children,
  onClick,
  className = "",
  hoverable = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}) {
  const base = "bg-surface rounded-xl border border-border transition-all duration-200";
  const hover = hoverable
    ? "hover:border-border-active hover:bg-surface-elevated cursor-pointer group"
    : "";
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={`${base} ${hover} ${className} ${onClick ? "text-left w-full" : ""}`}
    >
      {children}
    </Comp>
  );
}

export function ListRow({
  left,
  center,
  right,
  onClick,
  className = "",
  align = "center",
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  align?: "center" | "start";
}) {
  const Comp = onClick ? "button" : "div";
  const alignCls = align === "start" ? "items-start" : "items-center";

  return (
    <Comp
      onClick={onClick}
      className={`w-full flex ${alignCls} justify-between p-4 border-b border-border last:border-0 transition-colors duration-200 ${
        onClick ? "cursor-pointer hover:bg-surface-elevated text-left" : ""
      } ${className}`}
    >
      <div className={`flex ${alignCls} gap-4 flex-1 min-w-0`}>
        {left && <div className="flex-shrink-0">{left}</div>}
        {center && <div className="flex-1 min-w-0">{center}</div>}
      </div>
      {right && <div className="flex-shrink-0 ml-4">{right}</div>}
    </Comp>
  );
}

export function SettingRow({
  label,
  description,
  children,
  className = "",
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between py-6 border-b border-border last:border-0 group ${className}`}
    >
      <div className="mb-4 md:mb-0 pr-8">
        <h4 className="text-base font-medium text-text-main">{label}</h4>
        {description && (
          <p className="text-sm text-text-sub mt-1 max-w-md break-keep">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
