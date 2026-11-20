import axios from "axios";
import { ADMIN_TOKEN_KEY, TEAM_TOKEN_KEY } from "../context/AuthContext";
import {
  Reservation,
  SystemSettings,
  Team,
  Week,
  WeekReservationsResponse,
} from "../types/taurus";
import { mockTaurusStore } from "./mockStore";

/**
 * API Mode Switch:
 * - "mock" (default): Runs standalone using LocalStorage so testing never modifies production DB.
 * - "remote": Connects directly to the Taurus Railway backend.
 */
export const API_MODE =
  (import.meta.env.VITE_API_MODE as "mock" | "remote" | undefined) || "mock";

export const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://taurus-production-39be.up.railway.app",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const isAdminUrl = config.url?.startsWith("/admin");
  const token = isAdminUrl
    ? sessionStorage.getItem(ADMIN_TOKEN_KEY)
    : sessionStorage.getItem(TEAM_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

apiClient.interceptors.response.use(
  (res) => (res.data && res.data.code === "SUCCESS" ? res.data.data : res.data),
  (error) => {
    if (error.response?.status === 401 && !isRefreshing) {
      isRefreshing = true;
      const isAdminUrl = (error.config?.url || "").startsWith("/admin");
      if (isAdminUrl) {
        if (sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          window.dispatchEvent(
            new CustomEvent("auth:token-expired", { detail: { type: "admin" } })
          );
        }
      } else if (sessionStorage.getItem(TEAM_TOKEN_KEY)) {
        sessionStorage.removeItem(TEAM_TOKEN_KEY);
        sessionStorage.removeItem("TEAM_NAME");
        sessionStorage.removeItem("TEAM_PASSWORD");
        window.dispatchEvent(
          new CustomEvent("auth:token-expired", { detail: { type: "team" } })
        );
      }
      setTimeout(() => {
        isRefreshing = false;
      }, 1000);
    }
    return Promise.reject(error);
  }
);

function wrapMockError(err: unknown): never {
  const message = err instanceof Error ? err.message : "요청 처리에 실패했습니다.";
  throw { response: { status: 400, data: { message } } };
}

export const authApi = {
  register: async (payload: { name: string; password: string }) => {
    if (API_MODE === "mock") {
      try {
        return mockTaurusStore.verifyTeam(payload.name, payload.password, true);
      } catch (e) {
        wrapMockError(e);
      }
    }
    return apiClient.post("/auth/register", payload);
  },

  verify: async (payload: {
    name: string;
    password: string;
    autoRegister?: boolean;
  }): Promise<{ access_token: string; isNewTeam?: boolean }> => {
    if (API_MODE === "mock") {
      try {
        return mockTaurusStore.verifyTeam(
          payload.name,
          payload.password,
          payload.autoRegister
        );
      } catch (e) {
        wrapMockError(e);
      }
    }
    return apiClient.post("/auth/verify", payload);
  },
};

export const reservationApi = {
  getReservations: async (weekId?: string): Promise<WeekReservationsResponse> => {
    if (!weekId) return { confirmed: [], pending: [] };
    if (API_MODE === "mock") {
      return mockTaurusStore.getReservationsByWeek(Number(weekId));
    }
    return apiClient.get(`/reservations/week/${weekId}`);
  },

  getMyReservations: async (): Promise<Reservation[]> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getMyReservations(
        sessionStorage.getItem(TEAM_TOKEN_KEY)
      );
    }
    return apiClient.get("/reservations/me");
  },

  createInstant: async (payload: { startTime: string }): Promise<Reservation> => {
    if (API_MODE === "mock") {
      try {
        return mockTaurusStore.createReservation(
          sessionStorage.getItem(TEAM_TOKEN_KEY),
          payload.startTime,
          "INSTANT"
        );
      } catch (e) {
        wrapMockError(e);
      }
    }
    return apiClient.post("/reservations/instant", payload);
  },

  createPre: async (payload: { startTime: string }): Promise<Reservation> => {
    if (API_MODE === "mock") {
      try {
        return mockTaurusStore.createReservation(
          sessionStorage.getItem(TEAM_TOKEN_KEY),
          payload.startTime,
          "PRE"
        );
      } catch (e) {
        wrapMockError(e);
      }
    }
    return apiClient.post("/reservations/pre", payload);
  },

  cancel: async (id: string): Promise<void> => {
    if (API_MODE === "mock") {
      mockTaurusStore.cancelReservation(id);
      return;
    }
    await apiClient.delete(`/reservations/${id}`);
  },
};

