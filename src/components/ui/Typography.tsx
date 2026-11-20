import React, { useState } from "react";
import { motion } from "framer-motion";
import { CaretLeft, CaretRight, Plus, Trash, X } from "@phosphor-icons/react";
import dayjs from "../../lib/dayjs";
import { Checkbox } from "./Checkbox";

const TYPO_VARIANT = {
  h1: "text-3xl md:text-4xl font-bold tracking-tight",
  h2: "text-2xl md:text-3xl font-bold tracking-tight",
  h3: "text-xl md:text-2xl font-bold tracking-tight border-b border-border pb-2",
  subtitle: "text-lg font-semibold",
  body: "text-base",
  caption: "text-sm text-text-sub leading-relaxed",
  label: "text-sm font-medium tracking-wide",
} as const;

const TYPO_COLOR = {
  main: "text-text-main",
  sub: "text-text-sub",
  muted: "text-text-muted",
  brand: "text-brand-red",
  error: "text-status-danger",
} as const;

const TYPO_WEIGHT = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

const TYPO_ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function Typography({
  children,
  variant = "body",
  as,
  className = "",
  color = "main",
  weight,
  align = "left",
}: {
  children: React.ReactNode;
  variant?: keyof typeof TYPO_VARIANT;
  as?: React.ElementType;
  className?: string;
  color?: keyof typeof TYPO_COLOR;
  weight?: keyof typeof TYPO_WEIGHT;
  align?: keyof typeof TYPO_ALIGN;
}) {
  const Comp =
    as ||
    (variant === "h1"
      ? "h1"
      : variant === "h2"
      ? "h2"
      : variant === "h3"
      ? "h3"
      : variant === "label"
      ? "label"
      : "p");

  const classes = [
    TYPO_VARIANT[variant],
    TYPO_COLOR[color],
    weight ? TYPO_WEIGHT[weight] : "",
    TYPO_ALIGN[align],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Comp className={classes}>{children}</Comp>;
}

export function PageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`py-6 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end justify-between border-b border-border pb-4 mb-6 ${className}`}
    >
      <div>
        <h2 className="text-2xl font-bold text-text-main tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-text-sub mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end justify-between ${className} border-b border-border pb-4 mb-6`}
    >
      <div>
        <h3 className="text-xl font-bold text-text-main tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text-sub mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-text-sub">{message}</p>
      {action}
    </div>
  );
}

const ICON_BTN_VARIANTS = {
  ghost:
    "text-text-sub hover:text-text-main hover:bg-white/5 bg-transparent border border-transparent",
  outline:
    "text-text-main border border-border hover:border-text-sub bg-transparent",
  filled:
    "text-white bg-surface-elevated hover:bg-surface-elevated/80 border border-transparent",
} as const;

const ICON_BTN_SIZES = {
  sm: "p-1.5 rounded-md text-sm",
  md: "p-2 rounded-lg text-base",
  lg: "p-3 rounded-xl text-lg",
} as const;

export function IconButton({
  children,
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof ICON_BTN_VARIANTS;
  size?: keyof typeof ICON_BTN_SIZES;
}) {
  return (
    <button
      className={`flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${ICON_BTN_VARIANTS[variant]} ${ICON_BTN_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 mb-6 p-1.5 rounded-2xl bg-white/5 backdrop-blur-md ${className}`}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
              active
                ? "text-white"
                : "text-text-sub hover:text-white hover:bg-white/5"
            }`}
          >
            {active && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary/20 border border-primary/30 rounded-xl shadow-[0_0_15px_rgba(211,44,43,0.3)]"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {Icon && (
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active ? "text-primary" : ""
                  }`}
                />
              )}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SelectionSummary({
  totalCount,
  selectedCount,
  onSelectAll,
  className = "",
}: {
  totalCount: number;
  selectedCount: number;
  onSelectAll: (checked: boolean) => void;
  className?: string;
}) {
  const checked = totalCount > 0 && selectedCount === totalCount;
  const indeterminate = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div className={`flex items-center justify-between px-4 py-2 mb-2 ${className}`}>
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        onChange={(e) => onSelectAll(e.target.checked)}
        label={
          <div className="flex items-center gap-2">
            <Typography
              variant="caption"
              weight="bold"
              color={selectedCount > 0 ? "main" : "sub"}
            >
              전체 선택
            </Typography>
            {selectedCount > 0 && (
              <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.5 rounded-full">
                {selectedCount}
              </span>
            )}
          </div>
        }
      />
      <Typography variant="caption" color="muted">
        총 {totalCount}건
      </Typography>
    </div>
  );
}

