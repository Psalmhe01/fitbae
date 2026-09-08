import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";
import "./theme/style.css";
import { ThemeProvider } from "./theme/theme.jsx";
import { PageErrorBoundary } from "./components/PageErrorBoundary.jsx";

const App = lazy(() => import("./App.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const OnboardingPage = lazy(() => import("./pages/Onboarding.jsx"));
const DashboardPage = lazy(() => import("./pages/Dashboard.jsx"));
const PlanPage = lazy(() => import("./pages/Plan.jsx"));
const TogetherPage = lazy(() => import("./pages/Together.jsx"));
const HistoryPage = lazy(() => import("./pages/History.jsx"));
const ProfilePage = lazy(() => import("./pages/Profile.jsx"));
const SettingsPage = lazy(() => import("./pages/Settings.jsx"));
const SessionDetailPage = lazy(() => import("./pages/SessionDetail.jsx"));
const ActiveWorkoutPage = lazy(() => import("./pages/ActiveWorkout.jsx"));

function RouteFallback() {
  return <Center mih="100svh" className="app-shell"><Loader color="brand" /></Center>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PageErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<App />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="together" element={<TogetherPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="history/:sessionId" element={<SessionDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="workout" element={<ActiveWorkoutPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </PageErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
