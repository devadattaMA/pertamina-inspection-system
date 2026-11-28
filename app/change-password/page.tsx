"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router=useRouter();
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if(newPassword.length<12) { setError("New password must contain at least 12 characters."); return; }
    if(newPassword!==confirmPassword) { setError("The new password and confirmation do not match."); return; }
    setLoading(true);
    try {
      const response=await fetch("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
      const result=await response.json();
      if(!response.ok||!result.success) { setError(result.message??"Unable to update password."); return; }
      router.replace("/"); router.refresh();
    } catch { setError("Unable to reach the server. Try again."); }
    finally { setLoading(false); }
  }
  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark">PHM</span><div><strong>PHM / INTELLIGENCE</strong><small>ASSET INTEGRITY PLATFORM</small></div></div>
    <div className="auth-heading"><span className="auth-eyebrow">ACCOUNT SECURITY</span><h1>Create a new password</h1><p>Replace your temporary password before continuing.</p></div>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="current-password">Current / temporary password</label><input id="current-password" type="password" required maxLength={72} autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/>
      <label htmlFor="new-password">New password</label><input id="new-password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/>
      <label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/>
      <p className="auth-hint">Use at least 12 characters.</p>
      {error&&<p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={loading}>{loading?"Updating…":"Update password"}</button>
    </form>
  </section></main>;
}
