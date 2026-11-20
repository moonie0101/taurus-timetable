import { useCallback, useEffect, useState } from "react";
import { authApi, reservationApi, teamApi, weekApi } from "../api/taurusApi";
import { useAuth } from "../context/AuthContext";
import dayjs from "../lib/dayjs";
import { Reservation, Team, Week } from "../types/taurus";

export function useAsyncAction<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  initialLoading = false
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: unknown;
  }>({
    data: null,
    loading: initialLoading,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fn(...args);
        setState({ data: res, loading: false, error: null });
        return res;
      } catch (err) {
        setState({ data: null, loading: false, error: err });
        throw err;
      }
    },
    [fn]
  );

  return {
    ...state,
    execute,
    setData: (data: T | null) => setState((prev) => ({ ...prev, data })),
  };
}

export function useWeeks() {
  const {
    data: currentWeek,
    loading,
    error,
    execute: refreshCurrentWeek,
  } = useAsyncAction(weekApi.getCurrentWeek);
  const { data: allWeeks, execute: refreshAllWeeks } = useAsyncAction(
    weekApi.getWeeks
  );

  useEffect(() => {
    refreshCurrentWeek();
    refreshAllWeeks();
  }, [refreshCurrentWeek, refreshAllWeeks]);

  const nextWeek: Week | null =
    (currentWeek &&
      Array.isArray(allWeeks) &&
      allWeeks.find((w) => w.weekNumber === currentWeek.weekNumber + 1)) ||
    null;

  return {
    currentWeek,
    nextWeek,
    allWeeks,
    loading,
    error,
    refreshCurrentWeek,
    refreshAllWeeks,
  };
}

export function useReservations() {
  const {
    data,
    loading,
    error,
    execute,
    setData,
  } = useAsyncAction(reservationApi.getReservations);
  const { execute: createInstantExec } = useAsyncAction(
    reservationApi.createInstant
  );
  const { execute: createPreExec } = useAsyncAction(reservationApi.createPre);
  const { execute: cancelExec } = useAsyncAction(reservationApi.cancel);
  const {
    data: myReservations,
    loading: myLoading,
    execute: fetchMyReservations,
  } = useAsyncAction(reservationApi.getMyReservations);

  const getReservations = useCallback(
    (weekId?: string) => execute(weekId),
    [execute]
  );
  const getMyReservations = useCallback(
    () => fetchMyReservations(),
    [fetchMyReservations]
  );

  const createInstantReservation = async (payload: { startTime: string }) => {
    const created = await createInstantExec(payload);
    if (data) {
      setData({ ...data, confirmed: [...data.confirmed, created] });
    }
    return created;
  };

  const createPreReservation = async (payload: { startTime: string }) => {
    const created = await createPreExec(payload);
    if (data) {
      setData({ ...data, pending: [...data.pending, created] });
    }
    return created;
  };

  const cancelReservation = async (id: string) => {
    await cancelExec(id);
    if (data) {
      setData({
        confirmed: data.confirmed.filter((r) => r.id !== id),
        pending: data.pending.filter((r) => r.id !== id),
      });
    }
    if (myReservations) {
      await fetchMyReservations();
    }
  };

  return {
    reservations: [...(data?.confirmed || []), ...(data?.pending || [])],
    confirmed: data?.confirmed || [],
    pending: data?.pending || [],
    myReservations: myReservations || [],
    loading: loading || myLoading,
    error,
    getReservations,
    getMyReservations,
    createInstantReservation,
    createPreReservation,
    cancelReservation,
  };
}

export function useWeekSchedule(weekType: "current" | "next") {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const { currentWeek, nextWeek, loading: weekLoading } = useWeeks();
  const { reservations, loading: resLoading, getReservations } = useReservations();

  const weekData = weekType === "current" ? currentWeek : nextWeek;

  useEffect(() => {
    if (weekData && weekData.id !== undefined) {
      getReservations(weekData.id.toString());
      if (
        !selectedDate ||
        selectedDate.isBefore(dayjs(weekData.startDate)) ||
        selectedDate.isAfter(dayjs(weekData.endDate))
      ) {
        const now = dayjs();
        const start = dayjs(weekData.startDate);
        const end = dayjs(weekData.endDate);
        if (weekType === "current" && now.isAfter(start) && now.isBefore(end)) {
          setSelectedDate(now);
        } else {
          setSelectedDate(start);
        }
      }
    }
  }, [weekType, weekData, getReservations]);

  const handleDateSelect = useCallback((d: dayjs.Dayjs) => {
    setSelectedDate(d);
  }, []);

  const filteredReservations = reservations.filter(
    (r) =>
      selectedDate &&
      dayjs(r.startTime).format("YYYY-MM-DD") === selectedDate.format("YYYY-MM-DD")
  );

  return {
    weekData,
    loading: weekLoading || resLoading,
    reservations: filteredReservations,
    allReservations: reservations,
    selectedDate: selectedDate || dayjs(),
    handleDateSelect,
    refreshReservations: () =>
      weekData && getReservations(weekData.id.toString()),
  };
}

export function useReservationFlow({
  type,
  onSuccess,
}: {
  type: "INSTANT" | "PRE";
  onSuccess?: () => void;
}) {
  const { loginTeam } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<{
    startTime: string;
  } | null>(null);

  const initiateReservation = (startTime: string) => {
    setPendingReservation({ startTime });
    setIsAuthModalOpen(true);
  };

  const handleAuthSubmit = async (name: string, password: string) => {
    if (!pendingReservation) return;
    try {
      const { access_token, isNewTeam } = await authApi.verify({
        name,
        password,
        autoRegister: true,
      });
      loginTeam(access_token, name, password);
      if (isNewTeam) {
        alert("팀 등록이 완료되었습니다!");
      }
      if (type === "PRE") {
        await reservationApi.createPre({ startTime: pendingReservation.startTime });
        alert(`${name} 팀의 사전 예약 신청이 완료되었습니다.`);
      } else {
        await reservationApi.createInstant({
          startTime: pendingReservation.startTime,
        });
        alert(`${name} 팀의 즉시 예약이 확정되었습니다.`);
      }
      setIsAuthModalOpen(false);
      setPendingReservation(null);
      onSuccess?.();
    } catch (err: unknown) {
      console.error(err);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const message =
        axiosErr.response?.data?.message || "예약 처리에 실패했습니다.";
      alert(`오류: ${message}`);
    }
  };

  const closeModal = () => {
    setIsAuthModalOpen(false);
    setPendingReservation(null);
  };

  return {
    isAuthModalOpen,
    setIsAuthModalOpen,
    initiateReservation,
    handleAuthSubmit,
    closeModal,
    pendingReservation,
  };
}

export function useTeamManagement() {
  const {
    data: myTeam,
    loading,
    error,
    execute: fetchMyTeam,
  } = useAsyncAction(teamApi.getMe);
  const { execute: updateNameExec } = useAsyncAction(teamApi.updateName);
  const { execute: updatePasswordExec } = useAsyncAction(teamApi.updatePassword);
  const { execute: deleteMeExec } = useAsyncAction(teamApi.deleteMe);

  return {
    myTeam: myTeam as Team | null,
    loading,
    error,
    fetchMyTeam,
    updateTeamName: async (name: string) => {
      const updated = await updateNameExec(name);
      await fetchMyTeam();
      return updated;
    },
    updateTeamPassword: async (cur: string, next: string) => {
      await updatePasswordExec(cur, next);
    },
    deleteTeam: async () => {
      await deleteMeExec();
    },
  };
}

export function getTeamReservationsStatusLabel(res: Reservation) {
  return res.status;
}
