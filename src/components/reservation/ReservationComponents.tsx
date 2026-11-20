import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Calendar as CalendarIcon,
  CircleCheck,
  CirclePlus,
  Clock,
  ClockFading,
  Info,
  Lock,
  User,
} from "lucide-react";
import {
  CalendarBlank,
  Clock as PhosphorClock,
  Info as PhosphorInfo,
  User as PhosphorUser,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { authApi, reservationApi } from "../../api/taurusApi";
import { useAuth } from "../../context/AuthContext";
import dayjs from "../../lib/dayjs";
import { Reservation, ReservationStatus, Week } from "../../types/taurus";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { ListRow } from "../ui/Card";
import { InlineAlert } from "../ui/InlineAlert";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import {
  EmptyState,
  FloatingActionBar,
  SectionHeader,
  SelectionSummary,
} from "../ui/Typography";

export function DaySelector({
  currentWeek,
  selectedDate,
  onSelectDate,
}: {
  currentWeek: Week | null;
  selectedDate: dayjs.Dayjs;
  onSelectDate: (d: dayjs.Dayjs) => void;
}) {
  if (!currentWeek) return null;
  const start = dayjs(currentWeek.startDate);
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));

  return (
    <div className="flex justify-between items-center bg-bg-card rounded-xl p-2 mb-6 border border-white/5">
      {days.map((d) => {
        const isSelected = d.isSame(selectedDate, "day");
        const isToday = d.isSame(dayjs(), "day");
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelectDate(d)}
            className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-all cursor-pointer ${
              isSelected
                ? "bg-primary text-white shadow-lg"
                : "text-text-sub hover:bg-white/5"
            }`}
          >
            <span className={`text-xs mb-1 ${isSelected ? "text-white/80" : ""}`}>
              {d.format("ddd")}
            </span>
            <span
              className={`text-lg font-bold ${
                isToday && !isSelected ? "text-primary" : ""
              }`}
            >
              {d.format("D")}
            </span>
            {isToday && (
              <div
                className={`w-1 h-1 rounded-full mt-1 ${
                  isSelected ? "bg-white" : "bg-primary"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TimelineSlot({
  timeStr,
  endTimeStr,
  isPending,
  isPast,
  isConfirmed,
  isAdminConfirmed,
  teamName,
  description,
  pendingCount = 0,
  onClick,
  isLast = false,
}: {
  timeStr: string;
  endTimeStr: string;
  isPending?: boolean;
  isPast?: boolean;
  isConfirmed?: boolean;
  isAdminConfirmed?: boolean;
  teamName?: string;
  description?: string | null;
  pendingCount?: number;
  onClick?: () => void;
  isLast?: boolean;
}) {
  const variantKey = isPast
    ? isConfirmed
      ? "pastConfirmed"
      : "pastEmpty"
    : isAdminConfirmed
    ? "adminConfirmed"
    : isConfirmed
    ? "confirmed"
    : isPending
    ? "pending"
    : "available";

  const isDisabled = isPast || variantKey === "adminConfirmed";
  const isConfirmedInteractive = !isPast && variantKey === "confirmed";
  const displayTitle =
    variantKey === "pending" ? `예약 대기 ${pendingCount}팀` : teamName || "";
  const displayDesc =
    description ||
    (variantKey === "confirmed"
      ? "예약 확정 · 눌러서 변경/취소"
      : variantKey === "pending"
      ? "눌러서 대기 신청 / 변경·취소"
      : "");

  const styles = {
    pastConfirmed: {
      card: "bg-neutral-950/30 border-white/5 opacity-60",
      dot: "border-neutral-800 bg-neutral-900",
      time: "text-neutral-300",
      content: "text-sm text-neutral-500",
      Icon: CircleCheck,
      iconColor: "text-neutral-700",
      shadow: "",
    },
    pastEmpty: {
      card: "bg-neutral-950/30 border-white/5 opacity-60",
      dot: "border-neutral-800 bg-neutral-900",
      time: "text-neutral-300",
      content: "text-sm text-neutral-600",
      Icon: ClockFading,
      iconColor: "text-neutral-700",
      shadow: "",
    },
    confirmed: {
      card: "bg-gradient-to-br from-emerald-900/10 to-emerald-950/10 border-emerald-900/50",
      dot: "border-emerald-600 bg-emerald-950 shadow-[0_0_8px_rgba(220,38,38,0.6)]",
      time: "text-emerald-400",
      content: "font-bold text-md text-white",
      shadow: "shadow-lg shadow-black/40",
      Icon: CircleCheck,
      iconColor: "text-emerald-500",
    },
    adminConfirmed: {
      card: "bg-gradient-to-br from-red-900/10 to-red-950/10 border-red-900/50",
      dot: "border-red-600 bg-red-950 shadow-[0_0_8px_rgba(220,38,38,0.6)]",
      time: "text-red-400",
      content: "font-bold text-md text-white",
      shadow: "shadow-lg shadow-black/40",
      Icon: BadgeCheck,
      iconColor: "text-red-500",
    },
    pending: {
      card: "bg-gradient-to-br from-yellow-900/10 to-yellow-950/10 border-yellow-500/20",
      dot: "border-yellow-500 bg-yellow-950 shadow-[0_0_8px_rgba(234,179,8,0.4)]",
      time: "text-yellow-400",
      content: "font-bold text-md text-white",
      shadow: "",
      Icon: Clock,
      iconColor: "text-yellow-500",
    },
    available: {
      card: "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700",
      dot: "border-neutral-700 bg-neutral-950",
      time: "text-neutral-300",
      content: "",
      shadow: "",
      Icon: CirclePlus,
      iconColor: "text-neutral-400",
    },
  }[variantKey];

  const SlotIcon = styles.Icon;

  return (
    <div className="relative pl-6 pb-2 group">
      {!isLast && (
        <div className="absolute left-[19px] top-5 bottom-[-8px] w-[2px] transition-colors duration-300 bg-neutral-800" />
      )}
      <div
        className={`absolute left-[12px] top-5 w-4 h-4 rounded-full border-2 ${styles.dot} z-10 transition-all duration-300 group-hover:scale-110`}
      />
      <div
        onClick={isDisabled ? undefined : onClick}
        className={`ml-6 rounded-2xl border p-4 transition-all duration-300 ${styles.card} ${styles.shadow} ${
          isDisabled
            ? "cursor-not-allowed"
            : isConfirmedInteractive
            ? "hover:border-emerald-500/70 active:scale-[0.98] cursor-pointer"
            : "active:scale-[0.98] active:bg-white/5 cursor-pointer"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className={`text-md font-bold ${styles.time}`}>
            {timeStr}{" "}
            <span className="text-[12px] opacity-70">~ {endTimeStr}</span>
          </div>
          {SlotIcon && <SlotIcon className={`w-4 h-4 ${styles.iconColor}`} />}
        </div>
        {displayTitle && (
          <div className="my-1">
            <span className={`truncate block ${styles.content}`}>
              {displayTitle}
            </span>
          </div>
        )}
        {displayDesc && (
          <div className="flex items-center space-x-1">
            <Info className="w-3 h-3 text-neutral-400" />
            <div className="text-sm text-neutral-400">{displayDesc}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const SLOT_DURATION_MINUTES = 50;

export function TimelineList({
  selectedDate,
  reservations,
  onReserve,
  onManageConfirmed,
}: {
  selectedDate: dayjs.Dayjs;
  reservations: Reservation[];
  onReserve: (timeStr: string) => void;
  onManageConfirmed?: (reservation: Reservation) => void;
}) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 9);

  return (
    <div className="flex flex-col">
      {hours.map((hour, idx) => {
        const slotStart = selectedDate
          .hour(hour)
          .minute(0)
          .second(0)
          .millisecond(0);
        const slotEnd = slotStart.add(SLOT_DURATION_MINUTES, "minute");
        const timeStr = slotStart.format("HH:mm");
        const endTimeStr = slotEnd.format("HH:mm");

        const slotReservations = reservations.filter((r) => {
          const rStart = dayjs(r.startTime);
          return (
            rStart.format("YYYY-MM-DD") === selectedDate.format("YYYY-MM-DD") &&
            rStart.format("HH:mm") === timeStr
          );
        });

        const confirmed = slotReservations.find(
          (r) =>
            r.status === ReservationStatus.CONFIRMED ||
            r.status === ReservationStatus.CONFIRMED_ADMIN
        );
        const pendingList = slotReservations.filter(
          (r) => r.status === ReservationStatus.PENDING
        );

        const isPending = !confirmed && pendingList.length > 0;
        const isPast = slotStart.isBefore(dayjs());
        const isConfirmed = Boolean(confirmed);
        const isAdminConfirmed =
          Boolean(confirmed) &&
          confirmed?.status === ReservationStatus.CONFIRMED_ADMIN;

        return (
          <TimelineSlot
            key={hour}
            timeStr={timeStr}
            endTimeStr={endTimeStr}
            isPast={isPast}
            isConfirmed={isConfirmed}
            isAdminConfirmed={isAdminConfirmed}
            isPending={isPending}
            teamName={confirmed?.teamName || undefined}
            description={confirmed?.description}
            pendingCount={pendingList.length}
            onClick={() => {
              if (isPast || isAdminConfirmed) return;
              if (isConfirmed && confirmed) {
                onManageConfirmed?.(confirmed);
                return;
              }
              onReserve(timeStr);
            }}
            isLast={idx === hours.length - 1}
          />
        );
      })}
    </div>
  );
}

const VALID_NAME_REGEX = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$/;

function validateCredentialField(val: string, fieldLabel: string): string {
  if (!val) return `${fieldLabel}을(를) 입력해주세요.`;
  if (/\s/.test(val)) return `${fieldLabel}에 공백을 포함할 수 없습니다.`;
  if (!VALID_NAME_REGEX.test(val)) {
    return `${fieldLabel}에 특수문자를 포함할 수 없습니다.`;
  }
  return "";
}

export function TeamAuthForm({
  initialName = "",
  initialPassword = "",
  onSubmit,
  isSubmitting = false,
  submitLabel = "확인",
  hideNameField = false,
  onCancel,
}: {
  initialName?: string;
  initialPassword?: string;
  onSubmit: (name: string, password: string) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
  hideNameField?: boolean;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState(initialPassword);
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialPassword) setPassword(initialPassword);
  }, [initialName, initialPassword]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (nameError) setNameError(validateCredentialField(val, "팀 이름"));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) {
      setPasswordError(validateCredentialField(val, "비밀번호"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nErr = hideNameField ? "" : validateCredentialField(name, "팀 이름");
    const pErr = validateCredentialField(password, "비밀번호");
    setNameError(nErr);
    setPasswordError(pErr);
    if (!nErr && !pErr) {
      await onSubmit(name, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {!hideNameField && (
          <Input
            label="팀명"
            placeholder="합주할 곡명, 가수명, 팀명 등 입력 (공백, 특수문자, 중복 불가)"
            value={name}
            onChange={handleNameChange}
            error={nameError}
            icon={<User className="w-4 h-4" />}
          />
        )}
        <Input
          label="비밀번호"
          type="password"
          placeholder={
            hideNameField
              ? "관리자 비밀번호 입력 (로컬 데모: admin)"
              : "비밀번호 입력 (4자리 이상)"
          }
          value={password}
          onChange={handlePasswordChange}
          error={passwordError}
          required
          maxLength={32}
          icon={<Lock className="w-4 h-4" />}
        />
      </div>

      {!hideNameField && (
        <div className="pt-2 text-xs text-text-sub space-y-1">
          <p>* 따로 회원가입 절차 없이, 해당 팀명으로 최초 예약 시 자동으로 팀 등록됩니다.</p>
          <p>* 등록된 팀명 및 비밀번호는 예약 페이지 및 팀 관리 페이지 로그인 시 사용됩니다.</p>
          <p>* 팀 관리 페이지에서 팀명 및 비밀번호 변경이 가능합니다.</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button variant="ghost" fullWidth onClick={onCancel} type="button">
            취소
          </Button>
        )}
        <Button fullWidth type="submit" disabled={isSubmitting}>
          {isSubmitting ? "처리 중..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ReservationManagePanel({
  targetReservation,
  candidates,
  mode,
  weekData,
  allWeekReservations = [],
  onSuccess,
  onCancelClose,
}: {
  targetReservation: Reservation | null;
  candidates?: Reservation[];
  mode: "INSTANT" | "PRE";
  weekData: Week | null;
  allWeekReservations?: Reservation[];
  onSuccess: () => void;
  onCancelClose: () => void;
}) {
  const { teamName: authTeamName, teamPassword: authPassword, loginTeam } = useAuth();
  const list = candidates && candidates.length > 0 ? candidates : targetReservation ? [targetReservation] : [];

  const [selectedResId, setSelectedResId] = useState<string>(list[0]?.id || "");
  const activeRes = list.find((r) => r.id === selectedResId) || list[0] || null;

  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [confirmCancelStep, setConfirmCancelStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Target date & time for rescheduling
  const [newDateStr, setNewDateStr] = useState(() =>
    activeRes ? dayjs(activeRes.startTime).format("YYYY-MM-DD") : ""
  );
  const [newTimeStr, setNewTimeStr] = useState(() =>
    activeRes ? dayjs(activeRes.startTime).format("HH:mm") : "09:00"
  );

  useEffect(() => {
    if (list.length > 0 && !list.some((r) => r.id === selectedResId)) {
      setSelectedResId(list[0].id);
    }
  }, [list, selectedResId]);

  useEffect(() => {
    if (!activeRes) return;
    setNewDateStr(dayjs(activeRes.startTime).format("YYYY-MM-DD"));
    setNewTimeStr(dayjs(activeRes.startTime).format("HH:mm"));
    setConfirmCancelStep(false);
    setErrorMsg("");
    setSuccessMsg("");
    if (authTeamName && authTeamName === activeRes.teamName && authPassword) {
      setPassword(authPassword);
      setVerified(false);
    } else {
      setPassword("");
      setVerified(false);
    }
  }, [activeRes?.id, authTeamName, authPassword]);

  if (!activeRes) return null;

  const weekDates = weekData
    ? Array.from({ length: 7 }, (_, i) =>
        dayjs(weekData.startDate).add(i, "day").format("YYYY-MM-DD")
      )
    : [dayjs(activeRes.startTime).format("YYYY-MM-DD")];

  const availableTimeOptions = Array.from({ length: 14 }, (_, i) => i + 9)
    .map((h) => `${String(h).padStart(2, "0")}:00`)
    .map((tStr) => {
      const slotDt = dayjs(`${newDateStr}T${tStr}:00+09:00`);
      const isPastSlot = mode === "INSTANT" && slotDt.isBefore(dayjs());
      const isSameSlot =
        dayjs(activeRes.startTime).format("YYYY-MM-DD") === newDateStr &&
        dayjs(activeRes.startTime).format("HH:mm") === tStr;
      const occupied = allWeekReservations.find(
        (r) =>
          r.id !== activeRes.id &&
          dayjs(r.startTime).format("YYYY-MM-DD") === newDateStr &&
          dayjs(r.startTime).format("HH:mm") === tStr &&
          (r.status === ReservationStatus.CONFIRMED ||
            r.status === ReservationStatus.CONFIRMED_ADMIN)
      );
      const disabled = isPastSlot || Boolean(occupied) || isSameSlot;
      const suffix = isSameSlot
        ? " (현재 예약)"
        : isPastSlot
        ? " (지난 시간)"
        : occupied
        ? ` (${occupied.teamName || "예약됨"})`
        : "";
      return {
        value: tStr,
        label: `${tStr} ~ ${tStr.slice(0, 2)}:50${suffix}`,
        disabled,
      };
    });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!activeRes.teamName) {
      setErrorMsg("팀 정보를 확인할 수 없습니다.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("비밀번호를 입력해주세요.");
      return;
    }
    try {
      setSubmitting(true);
      const { access_token } = await authApi.verify({
        name: activeRes.teamName,
        password: password.trim(),
      });
      loginTeam(access_token, activeRes.teamName, password.trim());
      setVerified(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "비밀번호가 일치하지 않습니다.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async () => {
    try {
      setSubmitting(true);
      setErrorMsg("");
      await reservationApi.cancel(activeRes.id);
      onSuccess();
      onCancelClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "예약 취소에 실패했습니다.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveReservation = async () => {
    const selectedOpt = availableTimeOptions.find((o) => o.value === newTimeStr);
    if (!selectedOpt || selectedOpt.disabled) {
      setErrorMsg("변경 가능한 다른 시간대를 선택해주세요.");
      return;
    }
    const newStartFormatted =
      mode === "INSTANT"
        ? dayjs(`${newDateStr}T${newTimeStr}:00+09:00`).format("YYYY-MM-DD HH:mm")
        : dayjs(`${newDateStr}T${newTimeStr}:00+09:00`).toISOString();

    const oldStartFormatted =
      mode === "INSTANT"
        ? dayjs(activeRes.startTime).format("YYYY-MM-DD HH:mm")
        : dayjs(activeRes.startTime).toISOString();

    try {
      setSubmitting(true);
      setErrorMsg("");
      await reservationApi.cancel(activeRes.id);
      try {
        if (mode === "INSTANT") {
          await reservationApi.createInstant({ startTime: newStartFormatted });
        } else {
          await reservationApi.createPre({ startTime: newStartFormatted });
        }
      } catch (createErr) {
        // Restore original slot if moving failed
        try {
          if (mode === "INSTANT") {
            await reservationApi.createInstant({ startTime: oldStartFormatted });
          } else {
            await reservationApi.createPre({ startTime: oldStartFormatted });
          }
        } catch {
          // Ignore secondary rollback error
        }
        throw createErr;
      }

      setSuccessMsg("예약 시간이 변경되었습니다.");
      onSuccess();
      setTimeout(() => {
        onCancelClose();
      }, 600);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "시간 변경에 실패했습니다.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {list.length > 1 && (
        <Select
          label="변경/취소할 대기 팀 선택"
          options={list.map((r) => ({
            value: r.id,
            label: r.teamName || "Unknown",
          }))}
          value={activeRes.id}
          onChange={setSelectedResId}
        />
      )}

      <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-sub">예약 팀</span>
          <strong className="text-white">{activeRes.teamName}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-sub">현재 시간</span>
          <span className="text-emerald-400 font-semibold">
            {dayjs(activeRes.startTime).format("M월 D일(ddd) HH:mm")} ~{" "}
            {dayjs(activeRes.endTime).format("HH:mm")}
          </span>
        </div>
      </div>

      {errorMsg && (
        <InlineAlert variant="error" className="my-1!">
          {errorMsg}
        </InlineAlert>
      )}
      {successMsg && (
        <InlineAlert variant="success" className="my-1!">
          {successMsg}
        </InlineAlert>
      )}

      {!verified ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="팀 비밀번호 확인"
            type="password"
            placeholder="예약 시 입력한 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={onCancelClose}
            >
              닫기
            </Button>
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "확인 중..." : "비밀번호 확인"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          {/* Reschedule Section */}
          <div className="p-4 rounded-xl bg-bg-main/60 border border-border space-y-3">
            <h4 className="text-sm font-bold text-white">예약 시간 변경</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="변경할 날짜"
                options={weekDates.map((d) => ({
                  value: d,
                  label: dayjs(d).format("M월 D일 (ddd)"),
                }))}
                value={newDateStr}
                onChange={setNewDateStr}
              />
              <Select
                label="변경할 시간"
                options={availableTimeOptions}
                value={newTimeStr}
                onChange={setNewTimeStr}
              />
            </div>
            <Button
              fullWidth
              variant="brand"
              disabled={
                submitting ||
                Boolean(
                  availableTimeOptions.find((o) => o.value === newTimeStr)
                    ?.disabled
                )
              }
              onClick={handleMoveReservation}
            >
              {submitting ? "변경 처리 중..." : "선택한 시간으로 변경하기"}
            </Button>
          </div>

          {/* Cancel Section */}
          <div className="pt-3 border-t border-border space-y-2">
            {!confirmCancelStep ? (
              <Button
                fullWidth
                variant="danger"
                onClick={() => setConfirmCancelStep(true)}
                disabled={submitting}
              >
                이 예약 취소하기
              </Button>
            ) : (
              <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 space-y-2.5">
                <p className="text-xs text-red-300 font-semibold text-center">
                  정말 이 예약을 취소하시겠습니까?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => setConfirmCancelStep(false)}
                    disabled={submitting}
                  >
                    돌아가기
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={handleCancelReservation}
                    disabled={submitting}
                  >
                    {submitting ? "취소 중..." : "네, 취소합니다"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReservationModal({
  isOpen,
  onClose,
  selectedTime,
  selectedDate,
  existingReservations = [],
  allWeekReservations = [],
  weekData = null,
  mode = "INSTANT",
  onSubmit,
  onRefresh,
  isSubmitting = false,
  teamName = "",
  teamPassword = "",
  showWaitlist = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedTime: string;
  selectedDate: dayjs.Dayjs;
  existingReservations?: Reservation[];
  allWeekReservations?: Reservation[];
  weekData?: Week | null;
  mode?: "INSTANT" | "PRE";
  onSubmit: (name: string, password: string) => Promise<void> | void;
  onRefresh?: () => void;
  isSubmitting?: boolean;
  teamName?: string | null;
  teamPassword?: string | null;
  showWaitlist?: boolean;
}) {
  const waitlistReservations = existingReservations.filter(
    (r) =>
      dayjs(r.startTime).format("HH:mm") === selectedTime &&
      r.status === ReservationStatus.PENDING
  );
  const waitlistTeams = waitlistReservations.map((r) => r.teamName || "Unknown");
  const [modalTab, setModalTab] = useState<"apply" | "manage">("apply");

  useEffect(() => {
    if (isOpen) setModalTab("apply");
  }, [isOpen, selectedTime]);

  const formattedDate = dayjs(selectedDate).format("M월 D일 (ddd)");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="예약 신청">
      <div className="space-y-5">
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-text-sub">
            <CalendarIcon className="w-4 h-4" />
            <span className="text-white font-medium">{formattedDate}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 text-text-sub">
            <Clock className="w-4 h-4" />
            <span className="text-white font-bold text-lg">{selectedTime}</span>
          </div>
        </div>

        {showWaitlist && waitlistTeams.length > 0 && (
          <>
            <InlineAlert variant="info" title={`현재 대기 ${waitlistTeams.length}팀`}>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {waitlistTeams.map((team, idx) => (
                  <Badge key={idx} variant="info">
                    {team}
                  </Badge>
                ))}
              </div>
            </InlineAlert>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-bg-main border border-border">
              <button
                type="button"
                onClick={() => setModalTab("apply")}
                className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modalTab === "apply"
                    ? "bg-brand-red text-white"
                    : "text-text-sub hover:text-white"
                }`}
              >
                새 대기 신청
              </button>
              <button
                type="button"
                onClick={() => setModalTab("manage")}
                className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modalTab === "manage"
                    ? "bg-surface-elevated text-white border border-white/15"
                    : "text-text-sub hover:text-white"
                }`}
              >
                내 대기 변경 / 취소
              </button>
            </div>
          </>
        )}

        {modalTab === "manage" && showWaitlist && waitlistReservations.length > 0 ? (
          <ReservationManagePanel
            targetReservation={waitlistReservations[0]}
            candidates={waitlistReservations}
            mode={mode}
            weekData={weekData}
            allWeekReservations={allWeekReservations}
            onSuccess={() => onRefresh?.()}
            onCancelClose={onClose}
          />
        ) : (
          <TeamAuthForm
            initialName={teamName || ""}
            initialPassword={teamPassword || ""}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitLabel="예약하기"
            onCancel={onClose}
          />
        )}
      </div>
    </Modal>
  );
}

export function ReservationSection({
  weekData,
  loading,
  error,
  reservations,
  allWeekReservations = [],
  mode = "INSTANT",
  onRefresh,
  selectedDate,
  onDateSelect,
  onTimeSlotClick,
  banner,
  modalProps,
}: {
  weekData: Week | null;
  loading: boolean;
  error?: unknown;
  reservations: Reservation[];
  allWeekReservations?: Reservation[];
  mode?: "INSTANT" | "PRE";
  onRefresh?: () => void;
  selectedDate: dayjs.Dayjs;
  onDateSelect: (d: dayjs.Dayjs) => void;
  onTimeSlotClick: (timeStr: string) => void;
  banner?: {
    label: string;
    weeks: number;
    startDate: string;
    endDate: string;
    theme: "red" | "yellow";
  };
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
    selectedTime: string | null;
    onSubmit: (name: string, password: string) => Promise<void>;
    isSubmitting?: boolean;
    teamName?: string | null;
    teamPassword?: string | null;
    showWaitlist?: boolean;
    existingReservations?: Reservation[];
  };
}) {
  const navigate = useNavigate();
  const [managingReservation, setManagingReservation] =
    useState<Reservation | null>(null);

  if (error) {
    return (
      <EmptyState
        message="오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        action={
          <Button onClick={() => window.location.reload()}>새로고침</Button>
        }
      />
    );
  }

  if (!loading && !weekData) {
    return (
      <EmptyState
        message="예약 가능한 주차 정보를 불러올 수 없습니다."
        action={<Button onClick={() => navigate("/")}>홈으로</Button>}
      />
    );
  }

  return (
    <>
      {banner && (
        <div
          className={`my-4 p-3 rounded-lg text-sm ${
            banner.theme === "yellow"
              ? "bg-yellow-700/10 text-yellow-600"
              : "bg-red-700/10 text-red-600"
          }`}
        >
          <span className="font-bold">{banner.label}:</span> {banner.weeks}주차 (
          {dayjs(banner.startDate).format("MM.DD")} ~{" "}
          {dayjs(banner.endDate).format("MM.DD")})
        </div>
      )}

      {weekData && (
        <div className="sticky top-14 z-30">
          <DaySelector
            currentWeek={weekData}
            selectedDate={selectedDate}
            onSelectDate={onDateSelect}
          />
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="text-center text-text-sub py-10">
            예약 정보를 불러오는 중...
          </div>
        ) : (
          <TimelineList
            reservations={reservations}
            onReserve={onTimeSlotClick}
            onManageConfirmed={(res) => setManagingReservation(res)}
            selectedDate={selectedDate}
          />
        )}
      </div>

      {modalProps.selectedTime && (
        <ReservationModal
          isOpen={modalProps.isOpen}
          onClose={modalProps.onClose}
          selectedTime={modalProps.selectedTime}
          selectedDate={selectedDate}
          existingReservations={modalProps.existingReservations || reservations}
          allWeekReservations={allWeekReservations}
          weekData={weekData}
          mode={mode}
          onRefresh={onRefresh}
          onSubmit={modalProps.onSubmit}
          isSubmitting={modalProps.isSubmitting}
          teamName={modalProps.teamName}
          teamPassword={modalProps.teamPassword}
          showWaitlist={modalProps.showWaitlist}
        />
      )}

      <Modal
        isOpen={Boolean(managingReservation)}
        onClose={() => setManagingReservation(null)}
        title="예약 변경 / 취소"
      >
        <ReservationManagePanel
          targetReservation={managingReservation}
          mode={mode}
          weekData={weekData}
          allWeekReservations={allWeekReservations}
          onSuccess={() => onRefresh?.()}
          onCancelClose={() => setManagingReservation(null)}
        />
      </Modal>
    </>
  );
}

const STATUS_BADGE_MAP: Record<
  ReservationStatus,
  "success" | "warn" | "danger" | "default"
> = {
  [ReservationStatus.CONFIRMED]: "success",
  [ReservationStatus.CONFIRMED_ADMIN]: "success",
  [ReservationStatus.PENDING]: "warn",
  [ReservationStatus.CANCELLED]: "danger",
  [ReservationStatus.VOID]: "danger",
};

const STATUS_LABEL_MAP: Record<ReservationStatus, string> = {
  [ReservationStatus.CONFIRMED]: "예약 확정",
  [ReservationStatus.CONFIRMED_ADMIN]: "관리자 점유",
  [ReservationStatus.PENDING]: "승인 대기",
  [ReservationStatus.CANCELLED]: "취소됨",
  [ReservationStatus.VOID]: "무효화됨",
};

export function ReservationHistoryList({
  reservations,
  loading,
  onCancel,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  showTeamName = false,
  title = "예약 내역",
  description,
  showHeader = true,
}: {
  reservations: Reservation[];
  loading: boolean;
  onCancel: (id: string) => Promise<void>;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showTeamName?: boolean;
  title?: string;
  description?: string;
  showHeader?: boolean;
}) {
  const sorted = [...reservations].sort(
    (a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
  );

  const toggleAll = (checked: boolean) => {
    onSelectionChange?.(checked ? reservations.map((r) => r.id) : []);
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleBatchCancel = async () => {
    if (
      confirm(`선택한 ${selectedIds.length}개의 예약을 취소하시겠습니까?`)
    ) {
      try {
        await Promise.all(selectedIds.map((id) => onCancel(id)));
        onSelectionChange?.([]);
        alert("예약이 취소되었습니다.");
      } catch (err: unknown) {
        console.error("일괄 취소 중 오류 발생:", err);
        const status =
          (err as { response?: { status?: number } }).response?.status || 500;
        alert(`예약 취소에 실패했습니다. (status: ${status})`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <SectionHeader
          title={title}
          description={description || `총 ${reservations.length}건의 예약이 있습니다.`}
        />
      )}

      {selectable && reservations.length > 0 && (
        <SelectionSummary
          totalCount={reservations.length}
          selectedCount={selectedIds.length}
          onSelectAll={toggleAll}
        />
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center text-text-sub py-12 animate-pulse">
            예약 정보를 불러오는 중...
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <EmptyState message="예약 내역이 없습니다." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((res) => {
              const start = dayjs(res.startTime);
              const end = dayjs(res.endTime);
              const isCancelled = res.status === ReservationStatus.CANCELLED;
              const isSelected = selectedIds.includes(res.id);

              return (
                <ListRow
                  key={res.id}
                  align="start"
                  onClick={selectable ? () => toggleOne(res.id) : undefined}
                  className={`transition-colors ${
                    isCancelled ? "opacity-50" : ""
                  } ${
                    isSelected ? "bg-brand-red/5 border-brand-red/30" : ""
                  }`}
                  left={
                    selectable ? (
                      <div
                        className="mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleOne(res.id)}
                        />
                      </div>
                    ) : undefined
                  }
                  center={
                    <div className="min-w-0 space-y-1.5 mt-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-text-sub">
                        <CalendarBlank size={14} className="shrink-0" />
                        <span>{start.format("YY.MM.DD(ddd)")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-text-main whitespace-nowrap">
                        <PhosphorClock
                          size={15}
                          className="shrink-0 text-text-muted"
                        />
                        <span>
                          {start.format("HH:mm")} ~ {end.format("HH:mm")}
                        </span>
                      </div>
                      {showTeamName && (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-text-main min-w-0">
                          <PhosphorUser
                            size={15}
                            className="shrink-0 text-text-muted"
                          />
                          <span className="truncate">
                            {res.teamName ||
                              (res.type === "ADMIN"
                                ? "관리자 점유"
                                : "Unknown Team")}
                          </span>
                        </div>
                      )}
                      {res.description && (
                        <div className="flex items-center gap-1.5 text-xs text-text-sub min-w-0">
                          <PhosphorInfo size={14} className="shrink-0" />
                          <span className="truncate">{res.description}</span>
                        </div>
                      )}
                    </div>
                  }
                  right={
                    <Badge
                      className="w-16 justify-center mt-0.5 shrink-0"
                      variant={
                        res.type === "ADMIN"
                          ? "brand"
                          : STATUS_BADGE_MAP[res.status] || "default"
                      }
                    >
                      {res.type === "ADMIN"
                        ? "ADMIN"
                        : STATUS_LABEL_MAP[res.status] || res.status}
                    </Badge>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {selectable && (
        <FloatingActionBar
          selectedCount={selectedIds.length}
          onClear={() => onSelectionChange?.([])}
          onDelete={selectedIds.length > 0 ? handleBatchCancel : undefined}
          deleteLabel="예약 취소"
        />
      )}
    </div>
  );
}
