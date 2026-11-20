import dayjs from "../lib/dayjs";
import {
  Reservation,
  ReservationStatus,
  SystemSettings,
  Team,
  Week,
} from "../types/taurus";

const STORAGE_KEY = "taurus_local_mock_db_v1";

interface StoredTeam extends Team {
  password: string;
}

interface MockDatabase {
  weeks: Week[];
  teams: StoredTeam[];
  reservations: Reservation[];
  settings: SystemSettings;
}

function getIsoWeekNumber(d: dayjs.Dayjs): number {
  const startOfYear = d.startOf("year");
  const diffDays = d.diff(startOfYear, "day");
  return Math.max(1, Math.ceil((diffDays + startOfYear.day() + 1) / 7));
}

function buildWeekDisplayName(sunday: dayjs.Dayjs): string {
  const mid = sunday.add(3, "day");
  const weekOfMonth = Math.ceil(mid.date() / 7);
  return `${mid.month() + 1}월 ${weekOfMonth}주차`;
}

function createInitialDb(): MockDatabase {
  const now = dayjs();
  const currentSunday = now.startOf("day").subtract(now.day(), "day");
  const nextSunday = currentSunday.add(7, "day");
  const prevSunday = currentSunday.subtract(7, "day");
  const thirdSunday = currentSunday.add(14, "day");

  const currentWeekNum = getIsoWeekNumber(currentSunday);

  const weeks: Week[] = [
    {
      id: currentWeekNum - 1,
      startDate: prevSunday.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endDate: prevSunday.add(6, "day").endOf("day").format("YYYY-MM-DDTHH:mm:ss+09:00"),
      status: "CLOSED",
      weekNumber: currentWeekNum - 1,
      year: prevSunday.year(),
      displayName: buildWeekDisplayName(prevSunday),
    },
    {
      id: currentWeekNum,
      startDate: currentSunday.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endDate: currentSunday.add(6, "day").endOf("day").format("YYYY-MM-DDTHH:mm:ss+09:00"),
      status: "OPEN",
      weekNumber: currentWeekNum,
      year: currentSunday.year(),
      displayName: buildWeekDisplayName(currentSunday),
    },
    {
      id: currentWeekNum + 1,
      startDate: nextSunday.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endDate: nextSunday.add(6, "day").endOf("day").format("YYYY-MM-DDTHH:mm:ss+09:00"),
      status: "UPCOMING",
      weekNumber: currentWeekNum + 1,
      year: nextSunday.year(),
      displayName: buildWeekDisplayName(nextSunday),
    },
    {
      id: currentWeekNum + 2,
      startDate: thirdSunday.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endDate: thirdSunday.add(6, "day").endOf("day").format("YYYY-MM-DDTHH:mm:ss+09:00"),
      status: "UPCOMING",
      weekNumber: currentWeekNum + 2,
      year: thirdSunday.year(),
      displayName: buildWeekDisplayName(thirdSunday),
    },
  ];

  const teams: StoredTeam[] = [
    {
      id: "team-taurus",
      name: "토러스",
      password: "1234",
      createdAt: now.subtract(12, "day").toISOString(),
    },
    {
      id: "team-broccoli",
      name: "브로콜리",
      password: "1234",
      createdAt: now.subtract(10, "day").toISOString(),
    },
    {
      id: "team-loveholic",
      name: "Loveholic",
      password: "1234",
      createdAt: now.subtract(8, "day").toISOString(),
    },
    {
      id: "team-chronostasis",
      name: "크로노스타시스",
      password: "1234",
      createdAt: now.subtract(5, "day").toISOString(),
    },
  ];

  const slotIso = (base: dayjs.Dayjs, dayOffset: number, hour: number) => {
    const start = base.add(dayOffset, "day").hour(hour).minute(0).second(0);
    const end = start.add(50, "minute");
    return {
      startTime: start.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endTime: end.format("YYYY-MM-DDTHH:mm:ss+09:00"),
    };
  };

  const todayOffset = Math.min(6, Math.max(0, now.day()));

  const reservations: Reservation[] = [
    {
      id: "res-demo-1",
      ...slotIso(currentSunday, 1, 15),
      status: ReservationStatus.CONFIRMED_ADMIN,
      type: "ADMIN",
      teamId: null,
      teamName: "관리자",
      weekId: currentWeekNum,
      createdAt: now.subtract(5, "day").toISOString(),
      description: "레슨",
    },
    {
      id: "res-demo-2",
      ...slotIso(currentSunday, todayOffset, 16),
      status: ReservationStatus.CONFIRMED_ADMIN,
      type: "ADMIN",
      teamId: null,
      teamName: "관리자",
      weekId: currentWeekNum,
      createdAt: now.subtract(4, "day").toISOString(),
      description: "레슨",
    },
    {
      id: "res-demo-3",
      ...slotIso(currentSunday, todayOffset, 18),
      status: ReservationStatus.CONFIRMED,
      type: "INSTANT",
      teamId: "team-broccoli",
      teamName: "브로콜리",
      weekId: currentWeekNum,
      createdAt: now.subtract(1, "day").toISOString(),
      description: null,
    },
    {
      id: "res-demo-4",
      ...slotIso(currentSunday, todayOffset, 19),
      status: ReservationStatus.CONFIRMED,
      type: "INSTANT",
      teamId: "team-loveholic",
      teamName: "Loveholic",
      weekId: currentWeekNum,
      createdAt: now.subtract(1, "day").toISOString(),
      description: null,
    },
    {
      id: "res-demo-5",
      ...slotIso(currentSunday, todayOffset, 21),
      status: ReservationStatus.CONFIRMED,
      type: "INSTANT",
      teamId: "team-chronostasis",
      teamName: "크로노스타시스",
      weekId: currentWeekNum,
      createdAt: now.subtract(1, "day").toISOString(),
      description: null,
    },
    {
      id: "res-demo-6",
      ...slotIso(currentSunday, Math.min(6, todayOffset + 1), 18),
      status: ReservationStatus.CONFIRMED_ADMIN,
      type: "ADMIN",
      teamId: null,
      teamName: "관리자",
      weekId: currentWeekNum,
      createdAt: now.subtract(2, "day").toISOString(),
      description: "외부대여",
    },
    {
      id: "res-demo-pre-1",
      ...slotIso(nextSunday, 2, 19),
      status: ReservationStatus.PENDING,
      type: "PRE",
      teamId: "team-broccoli",
      teamName: "브로콜리",
      weekId: currentWeekNum + 1,
      createdAt: now.subtract(3, "hour").toISOString(),
      description: null,
    },
  ];

  return {
    weeks,
    teams,
    reservations,
    settings: {
      maxSlotsPerWeek: 4,
      maxSlotsPerDay: 2,
    },
  };
}

