"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const result=await response.json();
      if(!response.ok||!result.success) { setError(result.message??"Unable to sign in."); return; }
      const target=new URLSearchParams(window.location.search).get("returnTo")??"/";
      const safe=target.startsWith("/")&&!target.startsWith("//")&&!target.includes("\\")?target:"/";
      router.replace(result.mustChangePassword?"/change-password":safe); router.refresh();
    } catch { setError("Unable to reach the server. Try again."); }
    finally { setLoading(false); }
  }

  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark">PHM</span><div><strong>PHM / INTELLIGENCE</strong><small>ASSET INTEGRITY PLATFORM</small></div></div>
    <div className="auth-heading"><span className="auth-eyebrow">SECURE WORKSPACE</span><h1>Welcome back</h1><p>Sign in to access the inspection workspace.</p></div>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="login-email">Email address</label><input id="login-email" type="email" required maxLength={254} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/>
      <label htmlFor="login-password">Password</label><input id="login-password" type="password" required maxLength={72} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/>
      {error&&<p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={loading}>{loading?"Signing in…":"Sign in"}</button>
    </form>
    <p className="auth-footnote">Access is provided by your system administrator.</p>
  </section></main>;
}
