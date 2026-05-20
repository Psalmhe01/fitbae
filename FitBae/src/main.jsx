import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@mantine/core/styles.css";
import "./index.css";
import "./theme/style.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/theme.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import OnboardingPage from "./pages/Onboarding.jsx";
import DashboardPage from "./pages/Dashoard.jsx";
import PlanPage from "./pages/Plan.jsx";
import HistoryPage from "./pages/History.jsx";
import ProfilePage from "./pages/Profile.jsx";

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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
