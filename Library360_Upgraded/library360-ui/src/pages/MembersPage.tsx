import { useEffect, useState } from "react";
import { useLiveRefresh } from "../lib/live";
import { api, type Member } from "../api/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { downloadCsv } from "../lib/exportCsv";
import {
  UserPlus,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  Mail,
  X,
  IdCard,
  Trash2
} from "lucide-react";

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCardMember, setSelectedCardMember] = useState<Member | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [memberType, setMemberType] = useState<"STUDENT" | "FACULTY">("STUDENT");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers(quiet = false) {
    try {
      if (!quiet) setLoading(true);
      const res = await api.getMembers();
      setMembers(res.content);
    } catch (e) {
      if (!quiet) {
        setMembers([]);
        setNotification({ type: "error", message: e instanceof Error ? e.message : "Unable to load members." });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  // Membership changes under you — stay live without manual refresh.
  useLiveRefresh(() => { void loadMembers(true); }, 30000);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await api.registerMember({
        fullName,
        email,
        password,
        memberCode: memberCode.trim().toUpperCase(),
        memberType,
        department,
        phone,
        address,
      });

      setNotification({
        type: "success",
        message: `Member ${fullName} (${memberCode}) registered successfully.`
      });
      setModalOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setMemberCode("");
      setDepartment("");
      setPhone("");
      setAddress("");
      loadMembers();
      setSelectedCardMember(created);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to register member."
      });
    }
  }

  async function handleDeleteMember(id: number) {
    if (!window.confirm("Suspend this member? Their history will be preserved, but they will no longer be eligible to borrow books.")) return;
    try {
      await api.deleteMember(id);
      setNotification({
        type: "success",
        message: "Member suspended successfully. Their history has been preserved."
      });
      setSelectedCardMember(null);
      loadMembers();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to suspend member."
      });
    }
  }

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      (m.fullName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(search.toLowerCase()) ||
      (m.department?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || m.memberType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Members Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage library members, students, and faculty accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("library360-members.csv", filteredMembers.map((member) => ({ memberId: member.id, name: member.fullName || "", email: member.email || "", memberCode: member.memberCode, memberType: member.memberType, department: member.department || "", status: member.status, validUntil: member.validUntil })))}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          <Button onClick={() => setModalOpen(true)} className="rounded-full shadow-sm"><UserPlus className="h-4 w-4 mr-2" /> Add Member</Button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in ${
          notification.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {notification.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white/50 backdrop-blur-md p-5 rounded-3xl border border-[#e5e7eb] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#444746]" />
          <Input
            placeholder="Search by name, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 rounded-full bg-white border-transparent focus:bg-white focus:border-[#0b57d0] focus:ring-2 focus:ring-[#c2e7ff] shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#f8fafd] border border-[#e5e7eb] rounded-full p-1.5 shadow-inner">
          {["ALL", "STUDENT", "FACULTY"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                typeFilter === type ? "bg-[#c2e7ff] text-[#001d35] shadow-sm" : "text-[#444746] hover:text-[#1f2937] hover:bg-white"
              }`}
            >
              {type === "ALL" ? "All" : type === "STUDENT" ? "Students" : "Faculty"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[#e5e7eb] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafd] text-[#444746] text-xs uppercase tracking-wider font-bold border-b border-[#e5e7eb]">
              <tr>
                <th className="py-4 px-6">Member Name</th>
                <th className="py-4 px-6">Member ID</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Expires</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading members...</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No members found.</td></tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#f8fafd] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[#d3e3fd] text-[#0b57d0] flex items-center justify-center font-bold text-sm">
                          {member.fullName?.charAt(0) || "M"}
                        </div>
                        <div>
                          <p className="font-bold text-[#1f2937]">{member.fullName}</p>
                          <p className="text-xs text-[#444746] flex items-center gap-1.5 mt-0.5">
                            <Mail className="h-3.5 w-3.5" /> {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-[#444746] font-bold">{member.memberCode}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        member.memberType === "FACULTY" ? "bg-[#e8def8] text-[#4a4458]" : "bg-[#c2e7ff] text-[#001d35]"
                      }`}>
                        {member.memberType}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#444746] text-sm">
                      <span className="flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-[#74777f]" /> {member.department || "General"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#74777f] text-xs font-medium">
                      {new Date(member.validUntil).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedCardMember(member)} className="h-9 rounded-full text-xs font-bold">
                        <IdCard className="h-4 w-4 mr-1.5" /> View Card
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f2937]/40 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6">
            <button onClick={() => setSelectedCardMember(null)} className="absolute top-4 right-4 p-2 text-[#74777f] hover:bg-[#f0f4f9] rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="bg-gradient-to-br from-[#0b57d0] to-[#4a4458] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden mt-6">
              <div className="absolute -right-8 -top-8 opacity-10">
                <IdCard className="h-40 w-40" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] uppercase tracking-widest text-indigo-200 font-semibold mb-4">
                  Library Card
                </div>
                <h3 className="font-bold text-xl leading-tight">{selectedCardMember.fullName}</h3>
                <p className="text-indigo-200 text-xs font-mono mt-1">{selectedCardMember.memberCode}</p>
                
                <div className="mt-6 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-indigo-200 uppercase">Type</div>
                    <div className="text-sm font-semibold">{selectedCardMember.memberType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-indigo-200 uppercase">Valid Thru</div>
                    <div className="text-sm font-semibold">{new Date(selectedCardMember.validUntil).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteMember(selectedCardMember.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Suspend Member
              </Button>
              <div className="flex-1"></div>
              <Button variant="outline" onClick={() => setSelectedCardMember(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl p-6">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" /> Add New Member
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Member ID</label>
                  <Input required value={memberCode} onChange={(e) => setMemberCode(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <Input required type="password" minLength={6} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={memberType}
                    onChange={(e) => setMemberType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit">Create Member</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
