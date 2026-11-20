export type TimeGranularity = 30 | 60;

export interface TimetableParticipant {
  id: string;
  name: string;
  /** Stored only in mock mode; omitted by remote backend responses */
  password?: string;
  /** Format: "YYYY-MM-DD|HH:mm" */
  availableSlots: string[];
  updatedAt: string;
}

export interface Timetable {
  id: string;
  title: string;
  /** Sorted "YYYY-MM-DD" strings */
  dates: string[];
  /** Start hour in 0..23 */
  startHour: number;
  /** End hour in 1..24 */
  endHour: number;
  intervalMinutes: TimeGranularity;
  /** Slot keys ("YYYY-MM-DD|HH:mm") blocked by creator / room schedule */
  lockedSlots: string[];
  participants: TimetableParticipant[];
  createdAt: string;
}

export interface CreateTimetablePayload {
  title: string;
  dates: string[];
  startHour: number;
  endHour: number;
  intervalMinutes: TimeGranularity;
  lockedSlots: string[];
}

export interface UpsertParticipantPayload {
  name: string;
  password: string;
  availableSlots: string[];
}

export interface GoldenTimeSlot {
  slotKey: string;
  date: string;
  time: string;
  endTime: string;
  count: number;
  totalParticipants: number;
  availableNames: string[];
  unavailableNames: string[];
  isMax: boolean;
}

export interface RoomSlotOverlay {
  slotKey: string;
  confirmedAdmin?: { description: string | null };
  confirmedTeam?: { teamName: string | null };
  pendingTeams: string[];
}
