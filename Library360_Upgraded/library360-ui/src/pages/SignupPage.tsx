import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type RegistrationInput, type RegistrationResult, type SignupFieldRule } from "../api/client";
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, ClipboardCheck } from "lucide-react";

const FALLBACK_FIELDS: Record<"STUDENT" | "FACULTY", SignupFieldRule[]> = {
  STUDENT: [
    ["phoneNumber","Mobile number",true], ["dateOfBirth","Date of birth",true], ["admissionNumber","Admission number",true],
    ["rollNumber","Roll number",true], ["branch","Branch / department",true], ["academicYear","Academic year",true],
    ["className","Class / programme",true], ["section","Section",true],
  ].map(([fieldKey,label,required],i)=>({accountType:"STUDENT",fieldKey:String(fieldKey),label:String(label),enabled:true,required:Boolean(required),sortOrder:i})),
  FACULTY: [
    ["phoneNumber","Mobile number",true], ["dateOfBirth","Date of birth",false], ["facultyId","Faculty ID",true],
    ["employeeNumber","Employee number",false], ["department","Department",true], ["designation","Designation",true],
  ].map(([fieldKey,label,required],i)=>({accountType:"FACULTY",fieldKey:String(fieldKey),label:String(label),enabled:true,required:Boolean(required),sortOrder:i})),
};
const FIELD_TYPES: Record<string, string> = { dateOfBirth:"date", phoneNumber:"tel", academicYear:"text" };
// Backend @Size limits from PublicRegisterRequest — keep in sync to avoid "Validation failed" surprises.
const FIELD_MAXLENGTH: Record<string, number> = {
  phoneNumber: 30, admissionNumber: 40, rollNumber: 40, facultyId: 40, employeeNumber: 40,
  branch: 80, academicYear: 30, className: 50, section: 20, department: 100, designation: 100,
};

function dobError(value: string): string | null {
  if (!value) return null;
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "Enter a valid date of birth.";
  const now = new Date();
  const min = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
  const max = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
  if (dob > max || dob < min) return "You must be between 16 and 100 years old.";
  return null;
}

function dobBounds(): { min: string; max: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    min: fmt(new Date(now.getFullYear() - 100, now.getMonth(), now.getDate())),
    max: fmt(new Date(now.getFullYear() - 16, now.getMonth(), now.getDate())),
  };
}

function formatRegisterError(err: unknown): string {
  if (err instanceof ApiError && err.fields) {
    const parts = Object.entries(err.fields).map(([k, v]) => `${k}: ${v}`);
    if (parts.length) return `${err.message} (${parts.slice(0, 3).join("; ")})`;
  }
  return err instanceof Error ? err.message : "We could not submit your registration. Please try again.";
}