export const teamApi = {
  getTeams: async (search?: string): Promise<Team[]> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getTeams(search);
    }
    return apiClient.get("/teams", { params: search ? { search } : {} });
  },

  getMe: async (): Promise<Team> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getMe(sessionStorage.getItem(TEAM_TOKEN_KEY));
    }
    return apiClient.get("/teams/me");
  },

  updateName: async (name: string): Promise<Team> => {
    if (API_MODE === "mock") {
      try {
        return mockTaurusStore.updateTeamName(
          sessionStorage.getItem(TEAM_TOKEN_KEY),
          name
        );
      } catch (e) {
        wrapMockError(e);
      }
    }
    return apiClient.patch("/teams/me/name", { name });
  },

  updatePassword: async (
    currentPassword: string,
    password: string
  ): Promise<void> => {
    if (API_MODE === "mock") {
      try {
        mockTaurusStore.updateTeamPassword(
          sessionStorage.getItem(TEAM_TOKEN_KEY),
          currentPassword,
          password
        );
        return;
      } catch (e) {
        wrapMockError(e);
      }
    }
    await apiClient.patch("/teams/me/password", { currentPassword, password });
  },

  deleteMe: async (): Promise<void> => {
    if (API_MODE === "mock") {
      const token = sessionStorage.getItem(TEAM_TOKEN_KEY);
      if (token) mockTaurusStore.deleteTeam(token, true);
      return;
    }
    await apiClient.delete("/teams/me");
  },
};

export const weekApi = {
  getCurrentWeek: async (): Promise<Week> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getMainWeek().main;
    }
    const data = (await apiClient.get("/weeks/main")) as { main: Week };
    return data.main;
  },

  getWeeks: async (): Promise<Week[]> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getWeeks();
    }
    return apiClient.get("/weeks");
  },
};

export const adminApi = {
  verify: async (password: string): Promise<{ access_token: string }> => {
    if (API_MODE === "mock") {
      try {
        return mockTaurusStore.verifyAdmin(password);
      } catch (e) {
        wrapMockError(e);
      }
    }
    return apiClient.post("/admin/verify", { password });
  },

  getSettings: async (): Promise<SystemSettings> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getSettings();
    }
    return apiClient.get("/admin/settings");
  },

  updateSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.updateSettings(settings);
    }
    return apiClient.patch("/admin/settings", settings);
  },

  createReservation: async (payload: {
    startTime: string;
    description: string;
  }): Promise<Reservation> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.adminCreateReservation(
        payload.startTime,
        payload.description
      );
    }
    return apiClient.post("/admin/reservations", payload);
  },

  getReservationsByTeam: async (teamId: string): Promise<Reservation[]> => {
    if (API_MODE === "mock") {
      return mockTaurusStore.getReservationsByTeam(teamId);
    }
    return apiClient.get(`/admin/reservations/team/${teamId}`);
  },

  cancelReservation: async (id: string): Promise<void> => {
    if (API_MODE === "mock") {
      mockTaurusStore.cancelReservation(id);
      return;
    }
    await apiClient.delete(`/admin/reservations/${id}`);
  },

  deleteTeam: async (id: string): Promise<void> => {
    if (API_MODE === "mock") {
      mockTaurusStore.deleteTeam(id, false);
      return;
    }
    await apiClient.delete(`/admin/teams/${id}`);
  },
};
