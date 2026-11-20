export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CONFIRMED_ADMIN = "CONFIRMED_ADMIN",
  VOID = "VOID",
  CANCELLED = "CANCELLED",
}

export type ReservationType = "INSTANT" | "PRE" | "ADMIN";

export interface Week {
  id: number;
  startDate: string;
  endDate: string;
  status: "CLOSED" | "OPEN" | "UPCOMING";
  weekNumber: number;
  year: number;
  displayName: string;
}

export interface Reservation {
  id: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  type: ReservationType;
  teamId: string | null;
  teamName: string | null;
  weekId: number;
  createdAt: string;
  description: string | null;
}

export interface WeekReservationsResponse {
  confirmed: Reservation[];
  pending: Reservation[];
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface SystemSettings {
  maxSlotsPerWeek: number;
  maxSlotsPerDay: number;
}
