import { Trophy } from "@phosphor-icons/react";
import { Badge } from "../../../components/ui/Badge";
import dayjs from "../../../lib/dayjs";
import { GoldenTimeSlot } from "../types";

export function GoldenTimePanel({
  goldenTimes,
  maxCount,
  highlightedSlotKey,
  onSelectSlot,
  onInspectSlot,
}: {
  goldenTimes: GoldenTimeSlot[];
  maxCount: number;
  highlightedSlotKey: string | null;
  onSelectSlot: (slotKey: string) => void;
  onInspectSlot: (slot: GoldenTimeSlot) => void;
}) {
  const topSlots = goldenTimes.slice(0, 8);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={18} weight="fill" className="text-brand-red" />
          <h3 className="text-sm font-bold text-text-main">
            골든타임 순위{" "}
            <span className="text-text-sub font-normal">
              (최대 {maxCount}명)
            </span>
          </h3>
        </div>
        <span className="text-[11px] text-text-muted">클릭 시 상세 보기</span>
      </div>

      {topSlots.length === 0 ? (
        <div className="text-center py-6 text-xs text-text-sub bg-bg-main/40 rounded-xl border border-dashed border-white/5">
          아직 등록된 가능 시간이 없습니다.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {topSlots.map((item, idx) => {
            const isHighlighted = highlightedSlotKey === item.slotKey;
            const d = dayjs(item.date);
            return (
              <button
                key={item.slotKey}
                type="button"
                onMouseEnter={() => onSelectSlot(item.slotKey)}
                onClick={() => onInspectSlot(item)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isHighlighted
                    ? "bg-brand-red/15 border-brand-red/50"
                    : "bg-bg-main/50 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        item.isMax ? "text-brand-red" : "text-text-sub"
                      }`}
                    >
                      {idx + 1}위
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {d.format("M/D(ddd)")}
                    </span>
                    <span className="text-xs font-mono text-text-sub">
                      {item.time}~{item.endTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {item.availableNames.join(", ")}
                  </p>
                </div>

                <Badge variant={item.isMax ? "brand" : "default"} className="shrink-0">
                  {item.count}/{item.totalParticipants}명
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
