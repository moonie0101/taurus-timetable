import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
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
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h3 className="text-sm font-bold text-text-main">골든타임 순위</h3>
        <span className="text-xs text-text-sub tabular-nums">
          최대 {maxCount}명
        </span>
      </div>

      {topSlots.length === 0 ? (
        <div className="text-center py-8 px-4 text-xs text-text-sub">
          아직 등록된 가능 시간이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-64 overflow-y-auto custom-scrollbar">
          {topSlots.map((item, idx) => {
            const isHighlighted = highlightedSlotKey === item.slotKey;
            const d = dayjs(item.date);
            return (
              <button
                key={item.slotKey}
                type="button"
                onMouseEnter={() => onSelectSlot(item.slotKey)}
                onClick={() => onInspectSlot(item)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                  isHighlighted
                    ? "bg-brand-red/12"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 tabular-nums">
                    <span
                      className={`text-xs font-mono font-bold w-6 shrink-0 ${
                        item.isMax ? "text-brand-red" : "text-text-muted"
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
                  <p className="text-[11px] text-text-muted truncate mt-0.5 pl-8">
                    {item.availableNames.join(", ")}
                  </p>
                </div>

                <Badge
                  variant={item.isMax ? "brand" : "default"}
                  className="shrink-0 tabular-nums"
                >
                  {item.count}/{item.totalParticipants}명
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
