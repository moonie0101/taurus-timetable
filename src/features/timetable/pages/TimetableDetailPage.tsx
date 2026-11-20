import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  Check,
  Copy,
  ShareNetwork,
  UserPlus,
  Users,
} from "@phosphor-icons/react";
import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { reservationApi, weekApi } from "../../../api/taurusApi";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { InlineAlert } from "../../../components/ui/InlineAlert";
import { EmptyState, PageContainer } from "../../../components/ui/Typography";
import { ROUTES } from "../../../constants/routes";
import dayjs from "../../../lib/dayjs";
import { Reservation, ReservationStatus, Week } from "../../../types/taurus";
import { timetableApi } from "../api/timetableApi";
import { GoldenTimePanel } from "../components/GoldenTimePanel";
import { ParticipantModal } from "../components/ParticipantModal";
import { SlotDetailModal } from "../components/SlotDetailPopover";
import { TimeGrid } from "../components/TimeGrid";
import { GoldenTimeSlot, Timetable } from "../types";
import {
  buildRoomOverlayMap,
  computeTimetableStats,
  getAdminLockedSlotsFromReservations,
} from "../utils/timeUtils";

export function TimetableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [allWeeks, setAllWeeks] = useState<Week[]>([]);
  const [allRoomReservations, setAllRoomReservations] = useState<Reservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active participant editing session
  const [activeAuth, setActiveAuth] = useState<{
    name: string;
    password: string;
  } | null>(null);
  const [draftSlots, setDraftSlots] = useState<string[]>([]);
  // Unified grid interaction toggle when logged in: drag-paint my schedule vs tap-inspect cell
  const [interactionMode, setInteractionMode] = useState<"edit" | "inspect">(
    "inspect"
  );
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Heatmap inspection & filtering
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(
    null
  );
  const [highlightedSlotKey, setHighlightedSlotKey] = useState<string | null>(
    null
  );
  const [selectedInspectSlot, setSelectedInspectSlot] =
    useState<GoldenTimeSlot | null>(null);
  const [inspectedSlot, setInspectedSlot] = useState<GoldenTimeSlot | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const loadRoomReservations = useCallback(async (): Promise<Reservation[]> => {
    try {
      const weeks = await weekApi.getWeeks();
      setAllWeeks(weeks);
      const activeWeeks = weeks.filter((w) => w.status !== "CLOSED");
      const results = await Promise.all(
        activeWeeks.map((w) => reservationApi.getReservations(String(w.id)))
      );
      const combined = results.flatMap((r) => [...r.confirmed, ...r.pending]);
      setAllRoomReservations(combined);
      return combined;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const loadTable = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const [found, roomReservations] = await Promise.all([
          timetableApi.getById(id),
          loadRoomReservations(),
        ]);
        setTimetable(found);
        if (found) {
          const dynamicAdminLocks = getAdminLockedSlotsFromReservations(
            roomReservations,
            found.dates,
            found.startHour,
            found.endHour,
            found.intervalMinutes
          );
          const lockedNow = new Set([...found.lockedSlots, ...dynamicAdminLocks]);

          if (activeAuth) {
            if (!isRefresh) {
              const existing = found.participants.find(
                (p) => p.name === activeAuth.name
              );
              if (existing) {
                setDraftSlots(
                  existing.availableSlots.filter((k) => !lockedNow.has(k))
                );
              }
            } else {
              setDraftSlots((prev) => prev.filter((k) => !lockedNow.has(k)));
            }
          }

          setSelectedInspectSlot((prev) =>
            prev && lockedNow.has(prev.slotKey) ? null : prev
          );
          setInspectedSlot((prev) =>
            prev && lockedNow.has(prev.slotKey) ? null : prev
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, activeAuth, loadRoomReservations]
  );

  useEffect(() => {
    loadTable(false);
  }, [id]);

  const adminLockedSlots = useMemo(() => {
    if (!timetable) return [];
    return getAdminLockedSlotsFromReservations(
      allRoomReservations,
      timetable.dates,
      timetable.startHour,
      timetable.endHour,
      timetable.intervalMinutes
    );
  }, [allRoomReservations, timetable]);

  const effectiveLockedSet = useMemo(() => {
    if (!timetable) return new Set<string>();
    return new Set([...timetable.lockedSlots, ...adminLockedSlots]);
  }, [timetable, adminLockedSlots]);

  // Keep draftSlots free of any dynamically admin-locked slots
  useEffect(() => {
    if (effectiveLockedSet.size === 0) return;
    setDraftSlots((prev) => {
      const filtered = prev.filter((k) => !effectiveLockedSet.has(k));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [effectiveLockedSet]);

  const { slotMap, maxCount, goldenTimes } = useMemo(() => {
    if (!timetable) {
      return {
        slotMap: new Map<string, GoldenTimeSlot>(),
        maxCount: 0,
        goldenTimes: [],
      };
    }
    return computeTimetableStats(timetable, adminLockedSlots);
  }, [timetable, adminLockedSlots]);

  const roomOverlayMap = useMemo(() => {
    if (!timetable) return new Map();
    return buildRoomOverlayMap(
      allRoomReservations,
      timetable.dates,
      timetable.startHour,
      timetable.endHour,
      timetable.intervalMinutes
    );
  }, [allRoomReservations, timetable]);

  const overlappingRoomEntries = useMemo(() => {
    if (!timetable) return [];
    const dateSet = new Set(timetable.dates);
    return allRoomReservations
      .filter((r) => {
        if (
          r.status === ReservationStatus.CANCELLED ||
          r.status === ReservationStatus.VOID
        ) {
          return false;
        }
        const d = dayjs(r.startTime);
        return (
          dateSet.has(d.format("YYYY-MM-DD")) &&
          d.hour() >= timetable.startHour &&
          d.hour() < timetable.endHour
        );
      })
      .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
  }, [allRoomReservations, timetable]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("아래 링크를 복사해 주세요:", shareUrl);
    }
  };

  const handleShare = async () => {
    if (navigator.share && timetable) {
      try {
        await navigator.share({
          title: `${timetable.title} | Taurus 시간 조율`,
          text: `"${timetable.title}" 합주 시간 조율에 참여해 주세요!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopyLink();
  };

  const handleVerifyOrEnter = async (name: string, password: string) => {
    if (!id) return;
    const { participant } = await timetableApi.verifyParticipant(
      id,
      name,
      password
    );
    setActiveAuth({ name, password });
    setDraftSlots(
      participant
        ? participant.availableSlots.filter((k) => !effectiveLockedSet.has(k))
        : []
    );
    setSaveError(null);
    setInteractionMode("edit");
  };

  const handleDeleteParticipant = async (name: string, password: string) => {
    if (!id) return;
    const updated = await timetableApi.deleteParticipant(id, name, password);
    setTimetable(updated);
    if (activeAuth?.name === name) {
      setActiveAuth(null);
      setDraftSlots([]);
      setInteractionMode("inspect");
    }
    if (focusedParticipant === name) {
      setFocusedParticipant(null);
    }
  };

  const handleSaveMySchedule = async () => {
    if (!id || !activeAuth) {
      setAuthModalOpen(true);
      return;
    }
    try {
      setSaving(true);
      setSaveError(null);
      const sanitizedSlots = draftSlots.filter((k) => !effectiveLockedSet.has(k));
      const updated = await timetableApi.upsertParticipant(id, {
        name: activeAuth.name,
        password: activeAuth.password,
        availableSlots: sanitizedSlots,
      });
      setDraftSlots(sanitizedSlots);
      setTimetable(updated);
      setSaveBanner("일정이 저장되었습니다.");
      setTimeout(() => setSaveBanner(null), 2500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="text-center py-20 text-text-sub animate-pulse">
          시간표를 불러오는 중...
        </div>
      </PageContainer>
    );
  }

  if (!timetable) {
    return (
      <PageContainer>
        <EmptyState
          message="존재하지 않거나 삭제된 시간 조율표입니다."
          action={
            <Button onClick={() => navigate(ROUTES.TIMETABLE)}>
              새 시간표 만들기
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const firstDate = dayjs(timetable.dates[0]).format("M/D");
  const lastDate = dayjs(timetable.dates[timetable.dates.length - 1]).format(
    "M/D"
  );

  return (
    <PageContainer className="pb-16 space-y-6">
      {/* Top Header Bar: Title-first hierarchy matching Taurus PageHeader */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1 min-w-0">
          <h2 className="text-2xl font-bold text-text-main tracking-tight truncate">
            {timetable.title}
          </h2>
          <p className="text-xs text-text-sub tabular-nums">
            {firstDate} ~ {lastDate} ({timetable.dates.length}일) ·{" "}
            {timetable.intervalMinutes === 60 ? "1시간 단위" : "30분 단위"} · 참여자{" "}
            {timetable.participants.length}명
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTable(true)}
            disabled={refreshing}
            className="gap-1.5"
            title="최신 응답 새로고침"
          >
            <ArrowsClockwise
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check size={14} className="text-status-success" />
                복사됨
              </>
            ) : (
              <>
                <Copy size={14} />
                링크 복사
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 sm:hidden"
          >
            <ShareNetwork size={14} />
            공유
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.TIMETABLE)}
            className="gap-1"
          >
            <Plus className="w-3.5 h-3.5" />새 시간표
          </Button>
        </div>
      </div>

      {/* Unified Layout: PC 2-column (Main Unified Grid + Sidebar Insights) / Mobile single flow */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* MAIN COLUMN: Unified Timetable (My Schedule + Group Heatmap in one 7-day grid) */}
        <div className="md:col-span-7 space-y-4">
          <Card className="p-4 sm:p-5 space-y-4">
            {/* Participation & Mode Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">통합 시간표</h3>
                  {activeAuth && <Badge variant="brand">{activeAuth.name}</Badge>}
                </div>
                <p className="text-xs text-text-sub mt-0.5">
                  {activeAuth && interactionMode === "edit"
                    ? "가능한 시간을 드래그로 선택한 뒤 저장하세요."
                    : "칸을 두 번 누르거나 선택 후 상세 명단 버튼을 누르세요."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={activeAuth ? "outline" : "brand"}
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="gap-1.5"
                >
                  <UserPlus size={15} />
                  {activeAuth ? "변경/삭제" : "참여 / 내 일정 입력"}
                </Button>
                {activeAuth && (
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={handleSaveMySchedule}
                    disabled={saving}
                  >
                    {saving ? "저장 중..." : "저장하기"}
                  </Button>
                )}
              </div>
            </div>

            {/* Mode Switcher when logged in (Drag Edit vs Tap Inspect) */}
            {activeAuth && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-bg-main border border-border">
                <button
                  type="button"
                  onClick={() => setInteractionMode("edit")}
                  className={`py-2 px-3 rounded-md text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                    interactionMode === "edit"
                      ? "bg-brand-red text-white"
                      : "text-text-sub hover:text-white"
                  }`}
                >
                  내 일정 선택 ({draftSlots.length}칸)
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionMode("inspect")}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    interactionMode === "inspect"
                      ? "bg-surface-elevated text-white"
                      : "text-text-sub hover:text-white"
                  }`}
                >
                  시간대 명단 보기
                </button>
              </div>
            )}

            {saveBanner && (
              <InlineAlert variant="success" className="my-0! py-2.5!">
                {saveBanner}
              </InlineAlert>
            )}
            {saveError && (
              <InlineAlert variant="error" className="my-0! py-2.5!">
                {saveError}
              </InlineAlert>
            )}

            {/* Participant Filter Pills + Legend */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-sub">
                  <Users size={14} />
                  <span className="tabular-nums">
                    참여자 {timetable.participants.length}명
                  </span>
                  {focusedParticipant && (
                    <span className="text-brand-red">
                      · {focusedParticipant}만 보기
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-sub">
                  {activeAuth && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm border border-emerald-400 bg-emerald-400/30" />
                      내 선택
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm border border-amber-400/80 bg-amber-400/50" />
                    미리예약 대기
                  </span>
                  {maxCount > 0 && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <span>0</span>
                      <span className="flex gap-0.5">
                        {[0.2, 0.5, 0.85].map((a, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: `rgba(211, 44, 43, ${a})` }}
                          />
                        ))}
                      </span>
                      <span>{maxCount}명</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFocusedParticipant(null)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    focusedParticipant === null
                      ? "bg-brand-red text-white border-brand-red"
                      : "bg-bg-main border-border text-text-sub hover:text-white"
                  }`}
                >
                  전체
                </button>
                {timetable.participants.map((p) => {
                  const isFocused = focusedParticipant === p.name;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setFocusedParticipant(isFocused ? null : p.name)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isFocused
                          ? "bg-brand-red text-white border-brand-red"
                          : "bg-bg-main border-border text-text-main hover:border-border-active"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Highlighted Slot Preview Bar (prevents accidental mobile scroll taps from popping up modal) */}
            {!(activeAuth && interactionMode === "edit") && selectedInspectSlot && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg-main border border-border-active text-xs animate-in fade-in">
                <span className="text-text-main truncate min-w-0 flex-1 tabular-nums">
                  <strong className="text-white">
                    {dayjs(selectedInspectSlot.date).format("M/D(ddd)")}{" "}
                    {selectedInspectSlot.time}~{selectedInspectSlot.endTime}
                  </strong>{" "}
                  ({selectedInspectSlot.count}/{selectedInspectSlot.totalParticipants}명)
                </span>
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => setInspectedSlot(selectedInspectSlot)}
                  className="shrink-0 whitespace-nowrap"
                >
                  상세 명단 보기
                </Button>
              </div>
            )}

            {/* Unified 7-Day Grid */}
            <TimeGrid
              dates={timetable.dates}
              startHour={timetable.startHour}
              endHour={timetable.endHour}
              intervalMinutes={timetable.intervalMinutes}
              mode="unified"
              mySelectedSlots={draftSlots}
              onMySelectedSlotsChange={setDraftSlots}
              interactiveEdit={Boolean(activeAuth && interactionMode === "edit")}
              lockedSlots={timetable.lockedSlots}
              adminLockedSlots={adminLockedSlots}
              slotMap={slotMap}
              maxCount={maxCount}
              totalParticipants={timetable.participants.length}
              focusedParticipantName={focusedParticipant}
              highlightedSlotKey={highlightedSlotKey}
              roomOverlayMap={roomOverlayMap}
              onCellSelect={(slot) => {
                setHighlightedSlotKey(slot.slotKey);
                setSelectedInspectSlot(slot);
              }}
              onCellInspect={(slot) => {
                setHighlightedSlotKey(slot.slotKey);
                setSelectedInspectSlot(slot);
                setInspectedSlot(slot);
              }}
            />

            {activeAuth && interactionMode === "edit" && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <span className="text-xs text-text-sub tabular-nums">
                  내 선택{" "}
                  <strong className="text-emerald-400">
                    {draftSlots.length}칸
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  {draftSlots.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftSlots([])}
                    >
                      비우기
                    </Button>
                  )}
                  <Button
                    variant="brand"
                    onClick={handleSaveMySchedule}
                    disabled={saving}
                  >
                    {saving ? "저장 중..." : "저장하기"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* SIDEBAR COLUMN: Golden Time + Room Schedule */}
        <div className="md:col-span-5 space-y-5">
          <GoldenTimePanel
            goldenTimes={goldenTimes}
            maxCount={maxCount}
            highlightedSlotKey={highlightedSlotKey}
            onSelectSlot={setHighlightedSlotKey}
            onInspectSlot={(slot) => {
              setHighlightedSlotKey(slot.slotKey);
              setInspectedSlot(slot);
            }}
          />

          {/* Pre-reserved / Occupied Room Schedule Card for Timetable Dates */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold text-text-main">
                기간 내 합주실 예약 현황
              </h3>
              <span className="text-xs text-text-sub tabular-nums">
                {overlappingRoomEntries.length}건
              </span>
            </div>

            {overlappingRoomEntries.length === 0 ? (
              <p className="text-xs text-text-sub py-6 px-4 text-center">
                이 기간에 등록된 합주실 예약이 없습니다.
              </p>
            ) : (
              <div className="divide-y divide-border max-h-56 overflow-y-auto custom-scrollbar">
                {overlappingRoomEntries.map((r) => {
                  const d = dayjs(r.startTime);
                  const isPending = r.status === ReservationStatus.PENDING;
                  const isAdmin =
                    r.status === ReservationStatus.CONFIRMED_ADMIN;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs"
                    >
                      <span className="font-mono text-text-main tabular-nums shrink-0">
                        {d.format("M/D(ddd) HH:mm")}
                      </span>
                      <Badge
                        variant={
                          isAdmin ? "danger" : isPending ? "warn" : "success"
                        }
                        className="truncate max-w-[170px]"
                      >
                        {isAdmin
                          ? `관리자 · ${r.description || "점유"}`
                          : isPending
                          ? `미리예약 · ${r.teamName || "대기"}`
                          : `확정 · ${r.teamName || "예약됨"}`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ParticipantModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentName={activeAuth?.name}
        onVerifyOrEnter={handleVerifyOrEnter}
        onDelete={handleDeleteParticipant}
      />

      <SlotDetailModal
        slot={inspectedSlot}
        roomOverlay={
          inspectedSlot ? roomOverlayMap.get(inspectedSlot.slotKey) : undefined
        }
        weeks={allWeeks}
        onClose={() => setInspectedSlot(null)}
      />
    </PageContainer>
  );
}
