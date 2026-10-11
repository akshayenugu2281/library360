import { useEffect, useState } from "react";
import { useLiveRefresh } from "../lib/live";
import { api, type Fine } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { downloadCsv } from "../lib/exportCsv";
import {
  CheckCircle2,
  RotateCw,
  CreditCard,
  Ban,
  X,
  Receipt,
  Wallet,
  Printer,
  Download
} from "lucide-react";

export function FinesPage() {
  const { user } = useAuth();
  const canManageFines = user?.roles.some((role) => role === "ADMIN" || role === "LIBRARIAN") ?? false;
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pay modal
  const [payFineTarget, setPayFineTarget] = useState<Fine | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState("CARD");

  // Waive modal
  const [waiveFineTarget, setWaiveFineTarget] = useState<Fine | null>(null);
  const [waiveReason, setWaiveReason] = useState("");

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<{ fine: Fine; paid: number; method: string } | null>(null);

  useEffect(() => {
    loadFines();
  }, []);

  async function loadFines(quiet = false) {
    try {
      if (!quiet) setLoading(true);
      const res = await api.getFines();
      setFines(res.content);
    } catch (e) {
      if (!quiet) {
        setFines([]);
        setNotification({ type: "error", message: e instanceof Error ? e.message : "Unable to load fines." });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  // Fines accrue on their own — stay live without manual refresh.
  useLiveRefresh(() => { void loadFines(true); }, 30000);

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payFineTarget) return;

    try {
      await api.payFine(payFineTarget.id, Number(payAmount), payMethod);
      setNotification({ type: "success", message: `Payment of ₹${payAmount.toFixed(2)} recorded successfully.` });
      setReceiptData({ fine: payFineTarget, paid: Number(payAmount), method: payMethod });
      setPayFineTarget(null);
      loadFines();
    } catch (err: any) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Payment failed." });
    }
  }

  async function handleWaiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!waiveFineTarget) return;

    try {
      await api.waiveFine(waiveFineTarget.id, waiveReason);
      setNotification({ type: "success", message: `Fine #${waiveFineTarget.id} successfully waived.` });
      setWaiveFineTarget(null);
      setWaiveReason("");
      loadFines();
    } catch (err: any) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Waiver failed." });
    }
  }

  const totalOutstanding = fines
    .filter((f) => f.status === "OPEN" || f.status === "PARTIAL")
    .reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);

  const totalCollected = fines.reduce((sum, f) => sum + f.paidAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fines & Penalties
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {canManageFines ? "Review fine balances, record collections, and approve waivers." : "Review your assessed fines and outstanding balances."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total Outstanding</div>
              <div className="text-sm font-bold text-red-600">₹{totalOutstanding.toFixed(2)}</div>
            </div>
            <Wallet className="h-6 w-6 text-slate-300" />
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCsv("library360-fines.csv", fines.map((fine) => ({ fineId: fine.id, member: fine.memberName || "", memberCode: fine.memberCode || "", loanId: fine.loanId ?? "", reason: fine.reason, amount: fine.amount, paidAmount: fine.paidAmount, balance: Math.max(0, fine.amount - fine.paidAmount), status: fine.status, createdAt: fine.createdAt })))}><Download className="h-3.5 w-3.5 mr-2" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => void loadFines()}><RotateCw className="h-3.5 w-3.5 mr-2" /> Sync Data</Button>
        </div>
      </div>

      {notification && (
        <div role={notification.type === "error" ? "alert" : "status"} className={`p-4 rounded-lg flex items-center justify-between animate-in fade-in shadow-sm ${notification.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${notification.type === "success" ? "text-emerald-600" : "text-red-600"}`} />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {canManageFines ? "Total Assessed" : "My Assessed Fines"}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ₹{fines.reduce((s, f) => s + f.amount, 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Historical fine total</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Collected
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            ₹{totalCollected.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total revenue collected</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Settlement Rate
          </span>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {fines.length > 0
              ? `${Math.round(((fines.filter((f) => f.status === "PAID" || f.status === "WAIVED").length) / fines.length) * 100)}%`
              : "—"}
          </div>
          <p className="text-xs text-slate-400 mt-1">Percentage of fines closed</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-indigo-500" />
          <h3 className="text-base font-semibold text-slate-900">Fine Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Loading fine data...</td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">No fines found.</td>
                </tr>
              ) : (
                fines.map((fine) => {
                  const balance = fine.amount - fine.paidAmount;
                  const isSettled = fine.status === "PAID" || fine.status === "WAIVED";
                  return (
                    <tr key={fine.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{fine.memberName}</div>
                        <div className="text-xs text-slate-500 font-mono">{fine.memberCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {fine.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">₹{fine.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-emerald-600">₹{fine.paidAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-red-600">₹{balance.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                            fine.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : fine.status === "WAIVED"
                              ? "bg-slate-100 text-slate-600"
                              : fine.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {fine.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManageFines && !isSettled && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => { setPayFineTarget(fine); setPayAmount(balance); }} className="h-8 text-xs">
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setWaiveFineTarget(fine)} className="h-8 text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                              <Ban className="h-3.5 w-3.5 mr-1" /> Waive
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payFineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl p-6">
            <button onClick={() => setPayFineTarget(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Record Payment</h3>
            <p className="text-xs text-amber-700 mb-3">No payment gateway is configured. This action records a payment entry for administrative bookkeeping; do not use it as proof of a real card/UPI transaction.</p>
            <p className="text-xs text-slate-500 mb-5">
              For {payFineTarget.memberName} ({payFineTarget.memberCode})
            </p>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payFineTarget.amount - payFineTarget.paidAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI / Digital</option>
                  <option value="CASH">Cash</option>
                  <option value="ACCOUNT">Student Account</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPayFineTarget(null)}>Cancel</Button>
                <Button type="submit">Record Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {waiveFineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl p-6">
            <button onClick={() => setWaiveFineTarget(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" /> Waive Fine
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This action cannot be undone.
            </p>

            <form onSubmit={handleWaiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Waiver</label>
                <Input required placeholder="e.g. Approved by Dean" value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setWaiveFineTarget(null)}>Cancel</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">Confirm Waiver</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl p-6">
            <button onClick={() => setReceiptData(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center pb-4 border-b border-slate-100 mb-4">
              <Receipt className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <h3 className="font-bold text-lg text-slate-900">Payment Receipt</h3>
              <p className="text-xs text-slate-500">Library Services</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Receipt No:</span>
                <span className="font-mono">RC-{Date.now().toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Member:</span>
                <span className="font-medium">{receiptData.fine.memberName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ID:</span>
                <span className="font-mono">{receiptData.fine.memberCode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Method:</span>
                <span className="font-medium">{receiptData.method}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-100">
                <span>Amount Paid:</span>
                <span>₹{receiptData.paid.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiptData(null)}>Close</Button>
              <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
