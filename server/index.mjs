import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const PORT = Number(process.env.API_PORT || 3001);

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatKstIso(date) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate()
  )}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(
    d.getUTCSeconds()
  )}+09:00`;
}

function formatYmd(date) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate()
  )}`;
}

function getKstDayStart(offsetDays = 0) {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const utcMidnightOfKstDay = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() + offsetDays,
    0,
    0,
    0
  );
  return new Date(utcMidnightOfKstDay - 9 * 60 * 60 * 1000);
}

function getKstWeekday(date) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).getUTCDay();
}

function getWeekNum(sundayDate) {
  const kstMs = sundayDate.getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((d - yearStart) / 86400000);
  return Math.max(1, Math.ceil((diffDays + yearStart.getUTCDay() + 1) / 7));
}

function buildWeekDisplayName(sundayDate) {
  const mid = new Date(sundayDate.getTime() + 3 * 86400000);
  const kstMs = mid.getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const weekOfMonth = Math.ceil(d.getUTCDate() / 7);
  return `${d.getUTCMonth() + 1}월 ${weekOfMonth}주차`;
}

function makeSeedDb() {
  const todayStart = getKstDayStart(0);
  const todayDow = getKstWeekday(todayStart);
  const currentSunday = new Date(todayStart.getTime() - todayDow * 86400000);
  const prevSunday = new Date(currentSunday.getTime() - 7 * 86400000);
  const nextSunday = new Date(currentSunday.getTime() + 7 * 86400000);
  const thirdSunday = new Date(currentSunday.getTime() + 14 * 86400000);

  const curWeekNum = getWeekNum(currentSunday);

  const makeWeek = (sunday, status, weekNumber) => {
    const end = new Date(sunday.getTime() + 7 * 86400000 - 1000);
    const kstMs = sunday.getTime() + 9 * 60 * 60 * 1000;
    return {
      id: weekNumber,
      startDate: formatKstIso(sunday),
      endDate: formatKstIso(end),
      status,
      weekNumber,
      year: new Date(kstMs).getUTCFullYear(),
      displayName: buildWeekDisplayName(sunday),
    };
  };

  const weeks = [
    makeWeek(prevSunday, "CLOSED", curWeekNum - 1),
    makeWeek(currentSunday, "OPEN", curWeekNum),
    makeWeek(nextSunday, "UPCOMING", curWeekNum + 1),
    makeWeek(thirdSunday, "UPCOMING", curWeekNum + 2),
  ];

  const teams = [
    {
      id: "team-taurus",
      name: "토러스",
      password: "1234",
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: "team-broccoli",
      name: "브로콜리",
      password: "1234",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: "team-loveholic",
      name: "Loveholic",
      password: "1234",
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      id: "team-chronostasis",
      name: "크로노스타시스",
      password: "1234",
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  const slotTimes = (baseSunday, dayOffset, hour) => {
    const start = new Date(
      baseSunday.getTime() + dayOffset * 86400000 + hour * 3600000
    );
    const end = new Date(start.getTime() + 50 * 60000);
    return { startTime: formatKstIso(start), endTime: formatKstIso(end) };
  };

  const todayOffset = Math.min(6, Math.max(0, todayDow));
  const reservations = [
    {
      id: "res-demo-1",
      ...slotTimes(currentSunday, 1, 15),
      status: "CONFIRMED_ADMIN",
      type: "ADMIN",
      teamId: null,
      teamName: "관리자",
      weekId: curWeekNum,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      description: "레슨",
    },
    {
      id: "res-demo-2",
      ...slotTimes(currentSunday, todayOffset, 16),
      status: "CONFIRMED_ADMIN",
      type: "ADMIN",
      teamId: null,
      teamName: "관리자",
      weekId: curWeekNum,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      description: "레슨",
    },
    {
      id: "res-demo-3",
      ...slotTimes(currentSunday, todayOffset, 18),
      status: "CONFIRMED",
      type: "INSTANT",
      teamId: "team-broccoli",
      teamName: "브로콜리",
      weekId: curWeekNum,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      description: null,
    },
    {
      id: "res-demo-4",
      ...slotTimes(currentSunday, todayOffset, 19),
      status: "CONFIRMED",
      type: "INSTANT",
      teamId: "team-loveholic",
      teamName: "Loveholic",
      weekId: curWeekNum,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      description: null,
    },
    {
      id: "res-demo-5",
      ...slotTimes(currentSunday, todayOffset, 21),
      status: "CONFIRMED",
      type: "INSTANT",
      teamId: "team-chronostasis",
      teamName: "크로노스타시스",
      weekId: curWeekNum,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      description: null,
    },
    {
      id: "res-demo-pre-1",
      ...slotTimes(nextSunday, 2, 19),
      status: "PENDING",
      type: "PRE",
      teamId: "team-broccoli",
      teamName: "브로콜리",
      weekId: curWeekNum + 1,
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      description: null,
    },
  ];

  const demoDates = Array.from({ length: 5 }, (_, i) =>
    formatYmd(getKstDayStart(i))
  );
  const slotsFor = (dayIdxs, hours) => {
    const out = [];
    for (const d of dayIdxs) {
      for (const h of hours) {
        out.push(`${demoDates[d]}|${pad2(h)}:00`);
      }
    }
    return out;
  };

  const timetables = [
    {
      id: "taurus-demo",
      title: "가을 정기공연 합주 시간 조율",
      dates: demoDates,
      startHour: 14,
      endHour: 23,
      intervalMinutes: 60,
      lockedSlots: [`${demoDates[0]}|16:00`],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      participants: [
        {
          id: "p-1",
          name: "김영훈",
          password: "1234",
          availableSlots: [
            ...slotsFor([0, 1, 2], [18, 19, 20, 21]),
            ...slotsFor([3, 4], [19, 20]),
          ],
          updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        },
        {
          id: "p-2",
          name: "정기훈",
          password: "1234",
          availableSlots: [
            ...slotsFor([0, 1], [19, 20, 21, 22]),
            ...slotsFor([2, 3], [18, 19, 20]),
          ],
          updatedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        },
        {
          id: "p-3",
          name: "김두태",
          password: "1234",
          availableSlots: [
            ...slotsFor([1, 2, 4], [19, 20, 21]),
            ...slotsFor([0], [19, 20]),
          ],
          updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          id: "p-4",
          name: "김성민",
          password: "1234",
          availableSlots: [
            ...slotsFor([0, 1, 2], [19, 20]),
            ...slotsFor([3], [20, 21]),
          ],
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
  ];

  return {
    weeks,
    teams,
    reservations,
    settings: { maxSlotsPerWeek: 4, maxSlotsPerDay: 2 },
    timetables,
  };
}

function readDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const seed = makeSeedDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function sanitizeTimetable(table) {
  return {
    ...table,
    participants: (table.participants || []).map(({ password: _p, ...rest }) => rest),
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function ok(res, data, status = 200) {
  sendJson(res, status, {
    code: "SUCCESS",
    message: "요청이 성공적으로 처리되었습니다.",
    data,
  });
}

function fail(res, message, status = 400) {
  sendJson(res, status, { code: "ERROR", message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

function findWeekForTime(db, isoTime) {
  const tMs = new Date(isoTime).getTime();
  const existing = db.weeks.find(
    (w) =>
      tMs >= new Date(w.startDate).getTime() &&
      tMs <= new Date(w.endDate).getTime()
  );
  if (existing) return existing;

  // Auto-create upcoming/past week entry so recurring admin reservations across future months work seamlessly
  const kstMs = tMs + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const dow = d.getUTCDay();
  const sundayUtcMs = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - dow,
    0,
    0,
    0
  );
  const sunday = new Date(sundayUtcMs - 9 * 60 * 60 * 1000);
  const end = new Date(sunday.getTime() + 7 * 86400000 - 1000);
  const weekNumber = getWeekNum(sunday);
  const maxId = db.weeks.reduce((acc, w) => Math.max(acc, w.id), 0);
  const kstSunday = new Date(sunday.getTime() + 9 * 60 * 60 * 1000);

  const created = {
    id: maxId + 1,
    startDate: formatKstIso(sunday),
    endDate: formatKstIso(end),
    status: sunday.getTime() < getKstDayStart(0).getTime() ? "CLOSED" : "UPCOMING",
    weekNumber,
    year: kstSunday.getUTCFullYear(),
    displayName: buildWeekDisplayName(sunday),
  };
  db.weeks.push(created);
  db.weeks.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  return created;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = req.method || "GET";

  try {
    const db = readDb();

    // --- WEEKS ---
    if (method === "GET" && pathname === "/weeks/main") {
      const main = db.weeks.find((w) => w.status === "OPEN") || db.weeks[0];
      const next =
        db.weeks.find((w) => w.weekNumber === main.weekNumber + 1) || null;
      return ok(res, { main, next });
    }
    if (method === "GET" && pathname === "/weeks") {
      return ok(res, db.weeks);
    }

    // --- RESERVATIONS ---
    const weekResMatch = pathname.match(/^\/reservations\/week\/([^/]+)$/);
    if (method === "GET" && weekResMatch) {
      const idOrNum = Number(weekResMatch[1]);
      const week = db.weeks.find(
        (w) => w.id === idOrNum || w.weekNumber === idOrNum
      );
      const targetId = week ? week.id : idOrNum;
      const active = db.reservations.filter(
        (r) => r.weekId === targetId && r.status !== "CANCELLED"
      );
      return ok(res, {
        confirmed: active.filter(
          (r) => r.status === "CONFIRMED" || r.status === "CONFIRMED_ADMIN"
        ),
        pending: active.filter((r) => r.status === "PENDING"),
      });
    }

    if (method === "GET" && pathname === "/reservations/me") {
      const token = getBearerToken(req);
      const teamId = token?.replace("team:", "");
      if (!teamId) return fail(res, "팀 인증이 필요합니다.", 401);
      return ok(
        res,
        db.reservations.filter((r) => r.teamId === teamId)
      );
    }

    if (
      method === "POST" &&
      (pathname === "/reservations/instant" || pathname === "/reservations/pre")
    ) {
      const token = getBearerToken(req);
      const teamId = token?.replace("team:", "");
      const team = db.teams.find((t) => t.id === teamId);
      if (!team) return fail(res, "팀 인증이 필요합니다.", 401);

      const body = await readBody(req);
      const startDate = new Date(body.startTime);
      if (Number.isNaN(startDate.getTime())) {
        return fail(res, "유효하지 않은 시간 형식입니다.");
      }
      const endDate = new Date(startDate.getTime() + 50 * 60000);
      const startIso = formatKstIso(startDate);
      const slotPrefix = startIso.slice(0, 16);
      const type = pathname.endsWith("/instant") ? "INSTANT" : "PRE";

      const conflict = db.reservations.find(
        (r) =>
          formatKstIso(new Date(r.startTime)).slice(0, 16) === slotPrefix &&
          (r.status === "CONFIRMED" || r.status === "CONFIRMED_ADMIN")
      );
      if (conflict) return fail(res, "이미 예약이 확정된 시간대입니다.");

      if (type === "PRE") {
        const dup = db.reservations.find(
          (r) =>
            r.teamId === team.id &&
            formatKstIso(new Date(r.startTime)).slice(0, 16) === slotPrefix &&
            r.status === "PENDING"
        );
        if (dup) return fail(res, "이미 해당 시간대에 사전 예약 대기 중입니다.");
      }

      const week = findWeekForTime(db, startIso);
      const created = {
        id: `res-${crypto.randomUUID().slice(0, 8)}`,
        startTime: startIso,
        endTime: formatKstIso(endDate),
        status: type === "INSTANT" ? "CONFIRMED" : "PENDING",
        type,
        teamId: team.id,
        teamName: team.name,
        weekId: week.id,
        createdAt: new Date().toISOString(),
        description: null,
      };
      db.reservations.push(created);
      writeDb(db);
      return ok(res, created, 201);
    }

    const cancelResMatch = pathname.match(/^\/reservations\/([^/]+)$/);
    if (method === "DELETE" && cancelResMatch) {
      const target = db.reservations.find((r) => r.id === cancelResMatch[1]);
      if (target) {
        target.status = "CANCELLED";
        writeDb(db);
      }
      return ok(res, null);
    }

    // --- AUTH & TEAMS ---
    if (
      method === "POST" &&
      (pathname === "/auth/verify" || pathname === "/auth/register")
    ) {
      const body = await readBody(req);
      const { name, password, autoRegister } = body;
      const existing = db.teams.find((t) => t.name === name);
      if (existing) {
        if (existing.password !== password) {
          return fail(res, "팀 비밀번호가 일치하지 않습니다.", 401);
        }
        return ok(res, { access_token: `team:${existing.id}`, isNewTeam: false });
      }
      if (!autoRegister && pathname === "/auth/verify") {
        return fail(res, "존재하지 않는 팀입니다.", 404);
      }
      const newTeam = {
        id: `team-${crypto.randomUUID().slice(0, 8)}`,
        name,
        password,
        createdAt: new Date().toISOString(),
      };
      db.teams.push(newTeam);
      writeDb(db);
      return ok(res, { access_token: `team:${newTeam.id}`, isNewTeam: true });
    }

    if (method === "GET" && pathname === "/teams") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      return ok(
        res,
        db.teams
          .filter((t) => (!search ? true : t.name.toLowerCase().includes(search)))
          .map(({ id, name, createdAt }) => ({ id, name, createdAt }))
      );
    }

    if (method === "GET" && pathname === "/teams/me") {
      const teamId = getBearerToken(req)?.replace("team:", "");
      const team = db.teams.find((t) => t.id === teamId);
      if (!team) return fail(res, "팀 인증이 필요합니다.", 401);
      return ok(res, { id: team.id, name: team.name, createdAt: team.createdAt });
    }

    if (method === "PATCH" && pathname === "/teams/me/name") {
      const teamId = getBearerToken(req)?.replace("team:", "");
      const team = db.teams.find((t) => t.id === teamId);
      if (!team) return fail(res, "팀 인증이 필요합니다.", 401);
      const { name } = await readBody(req);
      if (db.teams.some((t) => t.name === name && t.id !== teamId)) {
        return fail(res, "이미 사용 중인 팀 이름입니다.");
      }
      team.name = name;
      db.reservations.forEach((r) => {
        if (r.teamId === team.id) r.teamName = name;
      });
      writeDb(db);
      return ok(res, { id: team.id, name: team.name, createdAt: team.createdAt });
    }

    if (method === "PATCH" && pathname === "/teams/me/password") {
      const teamId = getBearerToken(req)?.replace("team:", "");
      const team = db.teams.find((t) => t.id === teamId);
      if (!team) return fail(res, "팀 인증이 필요합니다.", 401);
      const { currentPassword, password } = await readBody(req);
      if (team.password !== currentPassword) {
        return fail(res, "현재 비밀번호가 일치하지 않습니다.");
      }
      team.password = password;
      writeDb(db);
      return ok(res, null);
    }

    if (method === "DELETE" && pathname === "/teams/me") {
      const teamId = getBearerToken(req)?.replace("team:", "");
      if (!teamId) return fail(res, "팀 인증이 필요합니다.", 401);
      db.teams = db.teams.filter((t) => t.id !== teamId);
      db.reservations = db.reservations.filter((r) => r.teamId !== teamId);
      writeDb(db);
      return ok(res, null);
    }

    // --- ADMIN ---
    if (method === "POST" && pathname === "/admin/verify") {
      const { password } = await readBody(req);
      if (password !== "admin" && password !== "taurus" && password !== "1987") {
        return fail(
          res,
          "관리자 비밀번호가 올바르지 않습니다. (임시 비밀번호: admin)",
          401
        );
      }
      return ok(res, { access_token: "admin:demo" });
    }

    if (method === "GET" && pathname === "/admin/settings") {
      return ok(res, db.settings);
    }

    if (method === "PATCH" && pathname === "/admin/settings") {
      const body = await readBody(req);
      db.settings = { ...db.settings, ...body };
      writeDb(db);
      return ok(res, db.settings);
    }

    if (method === "POST" && pathname === "/admin/reservations") {
      const { startTime, description } = await readBody(req);
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + 50 * 60000);
      const startIso = formatKstIso(startDate);
      const slotPrefix = startIso.slice(0, 16);

      db.reservations.forEach((r) => {
        if (
          formatKstIso(new Date(r.startTime)).slice(0, 16) === slotPrefix &&
          r.status !== "CANCELLED"
        ) {
          r.status = "VOID";
        }
      });

      const week = findWeekForTime(db, startIso);
      const created = {
        id: `res-admin-${crypto.randomUUID().slice(0, 8)}`,
        startTime: startIso,
        endTime: formatKstIso(endDate),
        status: "CONFIRMED_ADMIN",
        type: "ADMIN",
        teamId: null,
        teamName: "관리자",
        weekId: week.id,
        createdAt: new Date().toISOString(),
        description,
      };
      db.reservations.push(created);
      writeDb(db);
      return ok(res, created, 201);
    }

    const adminTeamResMatch = pathname.match(
      /^\/admin\/reservations\/team\/([^/]+)$/
    );
    if (method === "GET" && adminTeamResMatch) {
      return ok(
        res,
        db.reservations.filter((r) => r.teamId === adminTeamResMatch[1])
      );
    }

    const adminCancelMatch = pathname.match(/^\/admin\/reservations\/([^/]+)$/);
    if (method === "DELETE" && adminCancelMatch) {
      const target = db.reservations.find((r) => r.id === adminCancelMatch[1]);
      if (target) {
        target.status = "CANCELLED";
        writeDb(db);
      }
      return ok(res, null);
    }

    const adminDeleteTeamMatch = pathname.match(/^\/admin\/teams\/([^/]+)$/);
    if (method === "DELETE" && adminDeleteTeamMatch) {
      const tid = adminDeleteTeamMatch[1];
      db.teams = db.teams.filter((t) => t.id !== tid);
      db.reservations = db.reservations.filter((r) => r.teamId !== tid);
      writeDb(db);
      return ok(res, null);
    }

    // --- TIMETABLES ---
    if (method === "GET" && pathname === "/timetables") {
      const sorted = [...db.timetables]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(sanitizeTimetable);
      return ok(res, sorted);
    }

    if (method === "POST" && pathname === "/timetables") {
      const body = await readBody(req);
      const created = {
        id: crypto.randomBytes(3).toString("hex"),
        title: (body.title || "새 합주 시간 조율").trim(),
        dates: [...(body.dates || [])].sort(),
        startHour: Number(body.startHour ?? 9),
        endHour: Number(body.endHour ?? 23),
        intervalMinutes: body.intervalMinutes === 30 ? 30 : 60,
        lockedSlots: [...(body.lockedSlots || [])].sort(),
        participants: [],
        createdAt: new Date().toISOString(),
      };
      db.timetables.unshift(created);
      writeDb(db);
      return ok(res, sanitizeTimetable(created), 201);
    }

    const ttIdMatch = pathname.match(/^\/timetables\/([^/]+)$/);
    if (method === "GET" && ttIdMatch) {
      const found = db.timetables.find((t) => t.id === ttIdMatch[1]) || null;
      return ok(res, found ? sanitizeTimetable(found) : null);
    }

    const ttVerifyMatch = pathname.match(
      /^\/timetables\/([^/]+)\/participants\/verify$/
    );
    if (method === "POST" && ttVerifyMatch) {
      const table = db.timetables.find((t) => t.id === ttVerifyMatch[1]);
      if (!table) return fail(res, "시간표를 찾을 수 없습니다.", 404);
      const { name, password } = await readBody(req);
      const existing = table.participants.find((p) => p.name === name);
      if (existing) {
        if (existing.password !== password) {
          return fail(res, "비밀번호가 일치하지 않습니다.", 401);
        }
        const { password: _p, ...safeParticipant } = existing;
        return ok(res, { participant: safeParticipant, isNew: false });
      }
      return ok(res, { participant: null, isNew: true });
    }

    const ttEntriesMatch = pathname.match(/^\/timetables\/([^/]+)\/entries$/);
    if (ttEntriesMatch) {
      const table = db.timetables.find((t) => t.id === ttEntriesMatch[1]);
      if (!table) return fail(res, "시간표를 찾을 수 없습니다.", 404);

      if (method === "POST") {
        const { name, password, availableSlots } = await readBody(req);
        const idx = table.participants.findIndex((p) => p.name === name);
        if (idx >= 0) {
          if (table.participants[idx].password !== password) {
            return fail(res, "비밀번호가 일치하지 않습니다.", 401);
          }
          table.participants[idx] = {
            ...table.participants[idx],
            availableSlots: [...(availableSlots || [])],
            updatedAt: new Date().toISOString(),
          };
        } else {
          table.participants.push({
            id: `part-${crypto.randomUUID().slice(0, 8)}`,
            name,
            password,
            availableSlots: [...(availableSlots || [])],
            updatedAt: new Date().toISOString(),
          });
        }
        writeDb(db);
        return ok(res, sanitizeTimetable(table));
      }

      if (method === "DELETE") {
        const { name, password } = await readBody(req);
        const target = table.participants.find((p) => p.name === name);
        if (!target) return fail(res, "참여자를 찾을 수 없습니다.", 404);
        if (target.password !== password) {
          return fail(res, "비밀번호가 일치하지 않습니다.", 401);
        }
        table.participants = table.participants.filter((p) => p.name !== name);
        writeDb(db);
        return ok(res, sanitizeTimetable(table));
      }
    }

    return fail(res, `Not Found: ${method} ${pathname}`, 404);
  } catch (err) {
    console.error("API Server Error:", err);
    return fail(res, err instanceof Error ? err.message : "Internal Server Error", 500);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[Taurus Shared API] Listening on http://127.0.0.1:${PORT}`);
});
