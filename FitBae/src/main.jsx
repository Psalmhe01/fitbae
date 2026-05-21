import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";
import "./theme/style.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/theme.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import OnboardingPage from "./pages/Onboarding.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import PlanPage from "./pages/Plan.jsx";
import HistoryPage from "./pages/History.jsx";
import ProfilePage from "./pages/Profile.jsx";
import SettingsPage from "./pages/Settings.jsx";
import SessionDetailPage from "./pages/SessionDetail.jsx";
import ActiveWorkoutPage from "./pages/ActiveWorkout.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<App />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="history/:sessionId" element={<SessionDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="workout" element={<ActiveWorkoutPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
