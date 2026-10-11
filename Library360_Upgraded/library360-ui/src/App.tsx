import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DashboardPage } from "./pages/DashboardPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CirculationPage } from "./pages/CirculationPage";
import { MembersPage } from "./pages/MembersPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { FinesPage } from "./pages/FinesPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { SignupPage } from "./pages/SignupPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HelpPage } from "./pages/HelpPage";
import { LandingPage } from "./pages/LandingPage";
import { SavedBooksPage } from "./pages/SavedBooksPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AiSettingsPage } from "./pages/AiSettingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ApprovalQueuePage } from "./pages/ApprovalQueuePage";
import { SignupFieldsPage } from "./pages/SignupFieldsPage";
import { SupportPage } from "./pages/SupportPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LoanPolicyPage } from "./pages/LoanPolicyPage";
import { useEffect, useState } from "react";
import { BookOpen, ArrowRight } from "lucide-react";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !user.roles.some((role) => allowedRoles.includes(role))) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicBrowseLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-browse-frame">
    <header className="public-browse-header"><Link to="/" className="brand-lockup"><span className="brand-mark"><BookOpen size={20}/></span><span className="brand-wordmark">Library<span>360</span><small>SMART LIBRARY PLATFORM</small></span></Link><nav><Link to="/">Home</Link><Link to="/login">Sign in</Link><Link to="/signup" className="button button-primary">Create account <ArrowRight size={15}/></Link></nav></header>
    <main className="public-browse-main">{children}</main>
    <footer className="public-browse-footer"><span>Library360 · Make room for ideas.</span><span>Public catalog · Sign in for holds and account services</span></footer>
  </div>;
}

function HomeRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DashboardPage /> : <LandingPage />;
}

function RouteContent() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/forgot-password";
  const isPublicShell = !isAuthenticated || isAuthRoute;

  useEffect(() => {
    try {
      if (localStorage.getItem("l360_theme") === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);

  if (isPublicShell) {
    return <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/catalog" element={<PublicBrowseLayout><CatalogPage /></PublicBrowseLayout>} />
      <Route path="/saved" element={<PublicBrowseLayout><SavedBooksPage /></PublicBrowseLayout>} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>;
  }

  return <div className="app-frame">
    <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileSidebarOpen} />
    <button type="button" aria-label="Close navigation menu" className={`mobile-sidebar-backdrop ${mobileSidebarOpen ? "visible" : ""}`} onClick={() => setMobileSidebarOpen(false)} />
    <div className="app-content">
      <Topbar onToggleSidebar={() => setMobileSidebarOpen((open) => !open)} />
      <main className="app-main"><div className="app-main-inner">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/catalog" element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><SavedBooksPage /></ProtectedRoute>} />
          <Route path="/circulation" element={<ProtectedRoute><CirculationPage /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute allowedRoles={["ADMIN", "LIBRARIAN"]}><MembersPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AiSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/signup-fields" element={<ProtectedRoute allowedRoles={["ADMIN"]}><SignupFieldsPage /></ProtectedRoute>} />
          <Route path="/admin/loan-policies" element={<ProtectedRoute allowedRoles={["ADMIN"]}><LoanPolicyPage /></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute allowedRoles={["ADMIN", "LIBRARIAN"]}><ApprovalQueuePage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={["ADMIN", "LIBRARIAN"]}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />
          <Route path="/fines" element={<ProtectedRoute><FinesPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div></main>
    </div>
  </div>;
}

function App() {
  return <AuthProvider><Router><RouteContent /></Router></AuthProvider>;
}

export default App;
