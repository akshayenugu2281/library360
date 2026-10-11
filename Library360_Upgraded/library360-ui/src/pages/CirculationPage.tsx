import { useEffect, useState } from "react";
import { api, type Loan, type Member } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  BookMarked,
  X,
  Printer,
  Search,
  ScanBarcode,
  Library,
  Download
} from "lucide-react";
import { downloadCsv } from "../lib/exportCsv";
import { useNow, dueLabel } from "../lib/circulation";
import { useLiveRefresh } from "../lib/live";

export function CirculationPage() {
  const { user } = useAuth();
  const isStaff = user?.roles.some((role) => role === "ADMIN" || role === "LIBRARIAN") ?? false;
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [issueBarcode, setIssueBarcode] = useState("");
  const [issueMemberId, setIssueMemberId] = useState("");
  const [returnBarcode, setReturnBarcode] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "OVERDUE" | "RETURNED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [slipLoan, setSlipLoan] = useState<Loan | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const now = useNow(60000);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(quiet = false) {
    try {
      if (!quiet) setLoading(true);
      const loansRequest = api.getLoans();
      const membersRequest = isStaff
        ? api.getMembers()
        : Promise.resolve({ content: [] as Member[], totalElements: 0 });
      const [l, m] = await Promise.all([loansRequest, membersRequest]);
      setLoans(l.content);
      setMembers(m.content);
    } catch (e) {
      if (!quiet) {
        setLoans([]);
        setMembers([]);
        setNotification({ type: "error", message: e instanceof Error ? e.message : "Unable to load circulation data." });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  // Loans change under you (returns, renewals, fines) — stay live without manual sync.
  useLiveRefresh(() => { void loadData(true); }, 30000);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueBarcode || !issueMemberId) return;

    try {
      const newLoan = await api.issueBook(issueBarcode.trim(), Number(issueMemberId));
      setNotification({
        type: "success",
        message: `Book [${issueBarcode}] successfully issued to member #${issueMemberId}.`
      });
      setIssueBarcode("");
      setIssueMemberId("");
      await loadData();
      setSlipLoan(newLoan);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to issue book."
      });
    }
  }

  async function handleReturn(barcodeToReturn?: string) {
    const code = barcodeToReturn || returnBarcode;
    if (!code) return;

    try {
      const res = await api.returnBook(code.trim());
      const fineNotice = res.fine ? ` Note: A fine of ₹${res.fine.amount} was assessed.` : "";
      setNotification({
        type: "success",
        message: `Book [${code}] returned successfully.${fineNotice}`
      });
      setReturnBarcode("");
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to process return."
      });
    }
  }

  async function handleRenew(loanId: number) {
    try {
      const renewedLoan = await api.renewLoan(loanId);
      const dueDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(renewedLoan.dueAt));
      setNotification({
        type: "success",
        message: `Loan #${loanId} renewed. New due date: ${dueDate}.`
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Renewal failed. Book may have pending reservations."
      });
    }
  }

  const selectedMemberObj = members.find((m) => m.id === Number(issueMemberId));

  const filteredLoans = loans.filter((l) => {
    const matchesStatus = filterStatus === "ALL" || l.status === filterStatus;
    const matchesSearch =
      (l.bookTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.copyBarcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.memberName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.memberCode || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isStaff ? "Circulation Desk" : "My Loans"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isStaff ? "Issue and return items, and review circulation records." : "Review your borrowing history and renew eligible active loans."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv("library360-loans.csv", filteredLoans.map((loan) => ({ loanId: loan.id, book: loan.bookTitle || "", barcode: loan.copyBarcode || "", member: loan.memberName || "", memberCode: loan.memberCode || "", issuedAt: loan.issuedAt, dueAt: loan.dueAt, returnedAt: loan.returnedAt || "", status: loan.status, renewals: loan.renewCount })))} className="text-xs"><Download className="h-3.5 w-3.5 mr-2" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => void loadData()} className="text-xs"><RotateCw className="h-3.5 w-3.5 mr-2" /> Sync Data</Button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in ${
          notification.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {notification.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

      {isStaff && (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Issue Book */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ScanBarcode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Checkout Book</h2>
              <p className="text-xs text-slate-500">Assign a book to a registered member</p>
            </div>
          </div>

          <form onSubmit={handleIssue} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Book Barcode
              </label>
              <Input
                placeholder="Enter barcode..."
                value={issueBarcode}
                onChange={(e) => setIssueBarcode(e.target.value)}
                required
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Member
              </label>
              <select
                value={issueMemberId}
                onChange={(e) => setIssueMemberId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Select a member...</option>
                {members.filter((m) => m.status === "ACTIVE").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.memberCode})
                  </option>
                ))}
              </select>

              {selectedMemberObj && (
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                  <div className="flex justify-between font-medium text-slate-900">
                    <span>{selectedMemberObj.fullName}</span>
                    <span className="text-indigo-600">{selectedMemberObj.memberType}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: <span className="text-emerald-600 font-medium">Active</span>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-10">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Issue Book
            </Button>
          </form>
        </div>

        {/* Return Book */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Return Book</h2>
              <p className="text-xs text-slate-500">Check-in a returned book</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Book Barcode
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan barcode..."
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={() => handleReturn()}
                  disabled={!returnBarcode}
                  className="shrink-0"
                >
                  Check In
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm space-y-2 text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Library className="h-4 w-4 text-indigo-500" /> Automated Processing
              </div>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>Late returns will automatically generate fines.</li>
                <li>When a copy is assigned to a hold, its status appears under My Holds; outbound notifications are not configured.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Loans Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-900">{isStaff ? "Circulation Records" : "My Circulation Records"}</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Filter records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-1 w-full sm:w-auto">
              {(["ALL", "ACTIVE", "OVERDUE", "RETURNED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filterStatus === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Book Details</th>
                <th className="py-3 px-4">{isStaff ? "Member" : "Account"}</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading records...</td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No records found.</td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const isOverdue = loan.status === "OVERDUE";
                  const isReturned = loan.status === "RETURNED";
                  const due = !isReturned ? dueLabel(loan.dueAt, now) : null;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 max-w-[200px] truncate">{loan.bookTitle}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{loan.copyBarcode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{loan.memberName}</div>
                        <div className="text-xs text-slate-500">{loan.memberCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(loan.issuedAt))}
                      </td>
                      <td className="py-3 px-4">
                        <span className={isOverdue ? "text-red-600 font-semibold" : "text-slate-900"}>
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(loan.dueAt))}
                        </span>
                        {due && (
                          <div className={`text-xs font-semibold mt-0.5 ${due.overdue ? "text-red-600" : due.urgent ? "text-amber-600" : "text-slate-500"}`}>{due.text}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          isReturned ? "bg-slate-100 text-slate-600" : isOverdue ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSlipLoan(loan)} className="h-8 w-8 p-0" title="Print Slip">
                            <Printer className="h-4 w-4" />
                          </Button>
                          {!isReturned && (
                            <>
                              {loan.status === "ACTIVE" && (
                                <Button size="sm" variant="outline" onClick={() => handleRenew(loan.id)} className="h-8 text-xs">
                                  Renew
                                </Button>
                              )}
                              {isStaff && (
                                <Button size="sm" onClick={() => handleReturn(loan.copyBarcode)} className="h-8 text-xs">
                                  Return
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {slipLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl p-6">
            <button onClick={() => setSlipLoan(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X className="h-4 w-4" />
            </button>

            <div className="text-center pb-4 border-b border-slate-200">
              <Library className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <h3 className="font-bold text-lg text-slate-900">Library Receipt</h3>
              <p className="text-xs text-slate-500">Library360 {isStaff ? "Circulation Desk" : "Loan Record"}</p>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between pb-1 border-b border-slate-100">
                <span className="text-slate-500">Book:</span>
                <strong className="text-right max-w-[180px] truncate">{slipLoan.bookTitle}</strong>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-100">
                <span className="text-slate-500">Barcode:</span>
                <span className="font-mono">{slipLoan.copyBarcode}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-100">
                <span className="text-slate-500">Member:</span>
                <span>{slipLoan.memberName}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-100">
                <span className="text-slate-500">Date:</span>
                <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(slipLoan.issuedAt))}</span>
              </div>
              <div className="flex justify-between pb-1 font-semibold text-slate-900 mt-2">
                <span>DUE DATE:</span>
                <span className="text-indigo-600">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(slipLoan.dueAt))}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSlipLoan(null)}>Close</Button>
              <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
