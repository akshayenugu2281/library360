import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"STUDENT" | "FACULTY" | "LIBRARIAN" | "ADMIN">("STUDENT");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("l360_last_email");
      if (savedEmail) setEmail(savedEmail);
    } catch { /* Browser storage may be disabled. */ }
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password, accountType);
      try {
        if (rememberEmail) localStorage.setItem("l360_last_email", email.trim().toLowerCase());
        else localStorage.removeItem("l360_last_email");
      } catch { /* Sign-in should not fail if storage is restricted. */ }
      const destination = searchParams.get("next");
      navigate(destination?.startsWith("/") && !destination.startsWith("//") ? destination : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not sign you in. Check your details and try again.");
    } finally { setLoading(false); }
  }

  return <main className="auth-page">
    <section className="auth-visual-panel">
      <Link to="/" className="auth-brand"><span className="brand-mark"><BookOpen size={23}/></span><span>Library<span>360</span></span></Link>
      <div className="auth-visual-content"><div className="auth-orbit auth-orbit-a"/><div className="auth-orbit auth-orbit-b"/><div className="auth-art-icon"><BookOpen size={39}/><Sparkles size={18}/></div><div className="auth-quote-mark">“</div><h2>A little curiosity<br/>goes a long way.</h2><p>Pick up where you left off, keep your next read close, and make every visit count.</p><div className="auth-visual-footer"><span><ShieldCheck size={15}/> Secure account access</span><span>01 / DISCOVER</span></div></div>
      <div className="auth-panel-bottom"><span>Designed for readers and library teams.</span><span>© Library360</span></div>
    </section>
    <section className="auth-form-panel"><div className="auth-form-wrap">
      <Link to="/" className="auth-back-link"><ArrowLeft size={15}/> Back to home</Link>
      <div className="auth-mobile-brand"><span className="brand-mark"><BookOpen size={22}/></span><span>Library<span>360</span></span></div>
      <div className="auth-form-heading"><div className="auth-form-eyebrow">WELCOME BACK</div><h1>Good to see you.</h1><p>Sign in to pick up right where you left off.</p></div>
      {error && <div role="alert" className="auth-error"><span className="auth-error-icon">!</span><div><strong>Sign-in unsuccessful</strong><p>{error}</p></div></div>}
      <form className="auth-form" onSubmit={handleLogin}>
        <label className="auth-field"><span>Sign in as</span><select value={accountType} onChange={event => setAccountType(event.target.value as "STUDENT" | "FACULTY" | "LIBRARIAN" | "ADMIN")}><option value="STUDENT">Student</option><option value="FACULTY">Faculty</option><option value="LIBRARIAN">Librarian / Library management</option><option value="ADMIN">Administrator</option></select><small>This selection must match the role assigned to your verified account.</small></label>
        <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><Mail size={18}/><input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu"/></div></label>
        <label className="auth-field"><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={18}/><input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password"/><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
        <div className="auth-options"><label className="auth-checkbox"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)}/><span>Remember my email</span></label><Link to="/forgot-password" className="auth-help-note">Forgot password?</Link></div>
        <button className="button button-primary auth-submit" type="submit" disabled={loading}>{loading ? <><span className="button-spinner"/> Signing you in…</> : <>Sign in to Library360 <ArrowRight size={17}/></>}</button>
      </form>
      <div className="auth-form-separator"><span/> <small>YOUR SPACE FOR DISCOVERY</small> <span/></div>
      <p className="auth-switch-line">New to Library360? <Link to="/signup">Create your account <ArrowRight size={14}/></Link></p>
      <div className="auth-footnote"><ShieldCheck size={14}/> Your account is protected by the Library360 authentication service.</div>
    </div></section>
  </main>;
}
