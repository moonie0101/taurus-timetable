import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminApi, teamApi } from "../api/taurusApi";
import {
  ReservationHistoryList,
  TeamAuthForm,
} from "../components/reservation/ReservationComponents";
import { Button } from "../components/ui/Button";
import { Card, ListRow } from "../components/ui/Card";
import { Checkbox } from "../components/ui/Checkbox";
import { Input } from "../components/ui/Input";
import { Backdrop } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { ConfirmModal } from "../components/ui/Modal";
import { InlineAlert } from "../components/ui/InlineAlert";
import {
  Calendar,
  FloatingActionBar,
  PageContainer,
  PageHeader,
  SectionHeader,
  Tabs,
  Typography,
} from "../components/ui/Typography";
import { useAuth } from "../context/AuthContext";
import { useReservations, useWeeks } from "../hooks/useTaurusHooks";
import dayjs from "../lib/dayjs";
import { Reservation, SystemSettings, Team } from "../types/taurus";

const RECUR_WEEKDAYS = [
  { day: 0, label: "일" },
  { day: 1, label: "월" },
  { day: 2, label: "화" },
  { day: 3, label: "수" },
  { day: 4, label: "목" },
  { day: 5, label: "금" },
  { day: 6, label: "토" },
];

function AdminReservationManager() {
  const { allWeeks, loading: weeksLoading, refreshAllWeeks } = useWeeks();
  const {
    reservations,
    loading: resLoading,
    getReservations,
  } = useReservations();

  const [selectedWeekNum, setSelectedWeekNum] = useState(0);
  const [selectedResIds, setSelectedResIds] = useState<string[]>([]);

  // Mode: "dates" (specific calendar dates) vs "recurring" (date range + weekdays)
  const [reserveMode, setReserveMode] = useState<"dates" | "recurring">("dates");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Recurring mode state
  const [recurStartDate, setRecurStartDate] = useState(() =>
    dayjs().format("YYYY-MM-DD")
  );
  const [recurEndDate, setRecurEndDate] = useState(() =>
    dayjs().add(4, "week").format("YYYY-MM-DD")
  );
  const [recurWeekdays, setRecurWeekdays] = useState<number[]>(() => [
    dayjs().day(),
  ]);

  // Clean 1-hour range selection (no crowded individual slot grid)
  const [startHourStr, setStartHourStr] = useState("15:00");
  const [endHourStr, setEndHourStr] = useState("18:00");
  const [description, setDescription] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: "error" | "success";
    message: string;
  } | null>(null);

  const weekOptions = useMemo(
    () =>
      allWeeks
        ? allWeeks.map((w) => ({
            value: w.id.toString(),
            label: `${w.weekNumber}주차 (${dayjs(w.startDate).format("MM.DD")} ~ ${dayjs(w.endDate).format("MM.DD")})`,
          }))
        : [],
    [allWeeks]
  );

  const startHourOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => i + 9).map((h) => {
        const val = `${String(h).padStart(2, "0")}:00`;
        return { value: val, label: val };
      }),
    []
  );

  const endHourOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => i + 10)
        .filter((h) => h > Number(startHourStr.split(":")[0]))
        .map((h) => {
          const val = `${String(h).padStart(2, "0")}:00`;
          return { value: val, label: val };
        }),
    [startHourStr]
  );

  const selectedTimeSlots = useMemo(() => {
    const startH = Number(startHourStr.split(":")[0]);
    const endH = Number(endHourStr.split(":")[0]);
    const out: string[] = [];
    for (let h = startH; h < endH; h++) {
      out.push(`${String(h).padStart(2, "0")}:00`);
    }
    return out;
  }, [startHourStr, endHourStr]);

  const recurringTargetDates = useMemo(() => {
    if (!recurStartDate || !recurEndDate || recurWeekdays.length === 0) {
      return [];
    }
    const start = dayjs(recurStartDate).startOf("day");
    const end = dayjs(recurEndDate).startOf("day");
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return [];
    }
    // Cap at 180 days as safety guard
    const maxEnd = start.add(180, "day");
    const boundedEnd = end.isAfter(maxEnd) ? maxEnd : end;
    const weekdaySet = new Set(recurWeekdays);
    const out: string[] = [];
    let cur = start;
    while (!cur.isAfter(boundedEnd)) {
      if (weekdaySet.has(cur.day())) {
        out.push(cur.format("YYYY-MM-DD"));
      }
      cur = cur.add(1, "day");
    }
    return out;
  }, [recurStartDate, recurEndDate, recurWeekdays]);

  const effectiveDates = useMemo(
    () =>
      reserveMode === "dates"
        ? [...selectedDates].sort()
        : recurringTargetDates,
    [reserveMode, selectedDates, recurringTargetDates]
  );

  useEffect(() => {
    refreshAllWeeks();
  }, [refreshAllWeeks]);

  useEffect(() => {
    if (!weeksLoading && allWeeks && allWeeks.length > 0 && selectedWeekNum === 0) {
      const now = dayjs();
      const current = allWeeks.find(
        (w) =>
          (now.isSame(w.startDate, "day") || now.isAfter(w.startDate)) &&
          (now.isSame(w.endDate, "day") || now.isBefore(w.endDate))
      );
      if (current) {
        setSelectedWeekNum(current.id);
      } else {
        const latest = [...allWeeks].sort((a, b) => b.weekNumber - a.weekNumber)[0];
        setSelectedWeekNum(latest.id);
      }
    }
  }, [allWeeks, weeksLoading, selectedWeekNum]);

  useEffect(() => {
    if (selectedWeekNum > 0) {
      getReservations(selectedWeekNum.toString());
      setSelectedResIds([]);
    }
  }, [selectedWeekNum, getReservations]);

  const toggleRecurWeekday = (day: number) => {
    setRecurWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const applyQuickWeeks = (weeksCount: number) => {
    const base = dayjs(recurStartDate).isValid()
      ? dayjs(recurStartDate)
      : dayjs();
    setRecurEndDate(base.add(weeksCount, "week").subtract(1, "day").format("YYYY-MM-DD"));
  };

  const handleCancel = async (id: string) => {
    try {
      await adminApi.cancelReservation(id);
      if (selectedWeekNum > 0) getReservations(selectedWeekNum.toString());
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } }).response?.status || 500;
      throw new Error(String(status));
    }
  };

  const handleRequestBatchReserve = () => {
    setFeedback(null);
    if (effectiveDates.length === 0) {
      setFeedback({
        variant: "error",
        message:
          reserveMode === "dates"
            ? "날짜를 최소 1일 이상 선택해주세요."
            : "반복 기간과 요일에 해당하는 날짜가 없습니다.",
      });
      return;
    }
    if (selectedTimeSlots.length === 0) {
      setFeedback({
        variant: "error",
        message: "종료 시간은 시작 시간보다 뒤여야 합니다.",
      });
      return;
    }
    if (!description.trim()) {
      setFeedback({
        variant: "error",
        message: "점유 사유를 입력해주세요. (예: 베이스 레슨, 활동기수 합주)",
      });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmBatchReserve = async () => {
    try {
      setSubmitting(true);
      for (const dateStr of effectiveDates) {
        for (const timeStr of selectedTimeSlots) {
          const iso = dayjs(`${dateStr}T${timeStr}:00+09:00`).toISOString();
          await adminApi.createReservation({
            startTime: iso,
            description: description.trim(),
          });
        }
      }
      await refreshAllWeeks();
      if (selectedWeekNum > 0) await getReservations(selectedWeekNum.toString());
      const countCreated = effectiveDates.length * selectedTimeSlots.length;
      if (reserveMode === "dates") setSelectedDates([]);
      setDescription("");
      setConfirmOpen(false);
      setFeedback({
        variant: "success",
        message: `관리자 예약 ${countCreated}건(${effectiveDates.length}일 × ${startHourStr}~${endHourStr})이 확정되었습니다.`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "예약 생성 실패";
      setConfirmOpen(false);
      setFeedback({ variant: "error", message: `오류 발생: ${msg}` });
    } finally {
      setSubmitting(false);
    }
  };

  const totalSlotsToCreate = effectiveDates.length * selectedTimeSlots.length;

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <SectionHeader
          title="관리자 권한으로 예약하기"
          description="관리자 예약은 바로 확정되며, 기존 예약을 덮어씌웁니다."
        />
        <Card className="p-5 sm:p-6 md:p-8 space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-bg-main border border-border">
            <button
              type="button"
              onClick={() => {
                setReserveMode("dates");
                setFeedback(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                reserveMode === "dates"
                  ? "bg-brand-red text-white shadow"
                  : "text-text-sub hover:text-white"
              }`}
            >
              특정 날짜 선택
            </button>
            <button
              type="button"
              onClick={() => {
                setReserveMode("recurring");
                setFeedback(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                reserveMode === "recurring"
                  ? "bg-brand-red text-white shadow"
                  : "text-text-sub hover:text-white"
              }`}
            >
              매주 반복 예약 (레슨 · 기수)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Side: Dates or Recurring Range */}
            <div className="min-w-0">
              {reserveMode === "dates" ? (
                <div className="space-y-3 min-w-0">
                  <Typography variant="label" color="sub">
                    날짜 선택 (복수 선택 가능)
                  </Typography>
                  <Calendar
                    selectedDates={selectedDates}
                    onChange={setSelectedDates}
                  />
                </div>
              ) : (
                <div className="space-y-4 bg-bg-main/50 border border-border rounded-2xl p-4 min-w-0 overflow-hidden">
                  <Typography variant="label" color="sub">
                    반복 날짜 범위 및 요일
                  </Typography>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-medium text-text-sub ml-1">
                        반복 시작일
                      </label>
                      <input
                        type="date"
                        value={recurStartDate}
                        onChange={(e) => setRecurStartDate(e.target.value)}
                        className="block w-full min-w-0 max-w-full box-border appearance-none bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand-red [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-medium text-text-sub ml-1">
                        반복 종료일
                      </label>
                      <input
                        type="date"
                        value={recurEndDate}
                        min={recurStartDate}
                        onChange={(e) => setRecurEndDate(e.target.value)}
                        className="block w-full min-w-0 max-w-full box-border appearance-none bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-main outline-none focus:border-brand-red [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[4, 8, 12, 16].map((wk) => (
                      <button
                        key={wk}
                        type="button"
                        onClick={() => applyQuickWeeks(wk)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface border border-border text-text-sub hover:text-white hover:border-border-active cursor-pointer"
                      >
                        +{wk}주
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-text-sub ml-1">
                      반복 요일 (복수 선택 가능)
                    </span>
                    <div className="grid grid-cols-7 gap-1.5">
                      {RECUR_WEEKDAYS.map((item) => {
                        const active = recurWeekdays.includes(item.day);
                        return (
                          <button
                            key={item.day}
                            type="button"
                            onClick={() => toggleRecurWeekday(item.day)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              active
                                ? "bg-brand-red text-white border-brand-red shadow-sm"
                                : "bg-surface text-text-sub border-border hover:text-white"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface/80 border border-white/5 text-xs text-text-sub">
                    {recurringTargetDates.length > 0 ? (
                      <>
                        해당 기간 내{" "}
                        <strong className="text-white">
                          {recurringTargetDates.length}일
                        </strong>
                        이 자동 선택됩니다. (
                        {dayjs(recurringTargetDates[0]).format("M/D")} ~{" "}
                        {dayjs(
                          recurringTargetDates[recurringTargetDates.length - 1]
                        ).format("M/D")}
                        )
                      </>
                    ) : (
                      "시작일, 종료일 및 요일을 선택해주세요."
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Clean Start~End Time Range + Reason + Submit */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Typography variant="label" color="sub">
                  시간 범위 선택 (1시간 단위)
                </Typography>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="시작 시간"
                    options={startHourOptions}
                    value={startHourStr}
                    onChange={(v) => {
                      setStartHourStr(v);
                      const nextH = Number(v.split(":")[0]) + 1;
                      if (Number(endHourStr.split(":")[0]) <= Number(v.split(":")[0])) {
                        setEndHourStr(`${String(Math.min(23, nextH)).padStart(2, "0")}:00`);
                      }
                    }}
                  />
                  <Select
                    label="종료 시간"
                    options={endHourOptions}
                    value={endHourStr}
                    onChange={setEndHourStr}
                  />
                </div>
                <p className="text-xs text-text-muted ml-1">
                  선택된 시간: {startHourStr} ~ {endHourStr} (
                  <span className="text-text-main font-semibold">
                    {selectedTimeSlots.length}시간
                  </span>{" "}
                  연속 예약)
                </p>
              </div>

              <Input
                label="점유 사유"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 베이스 레슨, 활동기수 합주"
                required
              />

              {feedback && (
                <InlineAlert variant={feedback.variant} className="my-2!">
                  {feedback.message}
                </InlineAlert>
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleRequestBatchReserve}
                  fullWidth
                  size="lg"
                  disabled={totalSlotsToCreate === 0}
                >
                  {totalSlotsToCreate > 0
                    ? reserveMode === "recurring"
                      ? `매주 반복 예약하기 (${effectiveDates.length}일 · 총 ${totalSlotsToCreate}건)`
                      : `${effectiveDates.length}일 × ${selectedTimeSlots.length}시간 일괄 예약하기`
                    : "날짜와 시간을 선택해주세요"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmBatchReserve}
        title={
          reserveMode === "recurring"
            ? "매주 반복 예약 확인"
            : "관리자 일괄 예약 확인"
        }
        description={`${effectiveDates.length}일(${dayjs(effectiveDates[0]).format(
          "M/D"
        )} ~ ${dayjs(effectiveDates[effectiveDates.length - 1]).format(
          "M/D"
        )})의 ${startHourStr} ~ ${endHourStr} 시간대(총 ${totalSlotsToCreate}건)를 "${description.trim()}" 사유로 관리자 점유 설정하시겠습니까?`}
        confirmText="예약 확정"
        isLoading={submitting}
      />

      <section className="space-y-6">
        <SectionHeader
          title="주차별 예약 현황"
          description="각 주차별로 모든 예약 현황을 조회합니다."
        />
        <div className="w-full sm:w-64 sm:ml-auto">
          <Select
            options={weekOptions}
            value={selectedWeekNum}
            onChange={(val) => setSelectedWeekNum(Number(val))}
            fullWidth
          />
        </div>
        <ReservationHistoryList
          reservations={reservations}
          loading={resLoading}
          onCancel={handleCancel}
          selectable
          selectedIds={selectedResIds}
          onSelectionChange={setSelectedResIds}
          showTeamName
          showHeader={false}
        />
      </section>
    </div>
  );
}

function AdminTeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamReservations, setTeamReservations] = useState<Reservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedResIds, setSelectedResIds] = useState<string[]>([]);

  const loadTeams = useCallback(async () => {
    try {
      const list = await teamApi.getTeams(search);
      setTeams(list);
    } catch (err) {
      console.error("Failed to load teams", err);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadTeams]);

  const loadTeamReservations = async (teamId: string) => {
    try {
      setLoadingRes(true);
      const list = await adminApi.getReservationsByTeam(teamId);
      setTeamReservations(list);
    } catch (err) {
      console.error("Failed to load team reservations", err);
    } finally {
      setLoadingRes(false);
    }
  };

  const toggleTeamSelection = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteTeams = async () => {
    if (confirm(`선택한 ${selectedTeamIds.length}개의 팀을 정말 삭제하시겠습니까?`)) {
      try {
        await Promise.all(selectedTeamIds.map((id) => adminApi.deleteTeam(id)));
        loadTeams();
        if (selectedTeam && selectedTeamIds.includes(selectedTeam.id)) {
          setSelectedTeam(null);
        }
        setSelectedTeamIds([]);
        alert("일괄 삭제가 완료되었습니다.");
      } catch (err) {
        console.error(err);
        alert("일부 팀 삭제에 실패했습니다.");
      }
    }
  };

  const handleCancelReservation = async (id: string) => {
    try {
      await adminApi.cancelReservation(id);
      if (selectedTeam) loadTeamReservations(selectedTeam.id);
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } }).response?.status || 500;
      throw new Error(String(status));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4 relative">
        <Input
          placeholder="팀 이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-4"
        />
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            checked={selectedTeamIds.length === teams.length && teams.length > 0}
            onChange={(e) =>
              setSelectedTeamIds(e.target.checked ? teams.map((t) => t.id) : [])
            }
            label="전체 선택"
            className="text-sm text-text-sub"
          />
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {teams.map((team) => {
            const checked = selectedTeamIds.includes(team.id);
            const active = selectedTeam?.id === team.id;
            return (
              <ListRow
                key={team.id}
                onClick={() => {
                  setSelectedTeam(team);
                  setSelectedResIds([]);
                  loadTeamReservations(team.id);
                }}
                className={`cursor-pointer transition-all rounded-xl border border-border ${
                  active ? "bg-primary/10 border-primary" : ""
                } ${checked ? "bg-primary/5" : ""}`}
                left={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      onChange={() => toggleTeamSelection(team.id)}
                    />
                  </div>
                }
                center={
                  <h4
                    className={`font-bold text-lg ${
                      active ? "text-primary" : "text-text-main"
                    }`}
                  >
                    {team.name}
                  </h4>
                }
                right={
                  <p className="text-xs text-text-sub">
                    {dayjs(team.createdAt).format("YYYY-MM-DD HH:mm")}
                  </p>
                }
              />
            );
          })}
          {teams.length === 0 && (
            <div className="text-center py-20 text-text-sub bg-bg-card/30 rounded-2xl border border-dashed border-white/5">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
        <FloatingActionBar
          selectedCount={selectedTeamIds.length}
          onClear={() => setSelectedTeamIds([])}
          onDelete={
            selectedTeamIds.length > 0 ? handleBatchDeleteTeams : undefined
          }
        />
      </div>

      <div className="lg:col-span-7">
        {selectedTeam ? (
          <div className="bg-bg-card rounded-2xl border border-white/10 p-4 sticky top-24 animate-in fade-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {selectedTeam.name}
                </h3>
                <p className="text-sm text-text-sub">
                  등록일: {dayjs(selectedTeam.createdAt).format("YYYY-MM-DD HH:mm")}
                </p>
              </div>
            </div>
            <div className="border-t border-white/5 pt-6">
              <ReservationHistoryList
                reservations={teamReservations}
                loading={loadingRes}
                onCancel={handleCancelReservation}
                selectable
                selectedIds={selectedResIds}
                onSelectionChange={setSelectedResIds}
                showHeader={false}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-10 px-10 bg-bg-card/30 rounded-2xl border border-dashed border-white/10 text-text-sub">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            <p>팀을 선택하면 상세 정보와 예약 이력을 볼 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSettingsManager() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    adminApi
      .getSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings", err));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      await adminApi.updateSettings(settings);
      alert("설정이 저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert("설정 저장 실패");
    }
  };

  if (!settings) {
    return <div className="text-center py-10">설정 로딩 중...</div>;
  }

  return (
    <Card className="p-8 max-w-xl mx-auto border-primary/20 bg-gradient-to-br from-bg-card to-bg-main">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">시스템 정책 설정</h3>
          <p className="text-sm text-text-sub">
            팀별 예약 가능 시간 제한 등을 관리합니다.
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <Input
          label="주당 최대 예약 가능 시간"
          type="number"
          value={settings.maxSlotsPerWeek}
          onChange={(e) =>
            setSettings({
              ...settings,
              maxSlotsPerWeek: parseInt(e.target.value || "0", 10),
            })
          }
          placeholder="예: 4 (1슬롯=50분)"
        />
        <Input
          label="일일 최대 예약 가능 시간"
          type="number"
          value={settings.maxSlotsPerDay}
          onChange={(e) =>
            setSettings({
              ...settings,
              maxSlotsPerDay: parseInt(e.target.value || "0", 10),
            })
          }
          placeholder="예: 2"
        />
        <div className="pt-4">
          <Button
            onClick={handleSave}
            fullWidth
            className="shadow-lg shadow-primary/30 py-3"
          >
            설정 데이터 저장하기
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, loginAdmin, logoutAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("reservations");
  const [authOpen, setAuthOpen] = useState(!isAdminAuthenticated);

  const handleAuthSubmit = async (_name: string, password: string) => {
    try {
      const { access_token } = await adminApi.verify(password);
      loginAdmin(access_token);
      setAuthOpen(false);
    } catch (err) {
      console.error(err);
      alert("관리자 인증에 실패했습니다.");
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="text-text-sub mb-4">관리자 페이지 접근 권한이 필요합니다.</p>
          <Button onClick={() => navigate("/")}>홈으로 돌아가기</Button>
        </div>
        {authOpen && (
          <>
            <Backdrop onClose={() => navigate("/")} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs bg-bg-card p-6 rounded-2xl border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">관리자 인증</h3>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-text-sub" />
                </button>
              </div>
              <TeamAuthForm onSubmit={handleAuthSubmit} hideNameField />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="관리자 페이지"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logoutAdmin();
              setAuthOpen(true);
            }}
          >
            로그아웃
          </Button>
        }
      />
      <Tabs
        tabs={[
          { id: "reservations", label: "예약 관리" },
          { id: "teams", label: "팀 관리" },
          { id: "settings", label: "시스템 설정" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === "reservations" && <AdminReservationManager />}
      {activeTab === "teams" && <AdminTeamManager />}
      {activeTab === "settings" && <AdminSettingsManager />}
    </PageContainer>
  );
}