function loadDb(): MockDatabase {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as MockDatabase;
  } catch {
    const initial = createInitialDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveDb(db: MockDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function findWeekForTime(db: MockDatabase, isoTime: string): Week {
  const target = dayjs(isoTime);
  const existing = db.weeks.find(
    (w) =>
      (target.isSame(w.startDate, "day") || target.isAfter(w.startDate)) &&
      (target.isSame(w.endDate, "day") || target.isBefore(w.endDate))
  );
  if (existing) return existing;

  const sunday = target.startOf("day").subtract(target.day(), "day");
  const saturdayEnd = sunday.add(6, "day").endOf("day");
  const weekNum = getIsoWeekNumber(sunday);
  const maxId = db.weeks.reduce((acc, w) => Math.max(acc, w.id), 0);
  const created: Week = {
    id: Math.max(maxId + 1, weekNum),
    startDate: sunday.format("YYYY-MM-DDTHH:mm:ss+09:00"),
    endDate: saturdayEnd.format("YYYY-MM-DDTHH:mm:ss+09:00"),
    status: sunday.isBefore(dayjs().startOf("day")) ? "CLOSED" : "UPCOMING",
    weekNumber: weekNum,
    year: sunday.year(),
    displayName: buildWeekDisplayName(sunday),
  };
  db.weeks.push(created);
  db.weeks.sort(
    (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()
  );
  return created;
}

export const mockTaurusStore = {
  getWeeks(): Week[] {
    return loadDb().weeks;
  },

  getMainWeek(): { main: Week; next: Week | null } {
    const db = loadDb();
    const main = db.weeks.find((w) => w.status === "OPEN") || db.weeks[0];
    const next = db.weeks.find((w) => w.weekNumber === main.weekNumber + 1) || null;
    return { main, next };
  },

  getReservationsByWeek(weekIdOrNum: number) {
    const db = loadDb();
    const week =
      db.weeks.find((w) => w.id === weekIdOrNum || w.weekNumber === weekIdOrNum) ||
      null;
    const targetWeekId = week ? week.id : weekIdOrNum;
    const active = db.reservations.filter(
      (r) => r.weekId === targetWeekId && r.status !== ReservationStatus.CANCELLED
    );
    return {
      confirmed: active.filter(
        (r) =>
          r.status === ReservationStatus.CONFIRMED ||
          r.status === ReservationStatus.CONFIRMED_ADMIN
      ),
      pending: active.filter((r) => r.status === ReservationStatus.PENDING),
    };
  },

  getAllActiveReservations(): Reservation[] {
    const db = loadDb();
    return db.reservations.filter((r) => r.status !== ReservationStatus.CANCELLED);
  },

  verifyTeam(name: string, password: string, autoRegister = false) {
    const db = loadDb();
    const existing = db.teams.find((t) => t.name === name);
    if (existing) {
      if (existing.password !== password) {
        throw new Error("팀 비밀번호가 일치하지 않습니다.");
      }
      return { access_token: `mock-team:${existing.id}`, isNewTeam: false };
    }
    if (!autoRegister) {
      throw new Error("존재하지 않는 팀입니다.");
    }
    const newTeam: StoredTeam = {
      id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      password,
      createdAt: new Date().toISOString(),
    };
    db.teams.push(newTeam);
    saveDb(db);
    return { access_token: `mock-team:${newTeam.id}`, isNewTeam: true };
  },

  verifyAdmin(password: string) {
    // Allow "admin" or "taurus" in local demo mode
    if (password !== "admin" && password !== "taurus" && password !== "1987") {
      throw new Error("관리자 비밀번호가 올바르지 않습니다. (데모 비밀번호: admin)");
    }
    return { access_token: "mock-admin-token" };
  },

  createReservation(
    teamToken: string | null,
    startTime: string,
    type: "INSTANT" | "PRE"
  ): Reservation {
    const db = loadDb();
    const teamId = teamToken?.replace("mock-team:", "");
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) {
      throw new Error("팀 인증이 필요합니다.");
    }
    const start = dayjs(startTime);
    const end = start.add(50, "minute");
    const slotKey = start.format("YYYY-MM-DD HH:mm");
    const week = findWeekForTime(db, startTime);

    const existingConfirmed = db.reservations.find(
      (r) =>
        dayjs(r.startTime).format("YYYY-MM-DD HH:mm") === slotKey &&
        (r.status === ReservationStatus.CONFIRMED ||
          r.status === ReservationStatus.CONFIRMED_ADMIN)
    );
    if (existingConfirmed) {
      throw new Error("이미 예약이 확정된 시간대입니다.");
    }

    if (type === "PRE") {
      const alreadyPending = db.reservations.find(
        (r) =>
          r.teamId === team.id &&
          dayjs(r.startTime).format("YYYY-MM-DD HH:mm") === slotKey &&
          r.status === ReservationStatus.PENDING
      );
      if (alreadyPending) {
        throw new Error("이미 해당 시간대에 사전 예약 대기 중입니다.");
      }
    }

    const created: Reservation = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: start.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endTime: end.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      status:
        type === "INSTANT"
          ? ReservationStatus.CONFIRMED
          : ReservationStatus.PENDING,
      type,
      teamId: team.id,
      teamName: team.name,
      weekId: week.id,
      createdAt: new Date().toISOString(),
      description: null,
    };

    db.reservations.push(created);
    saveDb(db);
    return created;
  },

  getMyReservations(teamToken: string | null): Reservation[] {
    const db = loadDb();
    const teamId = teamToken?.replace("mock-team:", "");
    return db.reservations.filter((r) => r.teamId === teamId);
  },

  cancelReservation(id: string) {
    const db = loadDb();
    const target = db.reservations.find((r) => r.id === id);
    if (target) {
      target.status = ReservationStatus.CANCELLED;
      saveDb(db);
    }
  },

  getMe(teamToken: string | null): Team {
    const db = loadDb();
    const teamId = teamToken?.replace("mock-team:", "");
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) {
      throw new Error("팀 정보를 찾을 수 없습니다.");
    }
    return { id: team.id, name: team.name, createdAt: team.createdAt };
  },

  updateTeamName(teamToken: string | null, name: string): Team {
    const db = loadDb();
    const teamId = teamToken?.replace("mock-team:", "");
    if (db.teams.some((t) => t.name === name && t.id !== teamId)) {
      throw new Error("이미 사용 중인 팀 이름입니다.");
    }
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("팀 정보를 찾을 수 없습니다.");
    team.name = name;
    db.reservations.forEach((r) => {
      if (r.teamId === team.id) r.teamName = name;
    });
    saveDb(db);
    return { id: team.id, name: team.name, createdAt: team.createdAt };
  },

  updateTeamPassword(
    teamToken: string | null,
    currentPassword: string,
    newPassword: string
  ) {
    const db = loadDb();
    const teamId = teamToken?.replace("mock-team:", "");
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("팀 정보를 찾을 수 없습니다.");
    if (team.password !== currentPassword) {
      throw new Error("현재 비밀번호가 일치하지 않습니다.");
    }
    team.password = newPassword;
    saveDb(db);
  },

  deleteTeam(idOrToken: string, isToken = false) {
    const db = loadDb();
    const targetId = isToken ? idOrToken.replace("mock-team:", "") : idOrToken;
    db.teams = db.teams.filter((t) => t.id !== targetId);
    db.reservations = db.reservations.filter((r) => r.teamId !== targetId);
    saveDb(db);
  },

  getTeams(search?: string): Team[] {
    const db = loadDb();
    return db.teams
      .filter((t) =>
        search ? t.name.toLowerCase().includes(search.toLowerCase()) : true
      )
      .map(({ id, name, createdAt }) => ({ id, name, createdAt }));
  },

  adminCreateReservation(startTime: string, description: string): Reservation {
    const db = loadDb();
    const start = dayjs(startTime);
    const end = start.add(50, "minute");
    const slotKey = start.format("YYYY-MM-DD HH:mm");
    const week = findWeekForTime(db, startTime);

    db.reservations.forEach((r) => {
      if (
        dayjs(r.startTime).format("YYYY-MM-DD HH:mm") === slotKey &&
        r.status !== ReservationStatus.CANCELLED
      ) {
        r.status = ReservationStatus.VOID;
      }
    });

    const created: Reservation = {
      id: `res-admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: start.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      endTime: end.format("YYYY-MM-DDTHH:mm:ss+09:00"),
      status: ReservationStatus.CONFIRMED_ADMIN,
      type: "ADMIN",
      teamId: null,
      teamName: "관리자",
      weekId: week.id,
      createdAt: new Date().toISOString(),
      description,
    };

    db.reservations.push(created);
    saveDb(db);

    // Clear existing participant selections on any local timetables overlapping this admin reservation
    try {
      const rawTimetables = localStorage.getItem("taurus_timetables_v1");
      if (rawTimetables) {
        const timetables = JSON.parse(rawTimetables) as Array<{
          dates: string[];
          intervalMinutes: 30 | 60;
          participants: Array<{
            availableSlots: string[];
            updatedAt: string;
          }>;
        }>;
        const dateStr = start.format("YYYY-MM-DD");
        const hh = String(start.hour()).padStart(2, "0");
        let modified = false;
        for (const table of timetables) {
          if (!table.dates.includes(dateStr)) continue;
          const blockedKeys = new Set(
            table.intervalMinutes === 30
              ? [`${dateStr}|${hh}:00`, `${dateStr}|${hh}:30`]
              : [`${dateStr}|${hh}:00`]
          );
          for (const participant of table.participants || []) {
            const filtered = participant.availableSlots.filter(
              (k) => !blockedKeys.has(k)
            );
            if (filtered.length !== participant.availableSlots.length) {
              participant.availableSlots = filtered;
              participant.updatedAt = new Date().toISOString();
              modified = true;
            }
          }
        }
        if (modified) {
          localStorage.setItem("taurus_timetables_v1", JSON.stringify(timetables));
        }
      }
    } catch {
      // Ignore malformed localStorage timetable payload
    }

    return created;
  },

  getReservationsByTeam(teamId: string): Reservation[] {
    const db = loadDb();
    return db.reservations.filter((r) => r.teamId === teamId);
  },

  getSettings(): SystemSettings {
    return loadDb().settings;
  },

  updateSettings(settings: SystemSettings): SystemSettings {
    const db = loadDb();
    db.settings = settings;
    saveDb(db);
    return db.settings;
  },
};
