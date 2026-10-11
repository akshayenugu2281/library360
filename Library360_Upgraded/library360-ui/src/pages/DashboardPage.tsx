import { useEffect, useState } from "react";
import { useLiveRefresh } from "../lib/live";
import { Link } from "react-router-dom";
import { api, type Loan, type Fine } from "../api/client";
import { Button } from "../components/ui/button";
import {
  BookOpen,
  Users,
  Repeat,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Search,
  Library,
  Layers,
  Award,
  CreditCard,
  CheckCircle2,
  Clock,
  ChartNoAxesCombined,
  CalendarClock,
  ShieldCheck,
  BellRing
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

type StaffOverview = { totalTitles:number; totalCopies:number; availableCopies:number; issuedCopies:number; overdueLoans:number; dueToday:number; activeReservations:number; activeMembers:number; openFineBalance:number; pendingApprovals:number; suspendedUsers:number };

export function DashboardPage() {
  const { user } = useAuth();
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staffOverview, setStaffOverview] = useState<StaffOverview | null>(null);
  const [staffOverviewError, setStaffOverviewError] = useState<string | null>(null);

  const role = user?.roles.includes("ADMIN") ? "ADMIN"
    : user?.roles.includes("LIBRARIAN") ? "LIBRARIAN"
    : user?.roles[0] || "USER";
  const isAdminOrLibrarian = role === "ADMIN" || role === "LIBRARIAN";

  useEffect(() => {
    async function loadData() {
      try {
        setLoadError(null);
        const [b, l, m, f] = await Promise.all([
          api.getBooks(),
          api.getLoans(),
          isAdminOrLibrarian ? api.getMembers() : Promise.resolve({ content: [], totalElements: 0 }),
          api.getFines()
        ]);
        setCatalogTotal(b.totalElements);
        setLoans(l.content);
        setMembersTotal(m.totalElements);
        setFines(f.content);
        if (isAdminOrLibrarian) {
          try {
            setStaffOverview(await api.request<StaffOverview>("/analytics/overview"));
            setStaffOverviewError(null);
          } catch (analyticsError) {
            setStaffOverview(null);
            setStaffOverviewError(analyticsError instanceof Error ? analyticsError.message : "Live operations metrics could not be loaded.");
          }
        } else {
          setStaffOverview(null);
          setStaffOverviewError(null);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdminOrLibrarian]);

  // Operations move constantly — refresh quietly in the background, no spinners.
  useLiveRefresh(() => {
    void (async () => {
      try {
        const [l, f] = await Promise.all([api.getLoans(), api.getFines()]);
        setLoans(l.content);
        setFines(f.content);
        if (isAdminOrLibrarian) {
          try {
            setStaffOverview(await api.request<StaffOverview>("/analytics/overview"));
            setStaffOverviewError(null);
          } catch {
            /* Keep the last good metrics on background ticks. */
          }
        }
      } catch {
        /* A background refresh must never break the visible dashboard. */
      }
    })();
  }, 30000);

  const activeLoans = loans.filter((l) => l.status === "ACTIVE" || l.status === "OVERDUE");
  const overdueLoans = loans.filter((l) => l.status === "OVERDUE");
  const outstandingFines = fines
    .filter((f) => f.status === "OPEN" || f.status === "PARTIAL")
    .reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);

  async function handleFastReturn(barcode: string) {
    try {
      await api.returnBook(barcode);
      setActionNotice(`Item ${barcode} successfully checked in.`);
      const updatedLoans = await api.getLoans();
      setLoans(updatedLoans.content);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Check-in failed: ${err.message || "Operation failed"}`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  }

  return (
    <div className="dashboard-page space-y-6 animate-in fade-in duration-300 pb-12">
      {loadError && (
        <div role="alert" className="dashboard-alert dashboard-alert-error rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={() => window.location.reload()} className="font-semibold underline">Retry</button>
        </div>
      )}
      {/* Welcome Banner */}
      <div className="dashboard-hero relative overflow-hidden rounded-3xl bg-[#0b57d0] text-white p-8 sm:p-10 shadow-lg">
        <div className="dashboard-hero-content relative z-10 max-w-3xl space-y-4">
          <h1 className="dashboard-hero-title text-3xl sm:text-4xl font-bold tracking-tight">
            Welcome back, {user?.fullName?.split(" ")[0] || "reader"}
          </h1>
          <p className="dashboard-hero-description text-[#d3e3fd] text-sm sm:text-base max-w-2xl">
            {isAdminOrLibrarian ? "Your library operations at a glance. Review circulation activity, manage inventory, and resolve overdue items from one workspace." : "Your personal library space is ready. Discover your next read, keep track of active loans, and stay on top of your library account."}
          </p>

          <div className="dashboard-hero-actions pt-4 flex flex-wrap items-center gap-3">
            {isAdminOrLibrarian ? (
              <>
                <Link to="/circulation">
                  <Button className="bg-white text-[#0b57d0] hover:bg-[#f0f4f9] font-bold shadow-sm border-0 rounded-full h-12">
                    <Repeat className="h-4 w-4 mr-2" /> Quick Circulation
                  </Button>
                </Link>
                <Link to="/catalog">
                  <Button variant="outline" className="bg-transparent border-[#c2e7ff] text-white hover:bg-white hover:text-[#0b57d0] rounded-full h-12">
                    <Search className="h-4 w-4 mr-2" /> Search Catalog
                  </Button>
                </Link>
                <Link to="/members">
                  <Button variant="outline" className="bg-transparent border-[#c2e7ff] text-white hover:bg-white hover:text-[#0b57d0] rounded-full h-12">
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Member
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/catalog">
                <Button className="bg-white text-[#0b57d0] hover:bg-[#f0f4f9] font-bold shadow-sm border-0 rounded-full h-12">
                  <Search className="h-4 w-4 mr-2" /> Browse Library Catalog
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-10">
          <Library className="w-64 h-64 text-white" />
        </div>
      </div>

      {actionNotice && (
        <div className="dashboard-alert dashboard-alert-success p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-800 font-medium text-xs">
            DISMISS
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="dashboard-metrics grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-metric-card dashboard-metric-catalog rounded-3xl border border-transparent bg-[#d3e3fd] dark:bg-[#004a77]/30 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#041e49] dark:text-[#c2e7ff]">Total Catalog</span>
            <div className="h-12 w-12 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-4xl font-bold text-[#041e49] dark:text-[#c2e7ff]">{loading ? "-" : catalogTotal}</div>
            <p className="text-sm text-[#0b57d0] dark:text-[#a8c7fa] mt-2 flex items-center gap-1 font-medium">
              <Layers className="h-4 w-4" /> Indexed Titles
            </p>
          </div>
        </div>

        <div className="dashboard-metric-card dashboard-metric-loans rounded-3xl border border-transparent bg-[#e8def8] dark:bg-[#4a4458] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#1d192b] dark:text-[#e8def8]">{isAdminOrLibrarian ? "Active Loans" : "My Loans"}</span>
            <div className="h-12 w-12 rounded-full bg-[#6750a4] dark:bg-[#d0bcff] text-white flex items-center justify-center">
              <Repeat className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-4xl font-bold text-[#1d192b] dark:text-[#e8def8]">{loading ? "-" : (isAdminOrLibrarian ? activeLoans.length : activeLoans.filter(l => l.memberCode === user?.memberCode).length)}</div>
            <p className="text-sm text-[#b3261e] dark:text-[#f2b8b5] mt-2 flex items-center gap-1 font-bold">
              <AlertTriangle className="h-4 w-4" /> {isAdminOrLibrarian ? overdueLoans.length : overdueLoans.filter(l => l.memberCode === user?.memberCode).length} overdue
            </p>
          </div>
        </div>

        {isAdminOrLibrarian && (
          <div className="dashboard-metric-card dashboard-metric-members rounded-3xl border border-transparent bg-[#c4eed0] dark:bg-[#146c2e] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#072711] dark:text-[#c4eed0]">Total Members</span>
              <div className="h-12 w-12 rounded-full bg-[#146c2e] dark:bg-[#c4eed0] text-white flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6">
              <div className="text-4xl font-bold text-[#072711] dark:text-[#c4eed0]">{loading ? "-" : (isAdminOrLibrarian ? membersTotal : "—")}</div>
              <p className="text-sm text-[#146c2e] dark:text-[#c4eed0] mt-2 flex items-center gap-1 font-medium">
                <Award className="h-4 w-4" /> Registered Accounts
              </p>
            </div>
          </div>
        )}

        <div className="dashboard-metric-card dashboard-metric-fines rounded-3xl border border-transparent bg-[#fcedea] dark:bg-[#601410] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#601410] dark:text-[#fcedea]">{isAdminOrLibrarian ? "Outstanding Fines" : "My Fines"}</span>
            <div className="h-12 w-12 rounded-full bg-[#b3261e] dark:bg-[#f2b8b5] text-white flex items-center justify-center">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-4xl font-bold text-[#601410] dark:text-[#fcedea]">₹{(isAdminOrLibrarian ? outstandingFines : fines.filter(f => (f.status === "OPEN" || f.status === "PARTIAL") && f.memberCode === user?.memberCode).reduce((s,f) => s + (f.amount - f.paidAmount), 0)).toFixed(2)}</div>
            <p className="text-sm text-[#b3261e] dark:text-[#f2b8b5] mt-2 flex items-center gap-1 font-medium">
              Unpaid Dues
            </p>
          </div>
        </div>
      </div>

      {isAdminOrLibrarian && (
        <section className="panel dashboard-operations-panel">
          <div className="panel-heading">
            <div><h2><ChartNoAxesCombined size={18}/> Library operations at a glance</h2><p>Current inventory and circulation values fetched from the library database.</p></div>
            <Link to="/analytics" className="button button-secondary">Full analytics <ArrowRight size={15}/></Link>
          </div>
          {staffOverviewError && <div role="alert" className="notice notice-error">Analytics could not be loaded: {staffOverviewError}</div>}
          {staffOverview ? <div className="analytics-metric-grid dashboard-live-metrics">
            {[{label:"Physical copies",value:staffOverview.totalCopies},{label:"Available now",value:staffOverview.availableCopies},{label:"Issued / not returned",value:staffOverview.issuedCopies},{label:"Overdue loans",value:staffOverview.overdueLoans},{label:"Due today",value:staffOverview.dueToday},{label:"Active reservations",value:staffOverview.activeReservations},{label:"Active members",value:staffOverview.activeMembers},...(role==="ADMIN"?[{label:"Pending approvals",value:staffOverview.pendingApprovals},{label:"Suspended users",value:staffOverview.suspendedUsers}]:[])].map(item=><article className="analytics-metric" key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></article>)}
          </div> : !staffOverviewError && <p className="empty-state">Loading operational metrics…</p>}
          <div className="dashboard-operations-actions"><Link to="/approvals"><ShieldCheck size={16}/> Review pending registrations</Link><Link to="/analytics"><CalendarClock size={16}/> Review approaching deadlines</Link><Link to="/notifications"><BellRing size={16}/> Send reminders</Link></div>
        </section>
      )}

      <div className="dashboard-lower-grid grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="dashboard-section-card dashboard-activity-card lg:col-span-2 rounded-3xl border border-transparent bg-white shadow-sm shadow-black/5 overflow-hidden">
          <div className="dashboard-section-header p-6 border-b border-[#e5e7eb] dark:border-[#374151] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1f2937] dark:text-[#f9fafb]">Recent Circulation Activity</h3>
            <Link to="/circulation">
              <Button variant="ghost" size="sm" className="text-[#0b57d0] dark:text-[#a8c7fa] rounded-full">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="p-0">
            {loans.length === 0 ? (
              <p className="text-sm text-[#74777f] dark:text-[#9ca3af] p-8 text-center">No recent activity found.</p>
            ) : (
              <div className="divide-y divide-[#e5e7eb] dark:divide-[#374151]">
                {(isAdminOrLibrarian ? loans : loans.filter(l => l.memberCode === user?.memberCode)).slice(0, 5).map((loan) => {
                  const isOverdue = loan.status === "OVERDUE";
                  const isReturned = loan.status === "RETURNED";
                  return (
                    <div key={loan.id} className="dashboard-loan-row p-5 hover:bg-[#f8fafd] transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-[#fcedea] dark:bg-[#601410] text-[#b3261e] dark:text-[#f2b8b5]" : isReturned ? "bg-[#f3f4f6] dark:bg-[#374151] text-[#4b5563] dark:text-[#9ca3af]" : "bg-[#d3e3fd] dark:bg-[#004a77] text-[#0b57d0] dark:text-[#a8c7fa]"}`}>
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-[#1f2937] dark:text-[#f9fafb] line-clamp-1">{loan.bookTitle}</p>
                          <p className="text-sm text-[#444746] dark:text-[#cbd5e1] mt-0.5">Borrowed by {loan.memberName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                            isReturned ? "bg-[#f3f4f6] dark:bg-[#374151] text-[#4b5563] dark:text-[#9ca3af]" : isOverdue ? "bg-[#fcedea] dark:bg-[#601410] text-[#b3261e] dark:text-[#f2b8b5]" : "bg-[#e8def8] dark:bg-[#4a4458] text-[#1d192b] dark:text-[#e8def8]"
                          }`}>
                            {loan.status}
                          </span>
                          <p className="text-xs text-[#444746] dark:text-[#cbd5e1] mt-1">Due: {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(loan.dueAt))}</p>
                        </div>
                        {!isReturned && isAdminOrLibrarian && (
                          <Button size="sm" variant="secondary" onClick={() => handleFastReturn(loan.copyBarcode || "")} className="rounded-full">
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links / Status */}
        <div className="dashboard-quick-column space-y-6">
          <div className="dashboard-section-card dashboard-quick-actions rounded-3xl border border-[#e5e7eb] bg-white shadow-sm p-6">
            <h3 className="text-base font-bold text-[#1f2937] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {isAdminOrLibrarian && (
                <>
                  <Link to="/circulation">
                    <Button variant="secondary" className="w-full justify-start text-sm rounded-full h-12">
                      <Repeat className="h-4 w-4 mr-3 text-indigo-600" /> Process Returns
                    </Button>
                  </Link>
                  <Link to="/catalog">
                    <Button variant="secondary" className="w-full justify-start text-sm rounded-full h-12">
                      <BookOpen className="h-4 w-4 mr-3 text-emerald-600" /> Add New Book
                    </Button>
                  </Link>
                </>
              )}
              <Link to={isAdminOrLibrarian ? "/fines" : "/catalog"}>
                <Button variant="secondary" className="w-full justify-start text-sm rounded-full h-12">
                  {isAdminOrLibrarian ? (
                    <><CreditCard className="h-4 w-4 mr-3 text-amber-600" /> Collect Fine Payment</>
                  ) : (
                    <><Search className="h-4 w-4 mr-3 text-amber-600" /> Advanced Search</>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          <div className="dashboard-status-card rounded-3xl bg-slate-900 text-white p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="dashboard-status-title font-semibold text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" /> System Status
              </h4>
              <p className="dashboard-status-copy text-sm text-slate-400 mt-2">{loading ? "Checking live library data…" : loadError ? "Some library data could not be loaded. Review the error message above." : "Library data loaded successfully for this session."}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Library className="h-32 w-32" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
