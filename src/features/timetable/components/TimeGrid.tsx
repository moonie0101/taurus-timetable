import React, { useEffect, useMemo, useRef, useState } from "react";
import { CaretLeft, CaretRight, Check, LockSimple } from "@phosphor-icons/react";
import dayjs from "../../../lib/dayjs";
import { GoldenTimeSlot, RoomSlotOverlay, TimeGranularity } from "../types";
import {
  generateTimeLabels,
  makeSlotKey,
  paginateDates,
} from "../utils/timeUtils";

export type TimeGridMode = "unified" | "lock" | "preview";

interface TimeGridProps {
  dates: string[];
  startHour: number;
  endHour: number;
  intervalMinutes: TimeGranularity;
  mode: TimeGridMode;
  /** Used in "unified" mode for user's own selected availability */
  mySelectedSlots?: string[];
  onMySelectedSlotsChange?: (slots: string[]) => void;
  /** In "unified" mode: true = drag paints mySelectedSlots; false = click inspects cell */
  interactiveEdit?: boolean;
  /** Creator/manual locked slots across modes */
  lockedSlots?: string[];
  /** Admin-occupied slots dynamically synced from CONFIRMED_ADMIN reservations */
  adminLockedSlots?: string[];
  onLockedSlotsChange?: (slots: string[]) => void;
  /** In "lock" mode: when true, touch gestures drag-paint; when false, tap toggles and vertical swipe scrolls */
  touchDragEnabled?: boolean;
  /** Heatmap data in "unified" mode */
  slotMap?: Map<string, GoldenTimeSlot>;
  maxCount?: number;
  totalParticipants?: number;
  focusedParticipantName?: string | null;
  highlightedSlotKey?: string | null;
  onCellSelect?: (slot: GoldenTimeSlot) => void;
  onCellInspect?: (slot: GoldenTimeSlot) => void;
  /** Existing Taurus reservations & pre-reservations overlay */
  roomOverlayMap?: Map<string, RoomSlotOverlay>;
}

