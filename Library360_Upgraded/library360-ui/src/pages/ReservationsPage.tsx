import { useEffect, useState } from "react";
import { api, type Reservation } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { useNow, formatCountdown, estimateLabel } from "../lib/circulation";
import { useLiveRefresh } from "../lib/live";
import {
  BookmarkCheck,
  CheckCircle2,
  Clock,
  RotateCw,
  XCircle,
  X,
  ListTodo,
  Download
} from "lucide-react";
import { downloadCsv } from "../lib/exportCsv";

export function ReservationsPage() {
  const { user } = useAuth();
  const isStaff = user?.roles.some((role) => role === "ADMIN" || role === "LIBRARIAN") ?? false;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const now = useNow(30000);

  useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations(quiet = false) {
    try {
      if (!quiet) setLoading(true);
      const res = await api.getReservations();
      setReservations(res.content);
    } catch (e) {
      if (!quiet) {
        setReservations([]);
        setNotification({ type: "error", message: e instanceof Error ? e.message : "Unable to load reservations." });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  // Queue moves on its own (returns, expiries) — stay live without manual sync.
  useLiveRefresh(() => { void loadReservations(true); }, 30000);

  async function handleCancel(id: number) {
    try {
      await api.cancelReservation(id);
      setNotification({ type: "success", message: `Reservation #${id} was successfully cancelled.` });
      loadReservations();
    } catch (err: any) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Failed to cancel reservation." });
    }
  }

  const readyReservations = reservations.filter((r) => r.status === "READY");
  const queuedReservations = reservations.filter((r) => r.status === "QUEUED");

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isStaff ? "Reservations" : "My Holds"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isStaff ? "Manage the reservation queue and pickup assignments." : "Track your queued holds, pickup deadlines, and reservation history."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv("library360-reservations.csv", reservations.map((reservation) => ({ reservationId: reservation.id, book: reservation.bookTitle || "", isbn: reservation.bookIsbn || "", member: reservation.memberName || "", memberCode: reservation.memberCode || "", status: reservation.status, queuePosition: reservation.queuePosition ?? "", queueLength: reservation.queueLength ?? "", queuedAt: reservation.queuedAt, readyAt: reservation.readyAt || "", expiresAt: reservation.expiresAt || "", barcode: reservation.assignedBarcode || "", accession: reservation.assignedAccession || "" })))}><Download className="h-3.5 w-3.5 mr-2" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => void loadReservations()}><RotateCw className="h-3.5 w-3.5 mr-2" /> Sync Queue</Button>
        </div>
      </div>

      {notification && (
        <div role={notification.type === "error" ? "alert" : "status"} className={`p-4 rounded-lg flex items-center justify-between animate-in fade-in shadow-sm ${notification.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {notification.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Queued Holds
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {queuedReservations.length} Pending
            </div>
            <p className="text-xs text-slate-500">
              Waiting for book returns
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookmarkCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ready for Pickup
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {readyReservations.length} Available
            </div>
            <p className="text-xs text-slate-500">
              {isStaff ? "Review hold pickup deadlines" : "Review the listed pickup deadline"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-indigo-500" />
          <h3 className="text-base font-semibold text-slate-900">Waitlist Queue</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">{isStaff ? "Member" : "Account"}</th>
                <th className="py-3 px-4">Queued On</th>
                <th className="py-3 px-4">Pickup / Estimate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading queue data...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active reservations found.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => {
                  const isReady = res.status === "READY";
                  const isQueued = res.status === "QUEUED";
                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 truncate max-w-[200px]">{res.bookTitle}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">ISBN: {res.bookIsbn}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{res.memberName}</div>
                        <div className="text-xs text-slate-500 font-mono">{res.memberCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(res.queuedAt))}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {res.expiresAt ? (
                          <span className="font-medium text-amber-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatCountdown(res.expiresAt, now)}
                          </span>
                        ) : isQueued ? (
                          <span className="text-slate-600">{estimateLabel(res.estimatedAvailableAt, now)}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                        {res.expiresAt && (
                          <div className="text-xs text-slate-500 mt-0.5">Collect by {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(res.expiresAt))}</div>
                        )}
                        {isQueued && res.estimatedAvailableAt && (
                          <div className="text-xs text-slate-400 mt-0.5">*Estimate from live returns, not a promise</div>
                        )}
                        {isReady && res.assignedAccession && (
                          <div className="text-xs text-slate-500 font-mono mt-0.5">Copy {res.assignedAccession}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                            isReady
                              ? "bg-emerald-50 text-emerald-700"
                              : isQueued
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isReady ? "Ready for Pickup" : isQueued && res.queuePosition ? `Queued #${res.queuePosition} of ${res.queueLength}` : `Queued`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(isQueued || isReady) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(res.id)}
                            className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                          </Button>
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
    </div>
  );
}
