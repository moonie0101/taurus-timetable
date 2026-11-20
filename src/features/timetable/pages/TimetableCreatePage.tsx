import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  LockSimple,
  Plus,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { reservationApi, weekApi } from "../../../api/taurusApi";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { Select } from "../../../components/ui/Select";
import { PageContainer, PageHeader } from "../../../components/ui/Typography";
import dayjs from "../../../lib/dayjs";
import { Reservation, ReservationStatus } from "../../../types/taurus";
import { timetableApi } from "../api/timetableApi";
import { MultiDateCalendar } from "../components/MultiDateCalendar";
import { TimeGrid } from "../components/TimeGrid";
import { TimeGranularity } from "../types";
import {
  buildRoomOverlayMap,
  generateTimeLabels,
  getAdminLockedSlotsFromReservations,
  getConfirmedTeamSlotsFromReservations,
  makeSlotKey,
} from "../utils/timeUtils";

const TITLE_PRESETS = [
  "정기 합주 시간 조율",
  "공연 세트리스트 합주",
  "신입 기수 합주 조율",
  "이번 달 회식 / 뒤풀이",
  "팀 프로젝트 회의",
];

export function TimetableCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  // Default: NO dates pre-selected (user selects/drags candidate dates freely)
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const [useTimeRange, setUseTimeRange] = useState(true);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);
  const [intervalMinutes, setIntervalMinutes] = useState<TimeGranularity>(60);
  const [autoLockRoomSlots, setAutoLockRoomSlots] = useState(true);
  const [allRoomReservations, setAllRoomReservations] = useState<Reservation[]>(
    []
  );

  // Pre-creation manual lock overrides (persisted across date/range changes)
  const [manualLockedSlots, setManualLockedSlots] = useState<string[]>([]);
  const [manualUnlockedSlots, setManualUnlockedSlots] = useState<string[]>([]);
  const [touchDragLock, setTouchDragLock] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    weekApi
      .getWeeks()
      .then(async (weeks) => {
        const activeWeeks = weeks.filter((w) => w.status !== "CLOSED");
        const allRes = await Promise.all(
          activeWeeks.map((w) => reservationApi.getReservations(String(w.id)))
        );
        setAllRoomReservations(
          allRes.flatMap((r) => [...r.confirmed, ...r.pending])
        );
      })
      .catch(console.error);
  }, []);

  const effectiveStartHour = useTimeRange ? startHour : 0;
  const effectiveEndHour = useTimeRange ? endHour : 24;

  const validSlotKeySet = useMemo(() => {
    const labels = generateTimeLabels(
      effectiveStartHour,
      effectiveEndHour,
      intervalMinutes
    );
    const set = new Set<string>();
    for (const date of selectedDates) {
      for (const time of labels) {
        set.add(makeSlotKey(date, time));
      }
    }
    return set;
  }, [selectedDates, effectiveStartHour, effectiveEndHour, intervalMinutes]);

  const roomOverlayMap = useMemo(
    () =>
      buildRoomOverlayMap(
        allRoomReservations,
        selectedDates,
        effectiveStartHour,
        effectiveEndHour,
        intervalMinutes
      ),
    [
      allRoomReservations,
      selectedDates,
      effectiveStartHour,
      effectiveEndHour,
      intervalMinutes,
    ]
  );

  const adminLockedSlots = useMemo(
    () =>
      getAdminLockedSlotsFromReservations(
        allRoomReservations,
        selectedDates,
        effectiveStartHour,
        effectiveEndHour,
        intervalMinutes
      ),
    [
      allRoomReservations,
      selectedDates,
      effectiveStartHour,
      effectiveEndHour,
      intervalMinutes,
    ]
  );

  const confirmedTeamSlots = useMemo(
    () =>
      getConfirmedTeamSlotsFromReservations(
        allRoomReservations,
        selectedDates,
        effectiveStartHour,
        effectiveEndHour,
        intervalMinutes
      ),
    [
      allRoomReservations,
      selectedDates,
      effectiveStartHour,
      effectiveEndHour,
      intervalMinutes,
    ]
  );

  const adminLockedSet = useMemo(
    () => new Set(adminLockedSlots),
    [adminLockedSlots]
  );
  const confirmedTeamSet = useMemo(
    () => new Set(confirmedTeamSlots),
    [confirmedTeamSlots]
  );

  /** Static locks saved to timetable.lockedSlots (excludes dynamic CONFIRMED_ADMIN slots so admin cancellation unlocks them) */
  const staticLockedSlots = useMemo(() => {
    const manualUnlockedSet = new Set(manualUnlockedSlots);
    const set = new Set<string>();
    if (autoLockRoomSlots) {
      for (const k of confirmedTeamSlots) {
        if (!manualUnlockedSet.has(k) && !adminLockedSet.has(k)) {
          set.add(k);
        }
      }
    }
    for (const k of manualLockedSlots) {
      if (validSlotKeySet.has(k) && !adminLockedSet.has(k)) {
        set.add(k);
      }
    }
    return Array.from(set).sort();
  }, [
    autoLockRoomSlots,
    confirmedTeamSlots,
    manualLockedSlots,
    manualUnlockedSlots,
    validSlotKeySet,
    adminLockedSet,
  ]);

  const handleLockedSlotsChange = (nextSlots: string[]) => {
    const nextSet = new Set(nextSlots);
    const nextManualLocked = nextSlots.filter(
      (k) =>
        !adminLockedSet.has(k) && !(autoLockRoomSlots && confirmedTeamSet.has(k))
    );
    const nextManualUnlocked = autoLockRoomSlots
      ? confirmedTeamSlots.filter((k) => !adminLockedSet.has(k) && !nextSet.has(k))
      : [];
    setManualLockedSlots(nextManualLocked);
    setManualUnlockedSlots(nextManualUnlocked);
  };

  const totalLockedCount = staticLockedSlots.length + adminLockedSlots.length;
  const hasManualOverride =
    manualLockedSlots.some((k) => validSlotKeySet.has(k)) ||
    manualUnlockedSlots.some((k) => validSlotKeySet.has(k));

  const overlappingRoomEntries = useMemo(() => {
    const dateSet = new Set(selectedDates);
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
          d.hour() >= effectiveStartHour &&
          d.hour() < effectiveEndHour
        );
      })
      .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
  }, [allRoomReservations, selectedDates, effectiveStartHour, effectiveEndHour]);

  const startHourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => ({
        value: h,
        label: `${String(h).padStart(2, "0")}:00`,
      })),
    []
  );

  const endHourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, idx) => idx + 1)
        .filter((h) => h > startHour)
        .map((h) => ({
          value: h,
          label: `${String(h).padStart(2, "0")}:00`,
        })),
    [startHour]
  );

  const handleOpenConfirm = () => {
    if (selectedDates.length === 0) return;
    setConfirmOpen(true);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const created = await timetableApi.create({
        title: title.trim() || "합주 시간 조율",
        dates: selectedDates,
        startHour: effectiveStartHour,
        endHour: effectiveEndHour,
        intervalMinutes,
        lockedSlots: staticLockedSlots,
      });
      setConfirmOpen(false);
      navigate(`/timetable/${created.id}`);
    } catch (err) {
      console.error(err);
      alert("시간표 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageContainer className="pb-16 space-y-8">
      <PageHeader
        title="시간 조율 (타임테이블)"
        description="시간 조율 링크를 만들어 팀원들에게 공유하고, 합주 골든타임을 찾아 바로 예약하세요."
      />

      {/* Main 3-Step Creation + Live Lockable Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-7 space-y-5">
          {/* Step 1: Meeting Title */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-base font-bold text-text-main">모임 이름</h3>
              </div>
              <span className="text-xs text-text-muted">{title.length}/30</span>
            </div>

            <Input
              placeholder="예: 가을 정기공연 합주 시간 조율"
              value={title}
              maxLength={30}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {TITLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    title === preset
                      ? "bg-brand-red/20 border-brand-red text-brand-red"
                      : "bg-bg-main border-border text-text-sub hover:text-white hover:border-border-active"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </Card>

          {/* Step 2: Candidate Dates */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-base font-bold text-text-main">후보 날짜</h3>
            </div>
            <MultiDateCalendar
              selectedDates={selectedDates}
              onChange={setSelectedDates}
            />
          </Card>

          {/* Step 3: Time Range & Granularity */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-base font-bold text-text-main">
                  시간 범위 및 단위
                </h3>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-text-sub">
                <span>시간 범위 지정</span>
                <input
                  type="checkbox"
                  checked={useTimeRange}
                  onChange={(e) => setUseTimeRange(e.target.checked)}
                  className="accent-brand-red w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {useTimeRange && (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="시작 시간"
                  options={startHourOptions}
                  value={startHour}
                  onChange={(v) => {
                    const nextStart = Number(v);
                    setStartHour(nextStart);
                    if (endHour <= nextStart) setEndHour(Math.min(24, nextStart + 1));
                  }}
                />
                <Select
                  label="종료 시간"
                  options={endHourOptions}
                  value={endHour}
                  onChange={(v) => setEndHour(Number(v))}
                />
              </div>
            )}

            <div className="space-y-2 pt-1">
              <span className="block text-xs font-medium text-text-sub ml-1">
                시간 간격
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIntervalMinutes(60)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    intervalMinutes === 60
                      ? "bg-brand-red/15 border-brand-red text-white"
                      : "bg-bg-main border-border text-text-sub hover:text-white"
                  }`}
                >
                  1시간 단위 (합주실 규격)
                </button>
                <button
                  type="button"
                  onClick={() => setIntervalMinutes(30)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    intervalMinutes === 30
                      ? "bg-brand-red/15 border-brand-red text-white"
                      : "bg-bg-main border-border text-text-sub hover:text-white"
                  }`}
                >
                  30분 단위 (세밀한 조율)
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-1.5">
              <Checkbox
                checked={autoLockRoomSlots}
                onChange={(e) => {
                  setAutoLockRoomSlots(e.target.checked);
                  setManualUnlockedSlots([]);
                }}
                label={
                  <span className="text-xs text-text-sub">
                    토러스 합주실에 이미 확정 예약된 시간 자동 잠금
                  </span>
                }
              />
              <p className="text-[11px] text-text-muted pl-6">
                관리자 지정 예약은 항상 자동 잠금되며, 관리자가 취소하면 잠금도 함께 해제됩니다.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Interactive Time Lock + Preview & Create CTA */}
        <div className="md:col-span-5 md:sticky md:top-20 space-y-4">
          <Card className="p-5 space-y-4 border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LockSimple size={17} weight="bold" className="text-brand-red" />
                <h3 className="text-base font-bold text-white">
                  미리보기 · 시간 잠금
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {totalLockedCount > 0 && (
                  <Badge variant="brand">{totalLockedCount}칸 잠김</Badge>
                )}
                <Badge variant="outline">
                  {intervalMinutes === 60 ? "1시간" : "30분"}
                </Badge>
              </div>
            </div>

            <div className="bg-bg-main rounded-xl p-3.5 border border-white/5 space-y-2 text-xs">
              <p className="font-bold text-sm text-white truncate">
                {title.trim() || "합주 시간 조율"}
              </p>
              <div className="flex items-center gap-3 text-text-sub">
                <span>후보 날짜 {selectedDates.length}일</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {String(effectiveStartHour).padStart(2, "0")}:00 ~{" "}
                  {String(effectiveEndHour).padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-white/5 text-[10px] text-text-sub">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-950 border border-red-500/45" />
                  관리자 잠금
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-neutral-800 border border-white/20" />
                  직접/확정 잠금
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 border border-amber-400/70" />
                  미리예약 대기
                </span>
              </div>
            </div>

            {selectedDates.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 text-[11px] text-text-sub">
                  <span>칸을 클릭·드래그해 선택 불가 시간을 미리 잠그세요.</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTouchDragLock((v) => !v)}
                      className={`sm:hidden px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        touchDragLock
                          ? "bg-brand-red/20 border-brand-red text-brand-red"
                          : "bg-bg-main border-border text-text-sub"
                      }`}
                    >
                      {touchDragLock ? "드래그 잠금 ON" : "드래그 잠금"}
                    </button>
                    {hasManualOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualLockedSlots([]);
                          setManualUnlockedSlots([]);
                        }}
                        className="text-[11px] text-text-muted hover:text-white underline cursor-pointer"
                      >
                        잠금 초기화
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:max-h-[380px] md:overflow-y-auto custom-scrollbar">
                  <TimeGrid
                    dates={selectedDates}
                    startHour={effectiveStartHour}
                    endHour={effectiveEndHour}
                    intervalMinutes={intervalMinutes}
                    mode="lock"
                    lockedSlots={staticLockedSlots}
                    adminLockedSlots={adminLockedSlots}
                    onLockedSlotsChange={handleLockedSlotsChange}
                    touchDragEnabled={touchDragLock}
                    roomOverlayMap={roomOverlayMap}
                  />
                </div>

                {overlappingRoomEntries.length > 0 && (
                  <div className="bg-bg-main/80 border border-white/10 rounded-xl p-3 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                    <p className="text-[11px] font-bold text-text-sub">
                      선택한 날짜의 기존 예약 · 미리예약 ({overlappingRoomEntries.length}건)
                    </p>
                    {overlappingRoomEntries.map((r) => {
                      const d = dayjs(r.startTime);
                      const isPending = r.status === ReservationStatus.PENDING;
                      const isAdmin =
                        r.status === ReservationStatus.CONFIRMED_ADMIN;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-text-main font-mono">
                            {d.format("M/D(ddd) HH:mm")}
                          </span>
                          <span
                            className={`truncate font-semibold ${
                              isAdmin
                                ? "text-red-400"
                                : isPending
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {isAdmin
                              ? `관리자 (${r.description || "점유"})`
                              : isPending
                              ? `미리예약: ${r.teamName || "대기"}`
                              : `확정: ${r.teamName || "예약됨"}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-white/10 rounded-xl">
                후보 날짜를 선택하거나 드래그하면
                <br />
                시간표 잠금 설정과 기존 합주실 예약 현황이 표시됩니다.
              </div>
            )}

            <Button
              size="lg"
              fullWidth
              onClick={handleOpenConfirm}
              disabled={selectedDates.length === 0}
              className="gap-2 shadow-lg shadow-brand-red/25"
            >
              <Plus size={18} weight="bold" />
              {selectedDates.length > 0
                ? "이대로 만들기"
                : "후보 날짜를 선택해주세요"}
            </Button>
          </Card>

          <p className="text-[11px] text-text-muted text-center">
            링크를 만든 뒤 바로 팀원들에게 카카오톡으로 공유할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Streamlined Creation Confirmation Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="이대로 만들까요?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="bg-bg-main/80 border border-border rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-text-sub shrink-0">모임 이름</span>
              <span className="font-bold text-white truncate">
                {title.trim() || "합주 시간 조율"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-sub shrink-0">후보 날짜</span>
              <span className="font-semibold text-white">
                {selectedDates.length}일 (
                {dayjs(selectedDates[0]).format("M/D")} ~{" "}
                {dayjs(selectedDates[selectedDates.length - 1]).format("M/D")})
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-sub shrink-0">시간 범위</span>
              <span className="font-semibold text-white">
                {String(effectiveStartHour).padStart(2, "0")}:00 ~{" "}
                {String(effectiveEndHour).padStart(2, "0")}:00 (
                {intervalMinutes}분)
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-sub shrink-0">잠긴 시간</span>
              <span className="font-semibold text-white">
                {totalLockedCount > 0
                  ? `${totalLockedCount}칸${
                      adminLockedSlots.length > 0
                        ? ` (관리자 ${adminLockedSlots.length}칸 포함)`
                        : ""
                    }`
                  : "없음"}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setConfirmOpen(false)}
            >
              수정하기
            </Button>
            <Button
              variant="brand"
              fullWidth
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "생성 중..." : "링크 만들기"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
