import React, { useEffect, useMemo, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import dayjs from "../../../lib/dayjs";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function MultiDateCalendar({
  selectedDates,
  onChange,
}: {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf("month"));
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const latestSelectedRef = useRef(selectedSet);
  latestSelectedRef.current = selectedSet;

  const dragRef = useRef<{
    active: boolean;
    action: "add" | "remove";
    anchorDate: string;
    baseSelected: Set<string>;
    lastHover: string;
  }>({
    active: false,
    action: "add",
    anchorDate: "",
    baseSelected: new Set(),
    lastHover: "",
  });

  const monthWeeks = useMemo(() => {
    const startOfMonth = currentMonth.startOf("month");
    const daysInMonth = currentMonth.daysInMonth();
    const firstWeekday = startOfMonth.day();

    const rows: (dayjs.Dayjs | null)[][] = [];
    let currentRow: (dayjs.Dayjs | null)[] = Array(firstWeekday).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      currentRow.push(startOfMonth.date(d));
      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      while (currentRow.length < 7) currentRow.push(null);
      rows.push(currentRow);
    }
    return rows;
  }, [currentMonth]);

  const allMonthDates = useMemo(
    () =>
      monthWeeks
        .flat()
        .filter((d): d is dayjs.Dayjs => Boolean(d))
        .map((d) => d.format("YYYY-MM-DD")),
    [monthWeeks]
  );

  const toggleDateList = (targets: string[]) => {
    if (targets.length === 0) return;
    const allAlreadySelected = targets.every((d) => selectedSet.has(d));
    const next = new Set(selectedSet);
    if (allAlreadySelected) {
      targets.forEach((d) => next.delete(d));
    } else {
      targets.forEach((d) => next.add(d));
    }
    onChange(Array.from(next).sort());
  };

  const applyRangeDrag = (anchorDate: string, hoverDate: string) => {
    const start = anchorDate <= hoverDate ? anchorDate : hoverDate;
    const end = anchorDate <= hoverDate ? hoverDate : anchorDate;
    const next = new Set(dragRef.current.baseSelected);
    for (const dStr of allMonthDates) {
      if (dStr >= start && dStr <= end) {
        if (dragRef.current.action === "add") next.add(dStr);
        else next.delete(dStr);
      }
    }
    onChange(Array.from(next).sort());
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = targetEl?.closest<HTMLElement>("[data-cal-date]");
      const dateStr = cellEl?.dataset.calDate;
      if (!dateStr || dateStr === dragRef.current.lastHover) return;
      dragRef.current.lastHover = dateStr;
      applyRangeDrag(dragRef.current.anchorDate, dateStr);
    };

    const handlePointerUp = () => {
      dragRef.current.active = false;
      dragRef.current.lastHover = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [allMonthDates, onChange]);

  const handleDayPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    dateStr: string
  ) => {
    e.preventDefault();
    const isAlreadySelected = latestSelectedRef.current.has(dateStr);
    const action: "add" | "remove" = isAlreadySelected ? "remove" : "add";
    dragRef.current = {
      active: true,
      action,
      anchorDate: dateStr,
      baseSelected: new Set(latestSelectedRef.current),
      lastHover: dateStr,
    };
    applyRangeDrag(dateStr, dateStr);
  };

  const isMonthAllSelected =
    allMonthDates.length > 0 && allMonthDates.every((d) => selectedSet.has(d));

  return (
    <div className="bg-bg-main/60 border border-border rounded-2xl p-4 space-y-3 select-none">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => m.subtract(1, "month"))}
            className="p-1.5 sm:p-2 rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="이전 달"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <span className="text-sm sm:text-lg font-bold text-text-main px-0.5 sm:px-1 whitespace-nowrap">
            {currentMonth.format("YYYY년 M월")}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => m.add(1, "month"))}
            className="p-1.5 sm:p-2 rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="다음 달"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => toggleDateList(allMonthDates)}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              isMonthAllSelected
                ? "bg-brand-red/20 border-brand-red text-brand-red"
                : "bg-surface border-border text-text-sub hover:text-white hover:border-border-active"
            }`}
          >
            이번 달 전부
          </button>
          {selectedDates.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-surface border border-border text-text-sub hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Weekday bulk-select header + spacer for week column */}
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1 text-center items-center">
        <span className="text-[10px] text-text-muted font-medium">주차</span>
        {WEEKDAYS.map((label, dayIdx) => {
          const weekdayDates = monthWeeks
            .map((row) => row[dayIdx])
            .filter((d): d is dayjs.Dayjs => Boolean(d))
            .map((d) => d.format("YYYY-MM-DD"));
          const allSelected =
            weekdayDates.length > 0 &&
            weekdayDates.every((d) => selectedSet.has(d));

          return (
            <button
              key={label}
              type="button"
              title={`${label}요일 전체 선택/해제`}
              onClick={() => toggleDateList(weekdayDates)}
              className={`py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                allSelected
                  ? "bg-brand-red/20 text-brand-red"
                  : dayIdx === 0
                  ? "text-red-400/80 hover:bg-white/5"
                  : dayIdx === 6
                  ? "text-blue-400/80 hover:bg-white/5"
                  : "text-text-sub hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Week rows (touch-none on day cells for drag selection) */}
      <div className="space-y-1.5 touch-none">
        {monthWeeks.map((row, weekIdx) => {
          const rowDates = row
            .filter((d): d is dayjs.Dayjs => Boolean(d))
            .map((d) => d.format("YYYY-MM-DD"));
          const allRowSelected =
            rowDates.length > 0 && rowDates.every((d) => selectedSet.has(d));

          return (
            <div
              key={weekIdx}
              className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1 items-center"
            >
              <button
                type="button"
                title={`${weekIdx + 1}주차 전체 선택/해제`}
                onClick={() => toggleDateList(rowDates)}
                className={`h-9 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  allRowSelected
                    ? "bg-brand-red/20 text-brand-red border border-brand-red/40"
                    : "bg-surface/60 text-text-muted hover:text-text-main hover:bg-white/5"
                }`}
              >
                {weekIdx + 1}주
              </button>

              {row.map((d, colIdx) => {
                if (!d) {
                  return <div key={`empty-${weekIdx}-${colIdx}`} className="h-9" />;
                }
                const dateStr = d.format("YYYY-MM-DD");
                const isSelected = selectedSet.has(dateStr);
                const isToday = d.isSame(dayjs(), "day");

                return (
                  <button
                    key={dateStr}
                    type="button"
                    data-cal-date={dateStr}
                    onPointerDown={(e) => handleDayPointerDown(e, dateStr)}
                    className={`relative h-9 sm:h-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "bg-brand-red text-white shadow-md shadow-brand-red/30 font-bold"
                        : "text-text-main hover:bg-white/10"
                    }`}
                  >
                    {d.date()}
                    {isToday && (
                      <span
                        className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                          isSelected ? "bg-white" : "bg-brand-red"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-muted pt-1">
        * 날짜를 <span className="text-text-sub">드래그</span>하거나 요일(
        <span className="text-text-sub">일~토</span>)·
        <span className="text-text-sub">주차</span>를 눌러 한 번에 선택할 수 있습니다. (선택됨:{" "}
        <span className="text-brand-red font-semibold">{selectedDates.length}일</span>)
      </p>
    </div>
  );
}
