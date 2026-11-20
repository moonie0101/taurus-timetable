import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout, ProtectedRoute } from "./components/layout/Layout";
import { ROUTES } from "./constants/routes";
import { AuthProvider } from "./context/AuthContext";
import { TimetableCreatePage } from "./features/timetable/pages/TimetableCreatePage";
import { TimetableDetailPage } from "./features/timetable/pages/TimetableDetailPage";
import { AdminPage } from "./pages/AdminPage";
import { DesignTestPage } from "./pages/DesignTestPage";
import { HomePage } from "./pages/HomePage";
import { InstantReservationPage } from "./pages/InstantReservationPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PreReservationPage } from "./pages/PreReservationPage";
import { TeamManagePage } from "./pages/TeamManagePage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: ROUTES.HOME, element: <HomePage /> },
      {
        path: ROUTES.INSTANT_RESERVATION,
        element: <InstantReservationPage />,
      },
      { path: ROUTES.PRE_RESERVATION, element: <PreReservationPage /> },
      { path: ROUTES.TIMETABLE, element: <TimetableCreatePage /> },
      { path: ROUTES.TIMETABLE_DETAIL, element: <TimetableDetailPage /> },
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.DESIGN_TEST, element: <DesignTestPage /> },
      { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
    ],
  },
  {
    path: ROUTES.ADMIN,
    element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
    children: [{ index: true, element: <AdminPage /> }],
  },
  {
    path: ROUTES.TEAMS_ME,
    element: <ProtectedRoute allowedRoles={["TEAM"]} />,
    children: [{ index: true, element: <TeamManagePage /> }],
  },
], {
  basename: import.meta.env.BASE_URL,
});

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
