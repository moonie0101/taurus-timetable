import { CalendarBlank, Clock, Sparkle, Warning } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { ROUTES } from "../../../constants/routes";
import dayjs from "../../../lib/dayjs";
import { GoldenTimeSlot, RoomSlotOverlay } from "../types";

export function SlotDetailModal({
  slot,
  roomOverlay,
  onClose,
}: {
  slot: GoldenTimeSlot | null;
  roomOverlay?: RoomSlotOverlay;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  if (!slot) return null;

  const dateObj = dayjs(slot.date);
  const formattedDate = dateObj.format("M월 D일 (ddd)");

  const [hourStr] = slot.time.split(":");
  const hour = Number(hourStr);
  const isRoomHour = hour >= 9 && hour <= 22;

  const handleGoReserve = (mode: "instant" | "pre") => {
    const targetRoute =
      mode === "instant" ? ROUTES.INSTANT_RESERVATION : ROUTES.PRE_RESERVATION;
    const alignedTime = `${hourStr}:00`;
    onClose();
    navigate(`${targetRoute}?date=${slot.date}&time=${alignedTime}`);
  };

  return (
    <Modal isOpen={Boolean(slot)} onClose={onClose} title="시간대 상세 정보">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2 bg-white/5 p-3.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-text-main font-semibold">
              <CalendarBlank size={16} className="text-brand-red" />
              <span>{formattedDate}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-sm text-white font-bold">
              <Clock size={16} className="text-text-sub" />
              <span>
                {slot.time} ~ {slot.endTime}
              </span>
            </div>
          </div>
          {slot.isMax && (
            <Badge variant="brand" className="gap-1 shrink-0">
              <Sparkle size={12} weight="fill" />
              가장 많이 모이는 시간
            </Badge>
          )}
        </div>

        {/* Taurus Room Reservation / Pre-reservation Overlay Alert */}
        {roomOverlay &&
          (roomOverlay.confirmedAdmin ||
            roomOverlay.confirmedTeam ||
            roomOverlay.pendingTeams.length > 0) && (
            <div className="p-3.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                <Warning size={14} weight="fill" />
                <span>이 시간대 토러스 합주실 예약 현황</span>
              </div>
              {roomOverlay.confirmedAdmin && (
                <p className="text-xs text-red-300">
                  • 관리자 지정 점유:{" "}
                  <strong>
                    {roomOverlay.confirmedAdmin.description || "관리자 점유"}
                  </strong>
                </p>
              )}
              {roomOverlay.confirmedTeam && (
                <p className="text-xs text-emerald-300">
                  • 확정된 합주:{" "}
                  <strong>{roomOverlay.confirmedTeam.teamName || "예약됨"}</strong>
                </p>
              )}
              {roomOverlay.pendingTeams.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-yellow-200">
                    • 미리 예약 대기 ({roomOverlay.pendingTeams.length}팀):{" "}
                    <strong>{roomOverlay.pendingTeams.join(", ")}</strong>
                  </p>
                  <p className="text-[11px] text-yellow-300/80">
                    이미 대기 팀이 있는 시간대이므로 추가 미리 예약 시 경합 실패가 발생할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-status-success">
              참여 가능 ({slot.availableNames.length}명)
            </span>
            <span className="text-text-muted">
              전체 {slot.totalParticipants}명 중
            </span>
          </div>
          {slot.availableNames.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {slot.availableNames.map((name) => (
                <Badge key={name} variant="success">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">가능한 인원이 없습니다.</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-text-sub">
            참여 불가 ({slot.unavailableNames.length}명)
          </div>
          {slot.unavailableNames.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {slot.unavailableNames.map((name) => (
                <Badge key={name} variant="default">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-status-success font-medium">
              전원 참여 가능한 골든타임입니다!
            </p>
          )}
        </div>

        {isRoomHour && (
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs text-text-sub">
              이 시간으로 바로 합주실 예약을 진행할 수 있습니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="brand"
                onClick={() => handleGoReserve("instant")}
              >
                바로 예약 연결
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGoReserve("pre")}
              >
                미리 예약 연결
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