export function TimeGrid({
  dates,
  startHour,
  endHour,
  intervalMinutes,
  mode,
  mySelectedSlots = [],
  onMySelectedSlotsChange,
  interactiveEdit = false,
  lockedSlots = [],
  adminLockedSlots = [],
  onLockedSlotsChange,
  touchDragEnabled = false,
  slotMap,
  maxCount = 0,
  totalParticipants = 0,
  focusedParticipantName = null,
  highlightedSlotKey = null,
  onCellSelect,
  onCellInspect,
  roomOverlayMap,
}: TimeGridProps) {
  const [pageIdx, setPageIdx] = useState(0);
  const lastTapRef = useRef<{ key: string; time: number }>({ key: "", time: 0 });
  const skipNextLockClickRef = useRef(false);

  // Always show up to 7 days per page on both PC & Mobile
  const pages = useMemo(() => paginateDates(dates, 7), [dates]);

  useEffect(() => {
    if (pageIdx >= pages.length) {
      setPageIdx(Math.max(0, pages.length - 1));
    }
  }, [pages.length, pageIdx]);

  const visibleDates = pages[pageIdx] || [];
  const timeLabels = useMemo(
    () => generateTimeLabels(startHour, endHour, intervalMinutes),
    [startHour, endHour, intervalMinutes]
  );

  const mySelectedSet = useMemo(
    () => new Set(mySelectedSlots),
    [mySelectedSlots]
  );
  const lockedSet = useMemo(() => new Set(lockedSlots), [lockedSlots]);
  const adminLockedSet = useMemo(
    () => new Set(adminLockedSlots),
    [adminLockedSlots]
  );

  const dragStateRef = useRef<{
    active: boolean;
    paintAction: "add" | "remove";
    visited: Set<string>;
  }>({
    active: false,
    paintAction: "add",
    visited: new Set(),
  });

  const latestMySelectedRef = useRef(mySelectedSet);
  latestMySelectedRef.current = mySelectedSet;
  const latestLockedRef = useRef(lockedSet);
  latestLockedRef.current = lockedSet;

  const isDragMode =
    mode === "lock" || (mode === "unified" && interactiveEdit);
  const useTouchNone =
    (mode === "unified" && interactiveEdit) ||
    (mode === "lock" && touchDragEnabled);

  const applySlotPaint = (slotKey: string, paintAction: "add" | "remove") => {
    if (adminLockedSet.has(slotKey)) return;

    if (mode === "unified" && interactiveEdit) {
      if (lockedSet.has(slotKey)) return;
      const next = new Set(latestMySelectedRef.current);
      if (paintAction === "add") next.add(slotKey);
      else next.delete(slotKey);
      latestMySelectedRef.current = next;
      onMySelectedSlotsChange?.(Array.from(next).sort());
    } else if (mode === "lock") {
      const next = new Set(latestLockedRef.current);
      if (paintAction === "add") next.add(slotKey);
      else next.delete(slotKey);
      latestLockedRef.current = next;
      onLockedSlotsChange?.(Array.from(next).sort());
    }
  };

  useEffect(() => {
    if (!isDragMode) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.active) return;
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = targetEl?.closest<HTMLElement>("[data-slot-key]");
      if (!cellEl) return;
      const key = cellEl.dataset.slotKey;
      if (!key || dragStateRef.current.visited.has(key)) return;
      dragStateRef.current.visited.add(key);
      applySlotPaint(key, dragStateRef.current.paintAction);
    };

    const handlePointerUp = () => {
      dragStateRef.current.active = false;
      dragStateRef.current.visited.clear();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    isDragMode,
    lockedSet,
    adminLockedSet,
    onMySelectedSlotsChange,
    onLockedSlotsChange,
  ]);

  const handleCellPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    slotKey: string
  ) => {
    // In inspect mode or preview mode, NEVER handle on pointerdown so mobile scrolling never accidentally opens modals!
    if (mode === "preview" || (mode === "unified" && !interactiveEdit)) return;
    if (adminLockedSet.has(slotKey)) return;
    if (mode === "unified" && lockedSet.has(slotKey)) return;

    // In lock mode on touch screens without drag lock enabled, let tap fire onClick so vertical scrolling stays smooth
    if (mode === "lock" && e.pointerType === "touch" && !touchDragEnabled) {
      skipNextLockClickRef.current = false;
      return;
    }

    e.preventDefault();
    if (mode === "lock") {
      skipNextLockClickRef.current = true;
    }

    const currentlyActive =
      mode === "unified" ? mySelectedSet.has(slotKey) : lockedSet.has(slotKey);
    const paintAction: "add" | "remove" = currentlyActive ? "remove" : "add";

    dragStateRef.current = {
      active: true,
      paintAction,
      visited: new Set([slotKey]),
    };
    applySlotPaint(slotKey, paintAction);
  };

  const handleLockCellClick = (slotKey: string) => {
    if (mode !== "lock" || adminLockedSet.has(slotKey)) return;
    if (skipNextLockClickRef.current) {
      skipNextLockClickRef.current = false;
      return;
    }
    const paintAction: "add" | "remove" = latestLockedRef.current.has(slotKey)
      ? "remove"
      : "add";
    applySlotPaint(slotKey, paintAction);
  };

  const handleCellClick = (slotKey: string) => {
    if (
      mode !== "unified" ||
      interactiveEdit ||
      lockedSet.has(slotKey) ||
      adminLockedSet.has(slotKey)
    ) {
      return;
    }
    const slot = slotMap?.get(slotKey);
    if (!slot) return;

    const now = Date.now();
    const isDoubleTap =
      lastTapRef.current.key === slotKey &&
      now - lastTapRef.current.time < 600;

    if (isDoubleTap) {
      lastTapRef.current = { key: "", time: 0 };
      onCellInspect?.(slot);
    } else {
      lastTapRef.current = { key: slotKey, time: now };
      onCellSelect?.(slot);
    }
  };

  const renderOverlayLabel = (overlay?: RoomSlotOverlay) => {
    if (!overlay) return null;
    if (overlay.confirmedAdmin) {
      return (
        <span
          title={`관리자: ${overlay.confirmedAdmin.description || "점유"}`}
          className="px-1 py-0.2 rounded bg-red-950/90 border border-red-500/40 text-[8px] sm:text-[9px] font-bold text-red-300 leading-tight truncate max-w-full"
        >
          {overlay.confirmedAdmin.description || "관리"}
        </span>
      );
    }
    if (overlay.confirmedTeam) {
      return (
        <span
          title={`확정: ${overlay.confirmedTeam.teamName || "예약됨"}`}
          className="px-1 py-0.2 rounded bg-emerald-950/90 border border-emerald-500/40 text-[8px] sm:text-[9px] font-bold text-emerald-300 leading-tight truncate max-w-full"
        >
          {overlay.confirmedTeam.teamName || "확정"}
        </span>
      );
    }
    if (overlay.pendingTeams.length > 0) {
      return (
        <span
          title={`미리 예약 대기: ${overlay.pendingTeams.join(", ")}`}
          className="text-[8px] sm:text-[9px] font-bold text-amber-200 leading-tight truncate max-w-full"
        >
          대기{overlay.pendingTeams.length > 1 ? `(${overlay.pendingTeams.length})` : `·${overlay.pendingTeams[0]}`}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 select-none">
      {/* Pagination bar when dates span >7 days */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between bg-surface-elevated/60 border border-border rounded-xl px-3 py-1.5">
          <button
            type="button"
            disabled={pageIdx === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded-lg text-text-sub hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="text-xs font-semibold text-text-sub">
            {pageIdx + 1} / {pages.length} 페이지 ({visibleDates.length}일 표시)
          </span>
          <button
            type="button"
            disabled={pageIdx >= pages.length - 1}
            onClick={() => setPageIdx((p) => Math.min(pages.length - 1, p + 1))}
            className="p-1.5 rounded-lg text-text-sub hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* Grid container */}
      <div className="relative rounded-xl border border-border bg-bg-main/80 overflow-hidden">
        {/* Sticky Day Headers */}
        <div
          className="grid border-b border-border bg-surface/90"
          style={{
            gridTemplateColumns: `28px repeat(${Math.max(
              1,
              visibleDates.length
            )}, minmax(0, 1fr))`,
          }}
        >
          <div className="py-2 text-[9px] font-medium text-text-muted flex items-center justify-center border-r border-border">
            시
          </div>
          {visibleDates.map((dateStr) => {
            const d = dayjs(dateStr);
            const dow = d.day();
            return (
              <div
                key={dateStr}
                className="py-1.5 px-0.5 text-center border-r border-border last:border-r-0 tabular-nums"
              >
                <div className="text-[10px] sm:text-xs font-bold text-text-main leading-tight">
                  {d.format("M/D")}
                </div>
                <div
                  className={`text-[9px] sm:text-[10px] font-medium ${
                    dow === 0
                      ? "text-red-400"
                      : dow === 6
                      ? "text-blue-400"
                      : "text-text-sub"
                  }`}
                >
                  ({d.format("ddd")})
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Rows with top/bottom breathing room so line-aligned labels (9 .. 23) never clip */}
        <div
          className={`pt-2.5 pb-2.5 ${
            useTouchNone ? "touch-none" : "touch-auto"
          }`}
        >
          {timeLabels.map((timeStr, rowIdx) => {
            const isHalfHour = timeStr.endsWith(":30");
            const isFirstRow = rowIdx === 0;
            const isLastRow = rowIdx === timeLabels.length - 1;
            const hourNumber = Number(timeStr.split(":")[0]);
            const showHourLabel = !isHalfHour || intervalMinutes === 60;

            return (
              <div
                key={timeStr}
                className={`grid ${
                  isFirstRow ? "border-t border-white/15" : ""
                } ${
                  isHalfHour || intervalMinutes === 60
                    ? "border-b border-white/12"
                    : "border-b border-white/5"
                }`}
                style={{
                  gridTemplateColumns: `28px repeat(${Math.max(
                    1,
                    visibleDates.length
                  )}, minmax(0, 1fr))`,
                }}
              >
                {/* Left Time Axis: hour label positioned directly on the TOP line of each hour row */}
                <div className="relative border-r border-border bg-surface/30">
                  {showHourLabel && (
                    <span className="absolute right-1 top-0 -translate-y-1/2 text-[10px] font-mono tabular-nums font-semibold text-text-sub leading-none bg-bg-main/90 px-0.5 z-10">
                      {hourNumber}
                    </span>
                  )}
                  {isLastRow && (
                    <span className="absolute right-1 bottom-0 translate-y-1/2 text-[10px] font-mono tabular-nums font-semibold text-text-sub leading-none bg-bg-main/90 px-0.5 z-10">
                      {endHour}
                    </span>
                  )}
                </div>

                {/* Day Cells */}
                {visibleDates.map((dateStr) => {
                  const key = makeSlotKey(dateStr, timeStr);
                  const isAdminLocked = adminLockedSet.has(key);
                  const isLocked = lockedSet.has(key) || isAdminLocked;
                  const overlay = roomOverlayMap?.get(key);
                  const hasPending = Boolean(overlay?.pendingTeams.length);
                  const isHighlighted = highlightedSlotKey === key;
                  const cellHeight =
                    intervalMinutes === 30 ? "h-6 sm:h-6" : "h-8 sm:h-8";

                  if (isLocked && mode !== "lock") {
                    return (
                      <div
                        key={key}
                        title={
                          isAdminLocked || overlay?.confirmedAdmin
                            ? `잠김 · 관리자 지정 (${overlay?.confirmedAdmin?.description || "점유"})`
                            : overlay?.confirmedTeam
                            ? `잠김 · 확정 (${overlay.confirmedTeam.teamName || "예약됨"})`
                            : "선택 불가 (잠긴 시간)"
                        }
                        className={`${cellHeight} border-r border-white/5 last:border-r-0 flex items-center justify-center gap-0.5 px-0.5 overflow-hidden ${
                          isAdminLocked || overlay?.confirmedAdmin
                            ? "bg-red-950/35 text-red-300/85 ring-1 ring-inset ring-red-500/20"
                            : "bg-neutral-900/95 text-neutral-500"
                        }`}
                      >
                        <LockSimple size={10} weight="bold" className="shrink-0" />
                        {(isAdminLocked || overlay) && (
                          <span className="text-[8px] font-semibold truncate hidden sm:inline">
                            {overlay?.confirmedAdmin?.description ||
                              (isAdminLocked ? "관리자" : "") ||
                              overlay?.confirmedTeam?.teamName ||
                              ""}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (mode === "lock") {
                    if (isAdminLocked) {
                      return (
                        <div
                          key={key}
                          title={`관리자 지정 예약으로 자동 잠금됨 (${overlay?.confirmedAdmin?.description || "점유"}) · 관리자 취소 시 자동 해제`}
                          className={`${cellHeight} border-r border-white/5 last:border-r-0 bg-red-950/40 text-red-300/90 ring-1 ring-inset ring-red-500/25 flex items-center justify-center gap-0.5 px-0.5 cursor-not-allowed overflow-hidden`}
                        >
                          <LockSimple size={10} weight="bold" className="shrink-0" />
                          <span className="text-[8px] font-semibold truncate hidden sm:inline">
                            {overlay?.confirmedAdmin?.description || "관리자"}
                          </span>
                        </div>
                      );
                    }

                    const isManualOrTeamLocked = lockedSet.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        data-slot-key={key}
                        onPointerDown={(e) => handleCellPointerDown(e, key)}
                        onClick={() => handleLockCellClick(key)}
                        title={
                          isManualOrTeamLocked
                            ? `${dateStr} ${timeStr} 잠김 (클릭해 해제)`
                            : hasPending
                            ? `${dateStr} ${timeStr} 미리예약 대기 (${overlay!.pendingTeams.join(", ")}) · 클릭해 잠금`
                            : overlay?.confirmedTeam
                            ? `${dateStr} ${timeStr} 확정 예약 (${overlay.confirmedTeam.teamName || "예약됨"}) · 클릭해 잠금`
                            : `${dateStr} ${timeStr} 클릭 또는 드래그해 잠금`
                        }
                        className={`${cellHeight} border-r border-white/5 last:border-r-0 transition-colors cursor-pointer touch-manipulation flex items-center justify-center gap-0.5 px-0.5 overflow-hidden ${
                          isManualOrTeamLocked
                            ? "bg-neutral-800/95 text-neutral-100 ring-1 ring-inset ring-white/15"
                            : hasPending
                            ? "bg-amber-500/30 ring-1 ring-inset ring-amber-400/50 hover:bg-amber-500/40"
                            : overlay?.confirmedTeam
                            ? "bg-emerald-950/35 hover:bg-emerald-950/55"
                            : "bg-transparent hover:bg-white/10"
                        }`}
                        aria-label={`${dateStr} ${timeStr} 잠금 토글`}
                      >
                        {isManualOrTeamLocked ? (
                          <>
                            <LockSimple size={10} weight="bold" className="shrink-0" />
                            {overlay?.confirmedTeam && (
                              <span className="text-[8px] text-neutral-300 truncate hidden sm:inline">
                                {overlay.confirmedTeam.teamName}
                              </span>
                            )}
                          </>
                        ) : (
                          renderOverlayLabel(overlay)
                        )}
                      </button>
                    );
                  }

                  if (mode === "preview") {
                    return (
                      <div
                        key={key}
                        className={`${cellHeight} border-r border-white/5 last:border-r-0 flex items-center justify-center px-0.5 overflow-hidden ${
                          overlay?.confirmedAdmin
                            ? "bg-red-950/35"
                            : overlay?.confirmedTeam
                            ? "bg-emerald-950/30"
                            : hasPending
                            ? "bg-amber-500/30 ring-1 ring-inset ring-amber-400/45"
                            : ""
                        }`}
                      >
                        {renderOverlayLabel(overlay)}
                      </div>
                    );
                  }

                  // UNIFIED mode: Heatmap + Full-yellow Waitlist + My Selected Checkmarks
                  const slot = slotMap?.get(key);
                  const count = slot?.count || 0;
                  const isMine = mySelectedSet.has(key);
                  const isFocusedAvailable = focusedParticipantName
                    ? slot?.availableNames.includes(focusedParticipantName)
                    : false;

                  let bgStyle: React.CSSProperties = {};
                  let countTextClass = "text-white/95 drop-shadow";

                  if (hasPending) {
                    if (focusedParticipantName) {
                      if (isFocusedAvailable) {
                        bgStyle = { backgroundColor: "rgba(234, 179, 8, 0.84)" };
                        countTextClass = "text-neutral-950";
                      } else {
                        bgStyle = { backgroundColor: "rgba(234, 179, 8, 0.22)" };
                        countTextClass = "text-amber-100";
                      }
                    } else if (count > 0 && maxCount > 0) {
                      const ratio = count / maxCount;
                      const alpha = 0.42 + ratio * 0.44;
                      bgStyle = {
                        backgroundColor: `rgba(234, 179, 8, ${alpha.toFixed(2)})`,
                      };
                      countTextClass =
                        alpha >= 0.58
                          ? "text-neutral-950"
                          : "text-amber-50 drop-shadow";
                    } else {
                      bgStyle = { backgroundColor: "rgba(234, 179, 8, 0.34)" };
                      countTextClass = "text-amber-100";
                    }
                  } else if (focusedParticipantName) {
                    bgStyle = isFocusedAvailable
                      ? { backgroundColor: "rgba(211, 44, 43, 0.85)" }
                      : { backgroundColor: "rgba(255, 255, 255, 0.02)" };
                  } else if (count > 0 && maxCount > 0) {
                    const ratio = count / maxCount;
                    const alpha = 0.16 + ratio * 0.7;
                    bgStyle = {
                      backgroundColor: `rgba(211, 44, 43, ${alpha.toFixed(2)})`,
                    };
                  } else if (isMine) {
                    bgStyle = {
                      backgroundColor: "rgba(16, 185, 129, 0.22)",
                    };
                  }

                  const showStripe =
                    !focusedParticipantName && Boolean(slot?.isMax);

                  const pendingTitle = hasPending
                    ? ` · 미리예약 대기: ${overlay!.pendingTeams.join(", ")} (선택 가능)`
                    : overlay?.confirmedAdmin
                    ? ` · 관리자: ${overlay.confirmedAdmin.description || "점유"}`
                    : overlay?.confirmedTeam
                    ? ` · 확정: ${overlay.confirmedTeam.teamName || ""}`
                    : "";

                  return (
                    <button
                      key={key}
                      type="button"
                      data-slot-key={key}
                      onPointerDown={(e) => handleCellPointerDown(e, key)}
                      onClick={() => handleCellClick(key)}
                      style={bgStyle}
                      title={`${dateStr} ${timeStr} (${count}/${totalParticipants}명)${pendingTitle}`}
                      className={`relative ${cellHeight} border-r border-white/5 last:border-r-0 transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-0.5 px-0.5 overflow-hidden ${
                        showStripe ? "timetable-golden-stripe" : ""
                      } ${
                        isMine
                          ? "ring-2 ring-inset ring-emerald-400 z-[5]"
                          : isHighlighted
                          ? "ring-2 ring-inset ring-white z-10"
                          : hasPending
                          ? "ring-1 ring-inset ring-amber-400/65 hover:ring-amber-300"
                          : "hover:ring-1 hover:ring-inset hover:ring-white/50"
                      }`}
                    >
                      {/* Top-right emerald check indicator if selected by current user */}
                      {isMine && (
                        <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow z-[6]">
                          <Check size={8} weight="bold" />
                        </span>
                      )}

                      {/* Subtle room status tag when confirmed team is unlocked */}
                      {!hasPending && overlay?.confirmedTeam && (
                        <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-emerald-500/80 text-black text-[7px] sm:text-[8px] font-bold leading-tight">
                          확
                        </span>
                      )}

                      {count > 0 && !focusedParticipantName ? (
                        <span className={`text-[10px] font-bold z-[2] ${countTextClass}`}>
                          {count}
                        </span>
                      ) : hasPending && !focusedParticipantName ? (
                        <span className="text-[8px] sm:text-[9px] font-bold text-amber-200/95 truncate z-[2]">
                          대기{overlay!.pendingTeams.length}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