export function SignupPage() {
  const { signup } = useAuth();
  const [accountType, setAccountType] = useState<"STUDENT"|"FACULTY">("STUDENT");
  const [rules, setRules] = useState<SignupFieldRule[]>(FALLBACK_FIELDS.STUDENT);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fullName, setFullName] = useState({ firstName:"", lastName:"" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [values, setValues] = useState<Record<string,string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const passwordChecks = useMemo(() => ({ length: password.length >= 6 && password.length <= 72, combo: /[A-Za-z]/.test(password) && /\d/.test(password) }), [password]);
  const passwordReady = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    let active = true;
    setFieldsLoading(true);
    api.request<SignupFieldRule[]>(`/auth/signup-fields?accountType=${accountType}`)
      .then((rows) => { if (active) setRules(rows.length ? rows : FALLBACK_FIELDS[accountType]); })
      .catch(() => { if (active) setRules(FALLBACK_FIELDS[accountType]); })
      .finally(() => { if (active) setFieldsLoading(false); });
    setValues({}); setError(null); setResult(null);
    return () => { active = false; };
  }, [accountType]);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    if (!passwordReady) { setError("Use at least 6 characters with both letters and numbers."); return; }
    if (!passwordsMatch) { setTouchedConfirm(true); setError("The passwords do not match."); return; }
    if (!fullName.firstName.trim() || !fullName.lastName.trim()) { setError("Enter both your first name and last name."); return; }
    if (`${fullName.firstName.trim()} ${fullName.lastName.trim()}`.length > 120) { setError("First name and last name together must be 120 characters or fewer."); return; }
    for (const rule of rules) if (rule.enabled && rule.required && !String(values[rule.fieldKey] || "").trim()) { setError(`${rule.label} is required.`); return; }
    if (values.dateOfBirth) {
      const err = dobError(values.dateOfBirth);
      if (err) { setError(err); return; }
    }
    setLoading(true);
    const input: RegistrationInput = {
      firstName: fullName.firstName.trim(), lastName: fullName.lastName.trim(), email: email.trim(), password, accountType,
      phoneNumber: values.phoneNumber || undefined, dateOfBirth: values.dateOfBirth || undefined,
      admissionNumber: values.admissionNumber || undefined, rollNumber: values.rollNumber || undefined,
      branch: values.branch || undefined, academicYear: values.academicYear || undefined,
      className: values.className || undefined, section: values.section || undefined,
      facultyId: values.facultyId || undefined, employeeNumber: values.employeeNumber || undefined,
      department: values.department || undefined, designation: values.designation || undefined,
    };
    try { setResult(await signup(input)); }
    catch (err) { setError(formatRegisterError(err)); }
    finally { setLoading(false); }
  }

  return <main className="auth-page auth-signup-page">
    <section className="auth-visual-panel signup-visual-panel">
      <Link to="/" className="auth-brand"><span className="brand-mark"><BookOpen size={23}/></span><span>Library<span>360</span></span></Link>
      <div className="auth-visual-content"><div className="auth-orbit auth-orbit-a"/><div className="auth-orbit auth-orbit-b"/><div className="signup-art-stack"><div className="stack-book stack-book-a"><span>THE<br/>CREATIVE<br/>MIND</span></div><div className="stack-book stack-book-b"><span>LEARN<br/>BY DOING</span></div><div className="stack-book stack-book-c"><span>WONDER<br/>MORE</span></div><div className="stack-spark"><Sparkles size={27}/></div></div><div className="auth-quote-mark">“</div><h2>Your college library,<br/>all in one place.</h2><p>Find a book, reserve a copy, track return dates and connect with your library team.</p><div className="auth-visual-footer"><span><ShieldCheck size={15}/> Verified college accounts</span><span>02 / BEGIN</span></div></div>
      <div className="auth-panel-bottom"><span>Student and Faculty registration</span><span>© Library360</span></div>
    </section>
    <section className="auth-form-panel"><div className="auth-form-wrap signup-form-wrap">
      <Link to="/" className="auth-back-link"><ArrowLeft size={15}/> Back to home</Link><div className="auth-mobile-brand"><span className="brand-mark"><BookOpen size={22}/></span><span>Library<span>360</span></span></div>
      {result ? <div className="registration-result" role="status"><div className="registration-result-icon"><ClipboardCheck size={30}/></div><div className="auth-form-eyebrow">REGISTRATION SUBMITTED</div><h1>One step from your library.</h1><p>{result.message}</p><div className="registration-summary"><span>Account type</span><strong>{result.accountType === "STUDENT" ? "Student" : "Faculty"}</strong><span>Email</span><strong>{result.email}</strong><span>Status</span><strong><span className="status-pill status-pending">Pending verification</span></strong></div><p className="auth-note">For privacy and college record integrity, a Librarian or Admin must verify your submitted details. You cannot sign in until your account is approved.</p><Link className="button button-primary auth-submit" to="/login">Continue to sign in <ArrowRight size={17}/></Link></div> : <>
        <div className="auth-form-heading"><div className="auth-form-eyebrow">YOUR NEXT CHAPTER</div><h1>Create your account.</h1><p>Choose your college role and complete the required details.</p></div>
        {error && <div role="alert" className="auth-error"><span className="auth-error-icon">!</span><div><strong>Registration not submitted</strong><p>{error}</p></div></div>}
        <form className="auth-form college-signup-form" onSubmit={handleSignup}>
          <label className="auth-field"><span>Register as</span><select value={accountType} onChange={e=>setAccountType(e.target.value as "STUDENT"|"FACULTY")}><option value="STUDENT">Student</option><option value="FACULTY">Faculty</option></select><small>{accountType === "STUDENT" ? "Use the admission and academic details in your college records." : "Use the Faculty ID provided by your college."}</small></label>
          <div className="signup-two-column"><label className="auth-field"><span>First name</span><div className="auth-input-wrap"><UserRound size={17}/><input autoComplete="given-name" required maxLength={80} value={fullName.firstName} onChange={e=>setFullName(v=>({...v,firstName:e.target.value}))} placeholder="First name"/></div></label><label className="auth-field"><span>Last name</span><div className="auth-input-wrap"><UserRound size={17}/><input autoComplete="family-name" required maxLength={80} value={fullName.lastName} onChange={e=>setFullName(v=>({...v,lastName:e.target.value}))} placeholder="Last name"/></div></label></div>
          <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><Mail size={18}/><input type="email" autoComplete="email" required maxLength={160} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@college.edu"/></div></label>
          <div className="signup-dynamic-fields">{rules.filter(r=>r.enabled).map(rule=>{ const isDob = rule.fieldKey === "dateOfBirth"; const bounds = isDob ? dobBounds() : null; return <label className="auth-field" key={rule.fieldKey}><span>{rule.label}{rule.required?" *":""}</span><div className="auth-input-wrap"><input type={FIELD_TYPES[rule.fieldKey] || "text"} autoComplete={rule.fieldKey === "phoneNumber" ? "tel" : "off"} required={rule.required} maxLength={FIELD_MAXLENGTH[rule.fieldKey] ?? 100} min={bounds?.min} max={bounds?.max} aria-describedby={isDob ? "dob-help" : undefined} value={values[rule.fieldKey] || ""} onChange={e=>setValues(v=>({...v,[rule.fieldKey]:e.target.value}))} placeholder={rule.label}/></div>{isDob && <small id="dob-help" className="auth-help-note">You must be between 16 and 100 years old.</small>}</label>;})}</div>
          {fieldsLoading && <p className="auth-help-note">Loading the college’s configured signup requirements…</p>}
          <label className="auth-field"><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={18}/><input type={showPassword?"text":"password"} autoComplete="new-password" required minLength={6} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a password"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
          <div className="password-requirements"><span className="password-rules-title">Password requirements</span><div className="password-rule-grid"><span className={passwordChecks.length?"passed":""}><Check size={13}/> 6–72 characters</span><span className={passwordChecks.combo?"passed":""}><Check size={13}/> Letters + numbers</span></div></div>
          <label className="auth-field"><span>Confirm password</span><div className={`auth-input-wrap ${touchedConfirm&&!passwordsMatch?"input-invalid":""}`}><LockKeyhole size={18}/><input type={showPassword?"text":"password"} autoComplete="new-password" required minLength={6} maxLength={72} value={confirmPassword} onBlur={()=>setTouchedConfirm(true)} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your password"/></div>{touchedConfirm&&!passwordsMatch&&<small className="field-error">Passwords do not match.</small>}</label>
          <div className="signup-role-note"><ShieldCheck size={16}/><p><strong>Verification required</strong><span>Student and Faculty accounts are reviewed by a Librarian or Admin before login is enabled. Staff roles cannot be self-assigned.</span></p></div>
          <button className="button button-primary auth-submit" type="submit" disabled={loading||fieldsLoading}>{loading?<><span className="button-spinner"/> Submitting registration…</>:<>Submit for verification <ArrowRight size={17}/></>}</button>
        </form>
        <div className="auth-form-separator"><span/><small>YOUR SPACE FOR DISCOVERY</small><span/></div><p className="auth-switch-line">Already have an account? <Link to="/login">Sign in <ArrowRight size={14}/></Link></p><div className="signup-role-note signup-staff-provision-note"><ShieldCheck size={16}/><p><strong>Librarian / Library Management / Admin?</strong><span>Privileged accounts are created or assigned by an authorized Admin. Public signup cannot grant staff access. Ask your college library administrator for an account.</span></p></div><div className="auth-footnote"><ShieldCheck size={14}/> Admin-configured fields · Account data is private</div>
      </>}
    </div></section>
  </main>;
}
