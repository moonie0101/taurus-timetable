import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReservationSection } from "../components/reservation/ReservationComponents";
import { InlineAlert } from "../components/ui/InlineAlert";
import { PageContainer, PageHeader } from "../components/ui/Typography";
import { useAuth } from "../context/AuthContext";
import { useReservationFlow, useWeekSchedule } from "../hooks/useTaurusHooks";
import dayjs from "../lib/dayjs";

export function InstantReservationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const { teamName, teamPassword } = useAuth();
  const {
    weekData,
    loading,
    reservations,
    allReservations,
    selectedDate,
    handleDateSelect,
    refreshReservations,
  } = useWeekSchedule("current");

  const {
    isAuthModalOpen,
    initiateReservation,
    handleAuthSubmit,
    closeModal,
    pendingReservation,
  } = useReservationFlow({
    type: "INSTANT",
    onSuccess: refreshReservations,
  });

  // Support optional deep-linking from Timetable Golden Time ("?date=YYYY-MM-DD&time=HH:mm")
  useEffect(() => {
    const qDate = searchParams.get("date");
    const qTime = searchParams.get("time");
    if (qDate && weekData) {
      const target = dayjs(qDate);
      if (
        !target.isBefore(dayjs(weekData.startDate), "day") &&
        !target.isAfter(dayjs(weekData.endDate), "day")
      ) {
        handleDateSelect(target);
        if (qTime) {
          const [hh, mm] = qTime.split(":").map(Number);
          const slotDate = target.hour(hh).minute(mm || 0);
          if (!slotDate.isBefore(dayjs())) {
            setDeepLinkNotice(null);
            initiateReservation(slotDate.format("YYYY-MM-DD HH:mm"));
          } else {
            setDeepLinkNotice(
              `선택하신 ${target.format("M/D(ddd)")} ${qTime} 시간대는 이미 지나 예약할 수 없습니다.`
            );
          }
        }
      } else {
        setDeepLinkNotice(
          `선택하신 날짜(${target.format("M/D(ddd)")})는 이번 주 바로 예약 범위가 아닙니다. 다음 주 일정이라면 '미리 예약'을 이용해 주세요.`
        );
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, weekData]);

  const handleTimeSlotClick = (timeStr: string) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    const formatted = dayjs(selectedDate)
      .hour(hour)
      .minute(minute)
      .format("YYYY-MM-DD HH:mm");
    initiateReservation(formatted);
  };

  const selectedTime = pendingReservation
    ? dayjs(pendingReservation.startTime).format("HH:mm")
    : null;

  return (
    <PageContainer>
      <PageHeader title="바로 예약" />
      <InlineAlert title="바로 예약 페이지 이용 시 필독 사항">
        <div className="flex-col space-y-1 text-white/85">
          <p>
            • 바로 예약은{" "}
            <span className="font-semibold text-white">이번 주</span> 합주 예약을{" "}
            <span className="font-semibold text-white">즉시 확정</span>합니다.
          </p>
          <p>
            • <span className="font-semibold text-white">매주 일요일 00시</span>에
            주차가 전환 되며,{" "}
            <span className="font-semibold text-white">선착순</span>으로
            진행됩니다.
          </p>
        </div>
      </InlineAlert>

      {deepLinkNotice && (
        <InlineAlert variant="warn" title="날짜 안내">
          {deepLinkNotice}
        </InlineAlert>
      )}

      <ReservationSection
        weekData={weekData}
        loading={loading}
        reservations={reservations}
        allWeekReservations={allReservations}
        mode="INSTANT"
        onRefresh={refreshReservations}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onTimeSlotClick={handleTimeSlotClick}
        banner={{
          label: "This Week",
          weeks: weekData?.weekNumber || 0,
          startDate: weekData?.startDate || "",
          endDate: weekData?.endDate || "",
          theme: "red",
        }}
        modalProps={{
          isOpen: isAuthModalOpen,
          onClose: closeModal,
          selectedTime,
          onSubmit: handleAuthSubmit,
          teamName,
          teamPassword,
          showWaitlist: false,
          existingReservations: reservations,
        }}
      />
    </PageContainer>
  );
}
