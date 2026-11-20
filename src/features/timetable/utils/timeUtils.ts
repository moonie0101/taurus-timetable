import dayjs from "../../../lib/dayjs";
import { Reservation, ReservationStatus } from "../../../types/taurus";
import {
  GoldenTimeSlot,
  RoomSlotOverlay,
  TimeGranularity,
  Timetable,
} from "../types";

export function makeSlotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

export function parseSlotKey(key: string): { date: string; time: string } {
  const [date, time] = key.split("|");
  return { date, time };
}

export function generateTimeLabels(
  startHour: number,
  endHour: number,
  intervalMinutes: TimeGranularity
): string[] {
  const result: string[] = [];
  const totalStart = startHour * 60;
  const totalEnd = endHour * 60;
  for (let m = totalStart; m < totalEnd; m += intervalMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    result.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return result;
}

export function getEndTimeLabel(
  startTime: string,
  intervalMinutes: TimeGranularity
): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + intervalMinutes;
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export function computeTimetableStats(
  timetable: Timetable,
  extraLockedSlots: string[] = []
): {
  slotMap: Map<string, GoldenTimeSlot>;
  maxCount: number;
  goldenTimes: GoldenTimeSlot[];
} {
  const timeLabels = generateTimeLabels(
    timetable.startHour,
    timetable.endHour,
    timetable.intervalMinutes
  );
  const lockedSet = new Set([...timetable.lockedSlots, ...extraLockedSlots]);
  const allNames = timetable.participants.map((p) => p.name);

  const rawSlots: Omit<GoldenTimeSlot, "isMax">[] = [];
  let maxCount = 0;

  for (const date of timetable.dates) {
    for (const time of timeLabels) {
      const slotKey = makeSlotKey(date, time);
      if (lockedSet.has(slotKey)) continue;

      const availableNames = timetable.participants
        .filter((p) => p.availableSlots.includes(slotKey))
        .map((p) => p.name);
      const unavailableNames = allNames.filter(
        (name) => !availableNames.includes(name)
      );

      if (availableNames.length > maxCount) {
        maxCount = availableNames.length;
      }

      rawSlots.push({
        slotKey,
        date,
        time,
        endTime: getEndTimeLabel(time, timetable.intervalMinutes),
        count: availableNames.length,
        totalParticipants: allNames.length,
        availableNames,
        unavailableNames,
      });
    }
  }

  const slotMap = new Map<string, GoldenTimeSlot>();
  const goldenTimes: GoldenTimeSlot[] = [];

  for (const item of rawSlots) {
    const full: GoldenTimeSlot = {
      ...item,
      isMax: maxCount > 0 && item.count === maxCount,
    };
    slotMap.set(item.slotKey, full);
    if (item.count > 0) {
      goldenTimes.push(full);
    }
  }

  goldenTimes.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.slotKey.localeCompare(b.slotKey);
  });

  return { slotMap, maxCount, goldenTimes };
}

function extractSlotKeysByStatuses(
  reservations: Reservation[],
  statuses: ReservationStatus[],
  dates: string[],
  startHour: number,
  endHour: number,
  intervalMinutes: TimeGranularity
): string[] {
  const dateSet = new Set(dates);
  const statusSet = new Set(statuses);
  const locked = new Set<string>();

  for (const res of reservations) {
    if (!statusSet.has(res.status)) continue;
    const start = dayjs(res.startTime);
    const dateStr = start.format("YYYY-MM-DD");
    if (!dateSet.has(dateStr)) continue;

    const hour = start.hour();
    if (hour < startHour || hour >= endHour) continue;

    if (intervalMinutes === 60) {
      locked.add(makeSlotKey(dateStr, `${String(hour).padStart(2, "0")}:00`));
    } else {
      locked.add(makeSlotKey(dateStr, `${String(hour).padStart(2, "0")}:00`));
      locked.add(makeSlotKey(dateStr, `${String(hour).padStart(2, "0")}:30`));
    }
  }

  return Array.from(locked).sort();
}

export function getAdminLockedSlotsFromReservations(
  reservations: Reservation[],
  dates: string[],
  startHour: number,
  endHour: number,
  intervalMinutes: TimeGranularity
): string[] {
  return extractSlotKeysByStatuses(
    reservations,
    [ReservationStatus.CONFIRMED_ADMIN],
    dates,
    startHour,
    endHour,
    intervalMinutes
  );
}

export function getConfirmedTeamSlotsFromReservations(
  reservations: Reservation[],
  dates: string[],
  startHour: number,
  endHour: number,
  intervalMinutes: TimeGranularity
): string[] {
  return extractSlotKeysByStatuses(
    reservations,
    [ReservationStatus.CONFIRMED],
    dates,
    startHour,
    endHour,
    intervalMinutes
  );
}

export function getLockedSlotsFromReservations(
  reservations: Reservation[],
  dates: string[],
  startHour: number,
  endHour: number,
  intervalMinutes: TimeGranularity
): string[] {
  return extractSlotKeysByStatuses(
    reservations,
    [ReservationStatus.CONFIRMED, ReservationStatus.CONFIRMED_ADMIN],
    dates,
    startHour,
    endHour,
    intervalMinutes
  );
}

export function buildRoomOverlayMap(
  reservations: Reservation[],
  dates: string[],
  startHour: number,
  endHour: number,
  intervalMinutes: TimeGranularity
): Map<string, RoomSlotOverlay> {
  const dateSet = new Set(dates);
  const map = new Map<string, RoomSlotOverlay>();

  const ensureSlot = (slotKey: string): RoomSlotOverlay => {
    let entry = map.get(slotKey);
    if (!entry) {
      entry = { slotKey, pendingTeams: [] };
      map.set(slotKey, entry);
    }
    return entry;
  };

  for (const res of reservations) {
    if (
      res.status === ReservationStatus.CANCELLED ||
      res.status === ReservationStatus.VOID
    ) {
      continue;
    }

    const start = dayjs(res.startTime);
    const dateStr = start.format("YYYY-MM-DD");
    if (!dateSet.has(dateStr)) continue;

    const hour = start.hour();
    if (hour < startHour || hour >= endHour) continue;

    const targetKeys =
      intervalMinutes === 60
        ? [makeSlotKey(dateStr, `${String(hour).padStart(2, "0")}:00`)]
        : [
            makeSlotKey(dateStr, `${String(hour).padStart(2, "0")}:00`),
            makeSlotKey(dateStr, `${String(hour).padStart(2, "0")}:30`),
          ];

    for (const key of targetKeys) {
      const entry = ensureSlot(key);
      if (res.status === ReservationStatus.CONFIRMED_ADMIN) {
        entry.confirmedAdmin = { description: res.description };
      } else if (res.status === ReservationStatus.CONFIRMED) {
        entry.confirmedTeam = { teamName: res.teamName };
      } else if (res.status === ReservationStatus.PENDING) {
        const tName = res.teamName || "대기팀";
        if (!entry.pendingTeams.includes(tName)) {
          entry.pendingTeams.push(tName);
        }
      }
    }
  }

  return map;
}

export function paginateDates(dates: string[], pageSize: number): string[][] {
  if (dates.length === 0) return [[]];
  const pages: string[][] = [];
  for (let i = 0; i < dates.length; i += pageSize) {
    pages.push(dates.slice(i, i + pageSize));
  }
  return pages;
}
