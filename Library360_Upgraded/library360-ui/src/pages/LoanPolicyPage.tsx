import { useEffect, useState, type FormEvent } from "react";
import { BookOpenCheck, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { api } from "../api/client";

type MemberType = "STUDENT" | "FACULTY";
type Policy = {
  memberType: MemberType; maxLoans: number; loanDays: number; maxRenewals: number;
  maxReservations: number; finePerDay: number; fineCap: number;
  blockFineThreshold: number; holdHours: number;
};
const defaults: Policy[] = [
  { memberType: "STUDENT", maxLoans: 3, loanDays: 20, maxRenewals: 2, maxReservations: 3, finePerDay: 5, fineCap: 200, blockFineThreshold: 100, holdHours: 12 },
  { memberType: "FACULTY", maxLoans: 10, loanDays: 30, maxRenewals: 3, maxReservations: 10, finePerDay: 2, fineCap: 200, blockFineThreshold: 300, holdHours: 12 },
];
const fields: Array<{ key: keyof Omit<Policy, "memberType">; label: string; help: string; min: number; max: number; step?: number }> = [
  { key: "maxLoans", label: "Maximum active books", help: "Maximum current loans per member.", min: 1, max: 50 },
  { key: "loanDays", label: "Loan duration (days)", help: "Standard issue period for each new loan (20 days default).", min: 1, max: 365 },
  { key: "maxRenewals", label: "Renewal limit", help: "Maximum renewals per loan.", min: 0, max: 20 },
  { key: "maxReservations", label: "Active reservations", help: "Maximum queued/ready holds per member.", min: 0, max: 100 },
  { key: "finePerDay", label: "Fine per overdue day (₹)", help: "Applied by the overdue accrual job.", min: 0, max: 10000, step: 0.5 },
  { key: "fineCap", label: "Fine cap per loan (₹)", help: "Maximum accumulated overdue charge for one loan.", min: 0, max: 100000, step: 1 },
  { key: "blockFineThreshold", label: "Borrowing block threshold (₹)", help: "Members at or above this outstanding balance cannot borrow.", min: 0, max: 100000, step: 1 },
  { key: "holdHours", label: "Reservation pickup window (hours)", help: "How long an assigned copy is held before it expires to the next in queue (12 hours default).", min: 1, max: 336 },
];
export function LoanPolicyPage() {
  const [rows, setRows] = useState<Policy[]>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<MemberType | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const result = await api.request<Policy[]>("/admin/loan-policies"); setRows(result.length ? result : defaults); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load borrowing policies."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function edit(type: MemberType, key: keyof Omit<Policy, "memberType">, value: number) {
    setRows(old => old.map(r => r.memberType === type ? { ...r, [key]: value } : r));
  }
  async function save(event: FormEvent, row: Policy) {
    event.preventDefault(); setError(""); setNotice(""); setSaving(row.memberType);
    if (row.fineCap < row.finePerDay) { setError(`${row.memberType}: the fine cap must be at least one day's fine.`); setSaving(null); return; }
    try {
      await api.request<Policy>(`/admin/loan-policies/${row.memberType}`, { method: "PUT", body: JSON.stringify({ ...row, memberType: undefined }) });
      setNotice(`${row.memberType === "STUDENT" ? "Student" : "Faculty"} borrowing and fine policy saved.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the policy."); }
    finally { setSaving(null); }
  }
  return <div className="page-stack">
    <header className="page-heading"><div><div className="eyebrow">ADMINISTRATION / LIBRARY OPERATIONS</div><h1>Borrowing & fine policies</h1><p>Control lending limits, reservation holds and overdue-fine rules separately for Students and Faculty.</p></div><button type="button" className="button button-secondary" onClick={() => void load()}><RefreshCw size={16}/> Refresh policies</button></header>
    {error && <div role="alert" className="notice notice-error">{error}</div>}{notice && <div role="status" className="notice notice-success">{notice}</div>}
    <div className="notice notice-info"><ShieldCheck size={17}/><span>Policy changes affect future circulation calculations. They do not rewrite the original due date of books that have already been issued. Review college rules before changing fines.</span></div>
    {loading ? <div className="panel empty-state">Loading current borrowing policies…</div> : <div className="policy-card-grid">{rows.map(row => <form className="panel policy-card" key={row.memberType} onSubmit={event => void save(event, row)}>
      <div className="panel-heading"><div><span className={`status-pill ${row.memberType === "FACULTY" ? "status-info" : "status-pending"}`}>{row.memberType}</span><h2>{row.memberType === "STUDENT" ? "Student policy" : "Faculty policy"}</h2><p>{row.memberType === "STUDENT" ? "Standard student borrowing privileges." : "Higher borrowing priority and longer default loan period."}</p></div><BookOpenCheck size={22}/></div>
      <div className="policy-fields">{fields.map(field => <label key={field.key}><span>{field.label}</span><input type="number" min={field.min} max={field.max} step={field.step ?? 1} value={row[field.key]} onChange={event => edit(row.memberType, field.key, Number(event.target.value))} required/><small>{field.help}</small></label>)}</div>
      <button className="button button-primary" type="submit" disabled={saving !== null}>{saving === row.memberType ? <><span className="button-spinner"/> Saving…</> : <><Save size={16}/> Save {row.memberType === "STUDENT" ? "Student" : "Faculty"} policy</>}</button>
    </form>)}</div>}
    <p className="analytics-footnote">Late fees are assessed by the scheduled backend maintenance process and finalized at return. A real payment gateway is not connected; payments collected through the application are library ledger records.</p>
  </div>;
}
