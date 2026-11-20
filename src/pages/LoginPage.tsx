import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { adminApi, authApi } from "../api/taurusApi";
import { TeamAuthForm } from "../components/reservation/ReservationComponents";
import { PageContainer, PageHeader } from "../components/ui/Typography";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginTeam, loginAdmin } = useAuth();

  const role = searchParams.get("role") === "ADMIN" ? "ADMIN" : "TEAM";
  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || (role === "ADMIN" ? ROUTES.ADMIN : ROUTES.TEAMS_ME);

  const handleSubmit = async (name: string, password: string) => {
    try {
      if (role === "ADMIN") {
        const { access_token } = await adminApi.verify(password);
        loginAdmin(access_token);
      } else {
        const { access_token } = await authApi.verify({ name, password });
        loginTeam(access_token, name, password);
      }
      navigate(fromPath, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || "로그인에 실패했습니다.");
    }
  };

  return (
    <PageContainer>
      <PageHeader title={role === "ADMIN" ? "관리자 로그인" : "팀 로그인"} />
      <div className="max-w-md mx-auto mt-10 p-6 bg-bg-card rounded-2xl border border-white/10 shadow-xl">
        <TeamAuthForm
          onSubmit={handleSubmit}
          submitLabel="로그인"
          hideNameField={role === "ADMIN"}
        />
        {role === "TEAM" && (
          <p className="mt-4 text-xs text-text-muted text-center">
            로컬 테스트 예시 팀: <span className="text-text-sub">토러스 / 1234</span>
          </p>
        )}
      </div>
    </PageContainer>
  );
}
