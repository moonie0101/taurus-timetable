import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../context/AuthContext";
import { Backdrop } from "../ui/Modal";

export const NAV_ITEMS = [
  { label: "바로 예약", path: ROUTES.INSTANT_RESERVATION },
  { label: "미리 예약", path: ROUTES.PRE_RESERVATION },
  { label: "시간 조율", path: ROUTES.TIMETABLE },
  { label: "팀 관리", path: ROUTES.TEAMS_ME },
  { label: "관리자", path: ROUTES.ADMIN },
];

export function Header({
  onMenuClick,
  isMenuOpen,
  onLogoClick,
}: {
  onMenuClick: () => void;
  isMenuOpen: boolean;
  onLogoClick: () => void;
}) {
  const isHome = useLocation().pathname === ROUTES.HOME;
  return (
    <header
      className={`fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-[60] ${
        isHome
          ? "bg-transparent border-none"
          : "bg-bg-main/90 backdrop-blur-md border-b border-white/10"
      }`}
    >
      <button
        type="button"
        onClick={onLogoClick}
        className="text-primary flex flex-col items-center cursor-pointer"
      >
        <img src={`${import.meta.env.BASE_URL}images/taurus-logo.png`} alt="taurus-logo" className="w-11" />
      </button>
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </header>
  );
}

export function Drawer({
  isOpen,
  onClose,
  items,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: { label: string; path: string }[];
  onNavigate: (path: string) => void;
}) {
  const { pathname } = useLocation();
  if (!isOpen) return null;

  return (
    <>
      <Backdrop onClose={onClose} />
      <nav className="fixed top-14 right-0 w-64 bg-bg-card border-l border-white/10 h-[calc(100vh-3.5rem)] z-50 p-4 flex flex-col gap-1 animate-in slide-in-from-right duration-200">
        {items.map((item) => {
          const isActive =
            item.path === ROUTES.TIMETABLE
              ? pathname.startsWith(ROUTES.TIMETABLE)
              : pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                isActive
                  ? "bg-primary/20 text-primary font-semibold"
                  : "hover:bg-white/5 text-text-sub"
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function MainContainer({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTES.HOME;
  const isTimetable = pathname.startsWith(ROUTES.TIMETABLE);
  const isAdmin = pathname.startsWith(ROUTES.ADMIN);

  const widthClass = isHome
    ? "w-full"
    : isTimetable
    ? "pt-14 max-w-5xl mx-auto px-4"
    : isAdmin
    ? "pt-14 max-w-3xl mx-auto px-4"
    : "pt-14 max-w-[600px] mx-auto px-4";

  return <main className={`min-h-screen ${widthClass}`}>{children}</main>;
}

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header
        isMenuOpen={isMenuOpen}
        onMenuClick={() => setIsMenuOpen((prev) => !prev)}
        onLogoClick={() => {
          setIsMenuOpen(false);
          navigate(ROUTES.HOME);
        }}
      />
      <Drawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={NAV_ITEMS}
        onNavigate={handleNavigate}
      />
      <MainContainer>
        <Outlet />
      </MainContainer>
    </div>
  );
}

export function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles: ("TEAM" | "ADMIN")[];
}) {
  const { isTeamAuthenticated, isAdminAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = allowedRoles.includes("ADMIN") ? "ADMIN" : "TEAM";
  const isAllowed =
    (role === "ADMIN" && isAdminAuthenticated) ||
    (role === "TEAM" && isTeamAuthenticated);

  if (!isAllowed) {
    return (
      <Navigate
        to={`${ROUTES.LOGIN}?role=${role}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header
        isMenuOpen={isMenuOpen}
        onMenuClick={() => setIsMenuOpen((prev) => !prev)}
        onLogoClick={() => {
          setIsMenuOpen(false);
          navigate(ROUTES.HOME);
        }}
      />
      <Drawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={NAV_ITEMS}
        onNavigate={(path) => {
          setIsMenuOpen(false);
          navigate(path);
        }}
      />
      <MainContainer>
        <Outlet />
      </MainContainer>
    </div>
  );
}
