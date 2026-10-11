import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Users, Repeat, BookmarkCheck, ReceiptIndianRupee, LayoutDashboard, Settings, HelpCircle, PanelLeftClose, PanelLeftOpen, Sparkles, Bot, UserCog, KeyRound, BellRing, ClipboardCheck, MessageCircle, ChartNoAxesCombined, SlidersHorizontal, BadgeIndianRupee } from "lucide-react";
import { cn } from "../lib/utils";

export function Sidebar({ collapsed, setCollapsed, mobileOpen = false }: { collapsed: boolean; setCollapsed: (collapsed: boolean) => void; mobileOpen?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.roles.includes("ADMIN") ? "ADMIN" : user?.roles.includes("LIBRARIAN") ? "LIBRARIAN" : user?.roles[0] || "USER";
  const isStaff = role === "ADMIN" || role === "LIBRARIAN";
  const links = [
    { to: "/", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/catalog", label: "Book catalog", icon: BookOpen, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/saved", label: "Reading list", icon: BookmarkCheck, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/circulation", label: isStaff ? "Circulation" : "My loans", icon: Repeat, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT"] },
    { to: "/reservations", label: isStaff ? "Reservations" : "My holds", icon: BookmarkCheck, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/fines", label: isStaff ? "Fine ledger" : "My fines", icon: ReceiptIndianRupee, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/members", label: "Members", icon: Users, roles: ["ADMIN", "LIBRARIAN"] },
    { to: "/approvals", label: "Verify registrations", icon: ClipboardCheck, roles: ["ADMIN", "LIBRARIAN"] },
    { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined, roles: ["ADMIN", "LIBRARIAN"] },
    { to: "/support", label: "Library support chat", icon: MessageCircle, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/assistant", label: "AI assistant", icon: Bot, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/notifications", label: "Notifications", icon: BellRing, roles: ["ADMIN", "LIBRARIAN", "FACULTY", "STUDENT", "USER"] },
    { to: "/admin/users", label: "User administration", icon: UserCog, roles: ["ADMIN"] },
    { to: "/admin/ai", label: "AI provider", icon: KeyRound, roles: ["ADMIN"] },
    { to: "/admin/signup-fields", label: "Signup requirements", icon: SlidersHorizontal, roles: ["ADMIN"] },
    { to: "/admin/loan-policies", label: "Loan & fine policies", icon: BadgeIndianRupee, roles: ["ADMIN"] },
  ].filter((item) => item.roles.includes(role));

  return <aside className={cn("app-sidebar", collapsed && "is-collapsed", mobileOpen && "mobile-open")}>
    <div className="sidebar-brand-row">
      <Link to="/" className="sidebar-brand" aria-label="Library360 overview">
        <span className="brand-mark"><BookOpen size={21} strokeWidth={2.2} /></span>
        {!collapsed && <span className="sidebar-wordmark">Library<span>360</span><small>SMART LIBRARY</small></span>}
      </Link>
      <button type="button" className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>

    <div className="sidebar-workspace">
      <div className="workspace-avatar"><Sparkles size={17} /></div>
      {!collapsed && <div className="workspace-label"><strong>Library workspace</strong><small>{isStaff ? "Operations console" : "Reader space"}</small></div>}
      {!collapsed && <span className="workspace-live" title="Workspace ready" />}
    </div>

    <nav className="sidebar-nav" aria-label="Main navigation">
      {!collapsed && <div className="sidebar-section-label">WORKSPACE</div>}
      {links.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);
        return <Link key={to} to={to} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={cn("sidebar-link", active && "active", collapsed && "centered")}>
          <Icon size={19} strokeWidth={active ? 2.25 : 1.9} /><span className="nav-label">{label}</span>{active && !collapsed && <span className="sidebar-active-dot" />}
        </Link>;
      })}
      {!collapsed && <div className="sidebar-section-label sidebar-section-lower">PREFERENCES</div>}
      <Link to="/settings" title={collapsed ? "Settings" : undefined} aria-current={location.pathname === "/settings" ? "page" : undefined} className={cn("sidebar-link", location.pathname === "/settings" && "active", collapsed && "centered")}><Settings size={19}/><span className="nav-label">Settings</span></Link>
      <Link to="/help" title={collapsed ? "Help & support" : undefined} aria-current={location.pathname === "/help" ? "page" : undefined} className={cn("sidebar-link", location.pathname === "/help" && "active", collapsed && "centered")}><HelpCircle size={19}/><span className="nav-label">Help & support</span></Link>
    </nav>

    {!collapsed && <div className="sidebar-bottom-card"><div className="sidebar-bottom-symbol"><BookOpen size={17}/></div><strong>Make room for ideas.</strong><p>A little reading can change a lot.</p><Link to="/catalog">Explore the catalog <span>↗</span></Link></div>}
    <div className="sidebar-footnote">{collapsed ? <span className="sidebar-foot-mark">L</span> : <><span className="sidebar-foot-mark">L</span><span>Library360 <b>•</b> v3.0</span></>}</div>
  </aside>;
}
