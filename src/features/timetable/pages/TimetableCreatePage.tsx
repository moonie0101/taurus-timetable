import { useEffect, useMemo, useState } from "react";
import {
  CaretDown,
  CaretUp,
  Clock,
  LockSimple,
  Plus,
  Sparkle,
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
  getLockedSlotsFromReservations,
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showLockEditor, setShowLockEditor] = useState(false);
  const [lockedSlots, setLockedSlots] = useState<string[]>([]);
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
    const autoLocked = autoLockRoomSlots
      ? getLockedSlotsFromReservations(
          allRoomReservations,
          selectedDates,
          effectiveStartHour,
          effectiveEndHour,
          intervalMinutes
        )
      : [];
    setLockedSlots(autoLocked);
    setShowLockEditor(autoLocked.length > 0);
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
        lockedSlots,
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

      {/* Main 3-Step Creation + Live Preview */}
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

            <div className="pt-2 border-t border-border">
              <Checkbox
                checked={autoLockRoomSlots}
                onChange={(e) => setAutoLockRoomSlots(e.target.checked)}
                label={
                  <span className="text-xs text-text-sub">
                    토러스 합주실에 이미 확정/관리자 예약된 시간 자동 잠금
                  </span>
                }
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Live Preview (with Admin & Pre-reservation badges) & Create CTA */}
        <div className="md:col-span-5 md:sticky md:top-20 space-y-4">
          <Card className="p-5 space-y-4 border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkle size={18} weight="fill" className="text-brand-red" />
                <h3 className="text-base font-bold text-white">미리보기</h3>
              </div>
              <Badge variant="outline">
                {intervalMinutes === 60 ? "1시간 간격" : "30분 간격"}
              </Badge>
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
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/40 text-red-300 font-semibold">
                  관리자 지정
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-semibold">
                  확정 예약
                </span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-950/90 border border-yellow-500/50 text-yellow-300 font-semibold">
                  미리 예약 대기
                </span>
              </div>
            </div>

            {selectedDates.length > 0 ? (
              <>
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <TimeGrid
                    dates={selectedDates}
                    startHour={effectiveStartHour}
                    endHour={effectiveEndHour}
                    intervalMinutes={intervalMinutes}
                    mode="preview"
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
                                ? "text-yellow-400"
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
                시간표 및 기존 합주실 예약 현황이 미리보기에 표시됩니다.
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

      {/* Confirmation + Optional Time Lock Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="이대로 만들까요?"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="bg-bg-main/80 border border-border rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-sub">모임 이름</span>
              <span className="font-bold text-white">
                {title.trim() || "합주 시간 조율"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-sub">후보 날짜</span>
              <span className="font-semibold text-white">
                {selectedDates.length}일 (
                {dayjs(selectedDates[0]).format("M/D")} ~{" "}
                {dayjs(selectedDates[selectedDates.length - 1]).format("M/D")})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-sub">시간 범위</span>
              <span className="font-semibold text-white">
                {String(effectiveStartHour).padStart(2, "0")}:00 ~{" "}
                {String(effectiveEndHour).padStart(2, "0")}:00 (
                {intervalMinutes}분)
              </span>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLockEditor((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated/40 hover:bg-surface-elevated/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                <LockSimple size={16} className="text-brand-red" />
                <span>시간 잠금 (선택)</span>
                {lockedSlots.length > 0 && (
                  <Badge variant="brand">{lockedSlots.length}칸 잠김</Badge>
                )}
              </div>
              {showLockEditor ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </button>

            {showLockEditor && (
              <div className="p-3 space-y-2 bg-bg-main/50">
                <p className="text-xs text-text-sub">
                  클릭하거나 드래그해서 참여자들이 선택할 수 없도록 막을 시간대를 지정하세요.
                </p>
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <TimeGrid
                    dates={selectedDates}
                    startHour={effectiveStartHour}
                    endHour={effectiveEndHour}
                    intervalMinutes={intervalMinutes}
                    mode="lock"
                    lockedSlots={lockedSlots}
                    onLockedSlotsChange={setLockedSlots}
                    roomOverlayMap={roomOverlayMap}
                  />
                </div>
              </div>
            )}
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
