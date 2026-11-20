import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  CalendarBlank,
  Check,
  Clock,
  Copy,
  LinkSimple,
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
import { EmptyState, PageContainer } from "../../../components/ui/Typography";
import { ROUTES } from "../../../constants/routes";
import dayjs from "../../../lib/dayjs";
import { Reservation, ReservationStatus } from "../../../types/taurus";
import { timetableApi } from "../api/timetableApi";
import { GoldenTimePanel } from "../components/GoldenTimePanel";
import { ParticipantModal } from "../components/ParticipantModal";
import { SlotDetailModal } from "../components/SlotDetailPopover";
import { TimeGrid } from "../components/TimeGrid";
import { GoldenTimeSlot, Timetable } from "../types";
import {
  buildRoomOverlayMap,
  computeTimetableStats,
} from "../utils/timeUtils";

export function TimetableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState<Timetable | null>(null);
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

  const loadRoomReservations = useCallback(async () => {
    try {
      const weeks = await weekApi.getWeeks();
      const activeWeeks = weeks.filter((w) => w.status !== "CLOSED");
      const results = await Promise.all(
        activeWeeks.map((w) => reservationApi.getReservations(String(w.id)))
      );
      setAllRoomReservations(
        results.flatMap((r) => [...r.confirmed, ...r.pending])
      );
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadTable = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const [found] = await Promise.all([
          timetableApi.getById(id),
          loadRoomReservations(),
        ]);
        setTimetable(found);
        if (found && activeAuth) {
          const existing = found.participants.find(
            (p) => p.name === activeAuth.name
          );
          if (existing) setDraftSlots(existing.availableSlots);
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

  const { slotMap, maxCount, goldenTimes } = useMemo(() => {
    if (!timetable) {
      return {
        slotMap: new Map<string, GoldenTimeSlot>(),
        maxCount: 0,
        goldenTimes: [],
      };
    }
    return computeTimetableStats(timetable);
  }, [timetable]);

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
    setDraftSlots(participant ? [...participant.availableSlots] : []);
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
      const updated = await timetableApi.upsertParticipant(id, {
        name: activeAuth.name,
        password: activeAuth.password,
        availableSlots: draftSlots,
      });
      setTimetable(updated);
      setSaveBanner("저장되었습니다!");
      setTimeout(() => setSaveBanner(null), 2500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
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
    <PageContainer className="pb-16 space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand">시간 조율</Badge>
            <Badge variant="outline">
              {timetable.intervalMinutes === 60 ? "1시간 단위" : "30분 단위"}
            </Badge>
            <span className="text-xs text-text-sub flex items-center gap-1">
              <CalendarBlank size={13} />
              {firstDate} ~ {lastDate} ({timetable.dates.length}일)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight truncate">
            {timetable.title}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTable(true)}
            disabled={refreshing}
            className="gap-1.5"
            title="최신 응답 새로고침"
          >
            <ArrowsClockwise
              size={15}
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
                <Check size={15} className="text-status-success" />
                복사됨
              </>
            ) : (
              <>
                <Copy size={15} />
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
            <ShareNetwork size={15} />
            공유
          </Button>
          <Button
            variant="brand"
            size="sm"
            onClick={() => navigate(ROUTES.TIMETABLE)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />새 테이블
          </Button>
        </div>
      </div>

      {/* Unified Layout: PC 2-column (Main Unified Grid + Sidebar Insights) / Mobile single flow */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* MAIN COLUMN: Unified Timetable (My Schedule + Group Heatmap in one 7-day grid) */}
        <div className="md:col-span-7 space-y-4">
          <Card className="p-3.5 sm:p-5 space-y-4">
            {/* Participation & Mode Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">통합 시간표</h3>
                  {activeAuth && <Badge variant="brand">{activeAuth.name}</Badge>}
                </div>
                <p className="text-xs text-text-sub mt-0.5">
                  {activeAuth && interactionMode === "edit"
                    ? "전체 현황을 보면서 내 가능 시간을 드래그로 체크하고 저장하세요."
                    : "칸을 두 번 누르거나(더블탭) 아래 버튼을 누르면 상세 명단이 열립니다."}
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
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-bg-main border border-border">
                <button
                  type="button"
                  onClick={() => setInteractionMode("edit")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    interactionMode === "edit"
                      ? "bg-brand-red text-white shadow"
                      : "text-text-sub hover:text-white"
                  }`}
                >
                  내 일정 선택 (드래그 · {draftSlots.length}칸)
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionMode("inspect")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    interactionMode === "inspect"
                      ? "bg-surface-elevated text-white border border-white/15"
                      : "text-text-sub hover:text-white"
                  }`}
                >
                  시간대 명단 보기 (더블탭)
                </button>
              </div>
            )}

            {saveBanner && (
              <div className="p-2.5 rounded-xl bg-status-success/15 border border-status-success/30 text-status-success text-xs font-bold text-center animate-in fade-in">
                {saveBanner}
              </div>
            )}

            {/* Participant Filter Pills + Legend */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-sub">
                  <Users size={14} />
                  <span>참여자 ({timetable.participants.length})</span>
                  {focusedParticipant && (
                    <span className="text-brand-red">
                      · {focusedParticipant}만 보기
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-text-sub">
                  {activeAuth && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm border border-emerald-400 bg-emerald-400/30" />
                      내 선택
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="px-1 rounded bg-yellow-500 text-black font-bold text-[8px]">
                      대기
                    </span>
                    미리예약
                  </span>
                  {maxCount > 0 && (
                    <span className="inline-flex items-center gap-1">
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
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
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
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
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bg-main/90 border border-white/15 text-xs animate-in fade-in">
                <span className="text-text-main truncate min-w-0 flex-1">
                  선택됨:{" "}
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
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-text-sub">
                  내 선택:{" "}
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

        {/* SIDEBAR COLUMN: Golden Time + Pre-reservations / Room Status + Invite Link */}
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
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-yellow-400" />
                <h3 className="text-sm font-bold text-text-main">
                  기간 내 합주실 예약 · 미리 예약 현황
                </h3>
              </div>
              <Badge variant="outline">{overlappingRoomEntries.length}건</Badge>
            </div>

            {overlappingRoomEntries.length === 0 ? (
              <p className="text-xs text-text-muted py-3 text-center bg-bg-main/40 rounded-xl border border-dashed border-white/5">
                이 기간에는 아직 합주실 예약/미리예약이 없습니다.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {overlappingRoomEntries.map((r) => {
                  const d = dayjs(r.startTime);
                  const isPending = r.status === ReservationStatus.PENDING;
                  const isAdmin =
                    r.status === ReservationStatus.CONFIRMED_ADMIN;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bg-main/60 border border-white/5 text-xs"
                    >
                      <span className="font-mono text-text-main shrink-0">
                        {d.format("M/D(ddd) HH:mm")}
                      </span>
                      <Badge
                        variant={
                          isAdmin ? "danger" : isPending ? "warn" : "success"
                        }
                        className="truncate max-w-[160px]"
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

          <Card className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <LinkSimple size={18} className="text-brand-red shrink-0" />
              <span className="text-xs text-text-sub truncate font-mono">
                {shareUrl}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? "복사됨!" : "복사"}
            </Button>
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
        onClose={() => setInspectedSlot(null)}
      />
    </PageContainer>
  );
}
