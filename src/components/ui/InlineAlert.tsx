import React from "react";
import { Info, Warning, WarningCircle, CheckCircle } from "@phosphor-icons/react";

const ALERT_CONFIG = {
  info: {
    Icon: Info,
    style: "bg-status-info/10 border-status-info/20 text-status-info",
  },
  warn: {
    Icon: Warning,
    style: "bg-status-warn/10 border-status-warn/20 text-status-warn",
  },
  error: {
    Icon: WarningCircle,
    style: "bg-status-danger/10 border-status-danger/20 text-status-danger",
  },
  success: {
    Icon: CheckCircle,
    style: "bg-status-success/10 border-status-success/20 text-status-success",
  },
} as const;

export function InlineAlert({
  variant = "info",
  children,
  title,
  className = "",
}: {
  variant?: keyof typeof ALERT_CONFIG;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  const { Icon, style } = ALERT_CONFIG[variant];
  return (
    <div className={`flex gap-3 p-4 my-4 rounded-lg border ${style} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" weight="fill" />
      <div className="flex-1 text-sm">
        {title && <strong className="block font-bold mb-1">{title}</strong>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
