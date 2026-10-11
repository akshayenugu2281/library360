import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { api } from "../api/client";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const passwordOk = newPassword.length >= 6 && newPassword.length <= 72
    && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setDone(null);
    if (!email.trim()) { setError("Enter your account email address."); return; }
    if (!phoneNumber.trim() && !dateOfBirth) {
      setError("Enter the mobile number or date of birth from your college profile so we can verify it is you.");
      return;
    }
    if (!passwordOk) { setError("Use at least 6 characters with both letters and numbers."); return; }
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setLoading(true);
    try {
      const result = await api.request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          phoneNumber: phoneNumber.trim() || null,
          dateOfBirth: dateOfBirth || null,
          newPassword,
        }),
      });
      setDone(result.message);
      setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not reset your password. Please try again.");
    } finally { setLoading(false); }
  }

  return <main className="auth-page">
    <section className="auth-visual-panel">
      <Link to="/" className="auth-brand"><span className="brand-mark"><BookOpen size={23}/></span><span>Library<span>360</span></span></Link>
      <div className="auth-visual-content"><div className="auth-orbit auth-orbit-a"/><div className="auth-orbit auth-orbit-b"/><div className="auth-quote-mark">&ldquo;</div><h2>Locked out?<br/>Let&rsquo;s get you back in.</h2><p>Verify your college identity with your account email plus your mobile number or date of birth, then choose a new password.</p><div className="auth-visual-footer"><span><ShieldCheck size={15}/> Identity-checked reset</span><span>03 / RECOVER</span></div></div>
      <div className="auth-panel-bottom"><span>Password recovery</span><span>&copy; Library360</span></div>
    </section>
    <section className="auth-form-panel"><div className="auth-form-wrap">
      <Link to="/login" className="auth-back-link"><ArrowLeft size={15}/> Back to sign in</Link>
      <div className="auth-mobile-brand"><span className="brand-mark"><BookOpen size={22}/></span><span>Library<span>360</span></span></div>
      {done ? <>
        <div className="auth-form-heading"><div className="auth-form-eyebrow">PASSWORD RESET</div><h1>All set.</h1><p>{done}</p></div>
        <Link className="button button-primary auth-submit" to="/login">Continue to sign in <ArrowRight size={17}/></Link>
      </> : <>
        <div className="auth-form-heading"><div className="auth-form-eyebrow">ACCOUNT RECOVERY</div><h1>Reset your password.</h1><p>Approved accounts only. Pending accounts must be verified by the library first.</p></div>
        {error && <div role="alert" className="auth-error"><span className="auth-error-icon">!</span><div><strong>Could not reset password</strong><p>{error}</p></div></div>}
        <form className="auth-form" onSubmit={handleReset}>
          <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><Mail size={18}/><input type="email" autoComplete="email" required maxLength={160} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@college.edu"/></div></label>
          <label className="auth-field"><span>Mobile number (from your profile)</span><div className="auth-input-wrap"><input type="tel" autoComplete="tel" maxLength={30} value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} placeholder="As saved in your profile"/></div></label>
          <label className="auth-field"><span>Date of birth (from your profile)</span><div className="auth-input-wrap"><input type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)}/></div><small className="auth-help-note">Enter every identity detail you have on file — all of them must match. Repeated failures temporarily lock the account.</small></label>
          <label className="auth-field"><span>New password</span><div className="auth-input-wrap"><LockKeyhole size={18}/><input type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Letters + numbers, 6+ characters"/></div></label>
          <div className="password-requirements"><span className="password-rules-title">Password requirements</span><div className="password-rule-grid"><span className={newPassword.length >= 6 && newPassword.length <= 72 ? "passed" : ""}><Check size={13}/> 6–72 characters</span><span className={/[A-Za-z]/.test(newPassword) && /\d/.test(newPassword) ? "passed" : ""}><Check size={13}/> Letters + numbers</span></div></div>
          <label className="auth-field"><span>Confirm new password</span><div className="auth-input-wrap"><LockKeyhole size={18}/><input type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your new password"/></div></label>
          <button className="button button-primary auth-submit" type="submit" disabled={loading}>{loading ? <><span className="button-spinner"/> Resetting…</> : <>Reset password <ArrowRight size={17}/></>}</button>
        </form>
        <p className="auth-switch-line">Remembered it? <Link to="/login">Sign in <ArrowRight size={14}/></Link></p>
      </>}
    </div></section>
  </main>;
}
