import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReservationSection } from "../components/reservation/ReservationComponents";
import { InlineAlert } from "../components/ui/InlineAlert";
import { PageContainer, PageHeader } from "../components/ui/Typography";
import { useAuth } from "../context/AuthContext";
import { useReservationFlow, useWeekSchedule } from "../hooks/useTaurusHooks";
import dayjs from "../lib/dayjs";

export function PreReservationPage() {
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
  } = useWeekSchedule("next");

  const {
    isAuthModalOpen,
    initiateReservation,
    handleAuthSubmit,
    closeModal,
    pendingReservation,
  } = useReservationFlow({
    type: "PRE",
    onSuccess: refreshReservations,
  });

  useEffect(() => {
    const qDate = searchParams.get("date");
    const qTime = searchParams.get("time");
    if (qDate && weekData) {
      const target = dayjs(qDate);
      if (
        !target.isBefore(dayjs(weekData.startDate), "day") &&
        !target.isAfter(dayjs(weekData.endDate), "day")
      ) {
        setDeepLinkNotice(null);
        handleDateSelect(target);
        if (qTime) {
          const [hh, mm] = qTime.split(":").map(Number);
          const slotDate = target.hour(hh).minute(mm || 0).second(0).millisecond(0);
          initiateReservation(slotDate.toISOString());
        }
      } else {
        setDeepLinkNotice(
          `선택하신 날짜(${target.format("M/D(ddd)")})는 다음 주 미리 예약 범위가 아닙니다. 이번 주 일정은 '바로 예약'에서, 2주 이후 일정은 해당 주차 오픈 후 신청해 주세요.`
        );
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, weekData]);

  const handleTimeSlotClick = (timeStr: string) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    const iso = dayjs(selectedDate)
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0)
      .toISOString();
    initiateReservation(iso);
  };

  const selectedTime = pendingReservation
    ? dayjs(pendingReservation.startTime).format("HH:mm")
    : null;

  return (
    <PageContainer>
      <PageHeader title="미리 예약" />
      <InlineAlert title="필독 사항">
        <div className="flex-col space-y-1 text-white/85">
          <p>
            • 미리 예약은{" "}
            <span className="font-semibold text-white">다음 주</span> 합주 예약을
            미리 <span className="font-semibold text-white">예약 대기</span>를
            걸어둘 수 있습니다.
          </p>
          <p>
            •{" "}
            <span className="font-semibold text-white">
              예약 성공: 예약 대기 1팀
            </span>
          </p>
          <p>
            •{" "}
            <span className="font-semibold text-white">
              예약 실패: 예약 대기 2팀 이상
            </span>{" "}
            (수강신청 정원이 1명인 장바구니라고 보면 됨)
          </p>
          <p>
            • <span className="font-semibold text-white">매주 일요일 00시</span>{" "}
            주차 전환 시에{" "}
            <span className="font-semibold text-white">
              예약 성공/실패 여부가 확정
            </span>
            됩니다.
          </p>
          <p>
            • <span className="font-semibold text-white">(주의!)</span> 고의로 예약
            실패를 유도하는 행위는 제재 대상이 될 수 있습니다.
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
        mode="PRE"
        onRefresh={refreshReservations}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onTimeSlotClick={handleTimeSlotClick}
        banner={{
          label: "Next Week",
          weeks: weekData?.weekNumber || 0,
          startDate: weekData?.startDate || "",
          endDate: weekData?.endDate || "",
          theme: "yellow",
        }}
        modalProps={{
          isOpen: isAuthModalOpen,
          onClose: closeModal,
          selectedTime,
          onSubmit: handleAuthSubmit,
          teamName,
          teamPassword,
          showWaitlist: true,
          existingReservations: reservations,
        }}
      />
    </PageContainer>
  );
}
