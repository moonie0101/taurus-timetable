import { API_MODE, apiClient } from "../../../api/taurusApi";
import dayjs from "../../../lib/dayjs";
import {
  CreateTimetablePayload,
  Timetable,
  UpsertParticipantPayload,
} from "../types";
import { makeSlotKey } from "../utils/timeUtils";

const TIMETABLE_STORAGE_KEY = "taurus_timetables_v1";

function createSeedTimetable(): Timetable {
  const now = dayjs();
  const base = now.startOf("day");
  const dates = Array.from({ length: 5 }, (_, i) =>
    base.add(i, "day").format("YYYY-MM-DD")
  );

  const slotsFor = (dayIndexes: number[], hours: number[]) => {
    const res: string[] = [];
    for (const dIdx of dayIndexes) {
      for (const h of hours) {
        const hh = String(h).padStart(2, "0");
        res.push(makeSlotKey(dates[dIdx], `${hh}:00`));
      }
    }
    return res;
  };

  return {
    id: "taurus-demo",
    title: "가을 정기공연 합주 시간 조율",
    dates,
    startHour: 14,
    endHour: 23,
    intervalMinutes: 60,
    lockedSlots: [makeSlotKey(dates[0], "16:00")],
    createdAt: now.subtract(1, "day").toISOString(),
    participants: [
      {
        id: "p-1",
        name: "김영훈",
        password: "1234",
        availableSlots: [
          ...slotsFor([0, 1, 2], [18, 19, 20, 21]),
          ...slotsFor([3, 4], [19, 20]),
        ],
        updatedAt: now.subtract(5, "hour").toISOString(),
      },
      {
        id: "p-2",
        name: "정기훈",
        password: "1234",
        availableSlots: [
          ...slotsFor([0, 1], [19, 20, 21, 22]),
          ...slotsFor([2, 3], [18, 19, 20]),
        ],
        updatedAt: now.subtract(4, "hour").toISOString(),
      },
      {
        id: "p-3",
        name: "김두태",
        password: "1234",
        availableSlots: [
          ...slotsFor([1, 2, 4], [19, 20, 21]),
          ...slotsFor([0], [19, 20]),
        ],
        updatedAt: now.subtract(2, "hour").toISOString(),
      },
      {
        id: "p-4",
        name: "김성민",
        password: "1234",
        availableSlots: [
          ...slotsFor([0, 1, 2], [19, 20]),
          ...slotsFor([3], [20, 21]),
        ],
        updatedAt: now.subtract(1, "hour").toISOString(),
      },
    ],
  };
}

function loadTimetables(): Timetable[] {
  const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
  if (!raw) {
    const seed = [createSeedTimetable()];
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as Timetable[];
    return parsed.length > 0 ? parsed : [createSeedTimetable()];
  } catch {
    const seed = [createSeedTimetable()];
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function saveTimetables(list: Timetable[]) {
  localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(list));
}

function generateShortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

async function callRemote<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const serverMsg = (
      err as { response?: { data?: { message?: string } } }
    )?.response?.data?.message;
    if (serverMsg) {
      throw new Error(serverMsg);
    }
    throw err;
  }
}

/**
 * Handover-ready Timetable API Layer.
 * - Mock mode persists in LocalStorage.
 * - Remote mode calls REST endpoints on the Taurus backend (see BACKEND_INTEGRATION.md).
 */
export const timetableApi = {
  async listRecent(): Promise<Timetable[]> {
    if (API_MODE === "mock") {
      return loadTimetables().sort(
        (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
      );
    }
    return callRemote(() => apiClient.get("/timetables"));
  },

  async getById(id: string): Promise<Timetable | null> {
    if (API_MODE === "mock") {
      return loadTimetables().find((t) => t.id === id) || null;
    }
    return callRemote(() => apiClient.get(`/timetables/${id}`));
  },

  async create(payload: CreateTimetablePayload): Promise<Timetable> {
    if (API_MODE === "mock") {
      const list = loadTimetables();
      const created: Timetable = {
        id: generateShortId(),
        title: payload.title.trim() || "새 합주 시간 조율",
        dates: [...payload.dates].sort(),
        startHour: payload.startHour,
        endHour: payload.endHour,
        intervalMinutes: payload.intervalMinutes,
        lockedSlots: [...payload.lockedSlots].sort(),
        participants: [],
        createdAt: new Date().toISOString(),
      };
      list.unshift(created);
      saveTimetables(list);
      return created;
    }
    return callRemote(() => apiClient.post("/timetables", payload));
  },

  async verifyParticipant(
    timetableId: string,
    name: string,
    password: string
  ): Promise<{ participant: Timetable["participants"][number] | null; isNew: boolean }> {
    if (API_MODE === "mock") {
      const table = loadTimetables().find((t) => t.id === timetableId);
      if (!table) throw new Error("시간표를 찾을 수 없습니다.");
      const existing = table.participants.find((p) => p.name === name);
      if (existing) {
        if (existing.password !== password) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        return { participant: existing, isNew: false };
      }
      return { participant: null, isNew: true };
    }
    return callRemote(() =>
      apiClient.post(`/timetables/${timetableId}/participants/verify`, {
        name,
        password,
      })
    );
  },

  async upsertParticipant(
    timetableId: string,
    payload: UpsertParticipantPayload
  ): Promise<Timetable> {
    if (API_MODE === "mock") {
      const list = loadTimetables();
      const idx = list.findIndex((t) => t.id === timetableId);
      if (idx === -1) throw new Error("시간표를 찾을 수 없습니다.");

      const table = list[idx];
      const existingIdx = table.participants.findIndex(
        (p) => p.name === payload.name
      );

      if (existingIdx >= 0) {
        if (table.participants[existingIdx].password !== payload.password) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        table.participants[existingIdx] = {
          ...table.participants[existingIdx],
          availableSlots: [...payload.availableSlots],
          updatedAt: new Date().toISOString(),
        };
      } else {
        table.participants.push({
          id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: payload.name,
          password: payload.password,
          availableSlots: [...payload.availableSlots],
          updatedAt: new Date().toISOString(),
        });
      }

      list[idx] = { ...table };
      saveTimetables(list);
      return list[idx];
    }
    return callRemote(() =>
      apiClient.post(`/timetables/${timetableId}/entries`, payload)
    );
  },

  async deleteParticipant(
    timetableId: string,
    name: string,
    password: string
  ): Promise<Timetable> {
    if (API_MODE === "mock") {
      const list = loadTimetables();
      const idx = list.findIndex((t) => t.id === timetableId);
      if (idx === -1) throw new Error("시간표를 찾을 수 없습니다.");

      const table = list[idx];
      const target = table.participants.find((p) => p.name === name);
      if (!target) throw new Error("참여자를 찾을 수 없습니다.");
      if (target.password !== password) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      table.participants = table.participants.filter((p) => p.name !== name);
      list[idx] = { ...table };
      saveTimetables(list);
      return list[idx];
    }
    return callRemote(() =>
      apiClient.delete(`/timetables/${timetableId}/entries`, {
        data: { name, password },
      })
    );
  },
};