export function FloatingActionBar({
  selectedCount,
  onClear,
  onDelete,
  onCreate,
  deleteLabel = "삭제",
}: {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
  deleteLabel?: string;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-surface-elevated border border-brand-red/30 px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-sm font-bold text-white whitespace-nowrap">
        {selectedCount}개 선택됨
      </span>
      <div className="h-4 w-px bg-white/20" />
      <div className="flex items-center gap-2">
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center shrink-0 whitespace-nowrap gap-2 px-3 py-1.5 text-sm font-medium text-bg-main bg-brand-red rounded-md hover:bg-red-600 transition-colors cursor-pointer"
          >
            <Plus weight="bold" /> 생성
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center shrink-0 whitespace-nowrap gap-2 px-3 py-1.5 text-sm font-medium text-status-danger hover:bg-status-danger/10 rounded-md transition-colors cursor-pointer"
          >
            <Trash weight="bold" /> {deleteLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 flex items-center justify-center p-1.5 text-text-sub hover:text-white transition-colors cursor-pointer"
        >
          <X weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function Calendar({
  selectedDates,
  onChange,
}: {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const startOfMonth = currentMonth.startOf("month");
  const startDay = startOfMonth.day();
  const daysInMonth = currentMonth.daysInMonth();
  const currentYear = dayjs().year();
  const isMinMonth =
    currentMonth.year() === currentYear && currentMonth.month() === 0;
  const isMaxMonth =
    currentMonth.year() === currentYear + 1 && currentMonth.month() === 11;

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      onChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onChange([...selectedDates, dateStr].sort());
    }
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = startOfMonth.date(day);
    const dateStr = dateObj.format("YYYY-MM-DD");
    const isSelected = selectedDates.includes(dateStr);
    const isToday = dateObj.isSame(dayjs(), "day");

    cells.push(
      <button
        key={dateStr}
        type="button"
        onClick={() => toggleDate(dateStr)}
        className={`relative h-10 w-10 rounded-full text-sm font-medium transition-all flex items-center justify-center cursor-pointer ${
          isSelected
            ? "bg-brand-red text-white shadow-lg shadow-brand-red/30"
            : "text-text-main hover:bg-white/10"
        }`}
      >
        {day}
        {isToday && (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-red" />
        )}
      </button>
    );
  }

  return (
    <div className="py-2 bg-surface w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => !isMinMonth && setCurrentMonth((m) => m.subtract(1, "month"))}
          disabled={isMinMonth}
          className={`p-2 rounded-lg transition-colors ${
            isMinMonth
              ? "text-white/10 cursor-not-allowed"
              : "text-text-sub hover:text-white hover:bg-white/10 cursor-pointer"
          }`}
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <span className="text-lg font-bold text-text-main">
          {currentMonth.format("YYYY년 M월")}
        </span>
        <button
          type="button"
          onClick={() => !isMaxMonth && setCurrentMonth((m) => m.add(1, "month"))}
          disabled={isMaxMonth}
          className={`p-2 rounded-lg transition-colors ${
            isMaxMonth
              ? "text-white/10 cursor-not-allowed"
              : "text-text-sub hover:text-white hover:bg-white/10 cursor-pointer"
          }`}
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2 text-center">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <span key={d} className="text-sm font-medium text-text-sub">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 justify-items-center">{cells}</div>
    </div>
  );
}
