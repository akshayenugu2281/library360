import { useAuth } from "../context/AuthContext";
import { LogOut, Search, Bell, ShieldCheck, UserRound, Info, Command, ArrowRight, BookOpen, BookmarkCheck, Repeat, ReceiptIndianRupee, Users, Settings, CircleHelp, X, Menu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((open) => !open); }
      if (event.key === "Escape") { setCommandOpen(false); setProfileMenuOpen(false); setNotificationsOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) { navigate(`/catalog?q=${encodeURIComponent(query)}`); setSearchQuery(""); }
  }

  const isStaff = user?.roles.includes("ADMIN") || user?.roles.includes("LIBRARIAN");
  const pageTitles: Record<string, string> = { "/": "Overview", "/catalog": "Book catalog", "/saved": "Reading list", "/circulation": isStaff ? "Circulation" : "My loans", "/members": "Members", "/reservations": isStaff ? "Reservations" : "My holds", "/fines": isStaff ? "Fine ledger" : "My fines", "/settings": "Settings", "/help": "Help & support", "/admin/users": "User administration", "/admin/ai": "AI provider", "/admin/signup-fields": "Signup requirements", "/admin/loan-policies": "Loan & fine policies", "/approvals": "Registration approvals", "/analytics": "Analytics", "/support": "Support chat", "/assistant": "AI assistant", "/notifications": "Notifications" };
  const pageTitle = pageTitles[location.pathname] || "Library workspace";
  const quickLinks = [
    { label: "Overview", hint: "Dashboard and activity", icon: Sparkles, to: "/" },
    { label: "Search catalog", hint: "Find books and authors", icon: Search, to: "/catalog" },
    { label: "Reading list", hint: "Your saved books", icon: BookmarkCheck, to: "/saved" },
    { label: isStaff ? "Circulation" : "My loans", hint: "Loan status and due dates", icon: Repeat, to: "/circulation" },
    { label: isStaff ? "Reservations" : "My holds", hint: "Check hold progress", icon: BookOpen, to: "/reservations" },
    { label: isStaff ? "Fine ledger" : "My fines", hint: "Outstanding balances", icon: ReceiptIndianRupee, to: "/fines" },
    ...(isStaff ? [{ label: "Members", hint: "Member directory", icon: Users, to: "/members" }] : []),
    { label: "Settings", hint: "Appearance and preferences", icon: Settings, to: "/settings" },
    { label: "Help & support", hint: "Guides and common questions", icon: CircleHelp, to: "/help" },
  ];

  return <header className="app-topbar">
    <div className="topbar-left"><button type="button" className="mobile-menu-button" onClick={onToggleSidebar} aria-label="Toggle navigation"><Menu size={19}/></button><div className="topbar-page-title"><span>LIBRARY360 / WORKSPACE</span><strong>{pageTitle}</strong></div></div>
    <form onSubmit={handleSearch} role="search" className="topbar-search">
      <Search size={18}/><input type="search" aria-label="Search the catalog" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search titles, authors, ISBN…"/><button type="button" onClick={() => setCommandOpen(true)} className="keyboard-hint" aria-label="Open quick navigation"><Command size={12}/> K</button>
    </form>
    <div className="topbar-actions">
      <div className="popover-wrap"><button type="button" className={`topbar-icon-button ${notificationsOpen ? "is-open" : ""}`} aria-label="Notification status" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={19}/></button>{notificationsOpen && <div className="topbar-popover notification-popover"><div className="popover-heading"><strong>Notifications</strong><span>STATUS</span></div><div className="popover-empty"><div className="popover-empty-icon"><Info size={19}/></div><strong>No live alerts connected</strong><p>There is no notification service connected to this deployment yet. Library records are still available in their respective pages.</p></div><Link to="/settings" onClick={() => setNotificationsOpen(false)} className="popover-footer-link">Notification preferences <ArrowRight size={14}/></Link></div>}</div>
      <div className="topbar-divider"/>
      <div className="popover-wrap"><button type="button" className={`profile-trigger ${profileMenuOpen ? "is-open" : ""}`} aria-expanded={profileMenuOpen} aria-label="Open account menu" onClick={() => setProfileMenuOpen(!profileMenuOpen)}><span className="profile-avatar">{(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}</span><span className="profile-meta"><strong>{user?.fullName || "Library member"}</strong><small><ShieldCheck size={12}/> {user?.roles[0] || "MEMBER"}</small></span></button>{profileMenuOpen && <div className="topbar-popover profile-popover"><div className="profile-popover-head"><span className="profile-avatar profile-avatar-large">{(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}</span><div><strong>{user?.fullName || "Library member"}</strong><small>{user?.email || ""}</small></div></div><Link to="/settings" onClick={() => setProfileMenuOpen(false)}><UserRound size={16}/> Account settings</Link><button type="button" className="popover-signout" onClick={() => { logout(); setProfileMenuOpen(false); navigate("/login", { replace: true }); }}><LogOut size={16}/> Sign out</button></div>}</div>
    </div>

    {commandOpen && <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Quick navigation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><div className="command-modal"><div className="command-search-line"><Search size={19}/><input autoFocus placeholder="Jump to a page or search books…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && searchQuery.trim()) { navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`); setCommandOpen(false); setSearchQuery(""); } }} /><kbd>ESC</kbd><button type="button" onClick={() => setCommandOpen(false)} aria-label="Close quick navigation"><X size={18}/></button></div><div className="command-section-label">QUICK NAVIGATION</div><div className="command-items">{quickLinks.filter((item) => !searchQuery || `${item.label} ${item.hint}`.toLowerCase().includes(searchQuery.toLowerCase())).map(({ label, hint, icon: Icon, to }) => <button key={to} type="button" className="command-item" onClick={() => { navigate(to); setCommandOpen(false); setSearchQuery(""); }}><span className="command-item-icon"><Icon size={17}/></span><span className="command-item-copy"><strong>{label}</strong><small>{hint}</small></span><ArrowRight size={15}/></button>)}</div><div className="command-bottom-note"><Command size={13}/> Quick access · press Esc to close</div></div></div>}
  </header>;
}
