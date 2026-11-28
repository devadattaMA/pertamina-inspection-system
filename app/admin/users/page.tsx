"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Account={id:string;name:string;email:string;role:"admin"|"inspector"|"viewer";isActive:boolean;mustChangePassword:boolean;revokedSessions?:number};

export default function AdminUsersPage() {
  const router=useRouter();
  const [users,setUsers]=useState<Account[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<Account["role"]>("inspector");
  const [temporaryPassword,setTemporaryPassword]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const response=await fetch("/api/admin/users",{cache:"no-store"});
      const result=await response.json();
      if(response.status===401||response.status===403){router.replace("/");return;}
      if(!response.ok||!result.success)throw new Error(result.message??"Unable to load accounts.");
      setUsers(result.users);
    } catch(cause){setError(cause instanceof Error?cause.message:"Unable to load accounts.");}
    finally{setLoading(false);}
  },[router]);
  useEffect(()=>{void load();},[load]);

  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setSuccess("");setSaving(true);
    try{
      const response=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,role,temporaryPassword,mustChangePassword:true})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message??"Unable to create account.");
      setName("");setEmail("");setTemporaryPassword("");
      setSuccess("Account created. Share the temporary password securely; the user must change it at first sign-in.");
      await load();
    }catch(cause){setError(cause instanceof Error?cause.message:"Unable to create account.");}
    finally{setSaving(false);}
  }

  async function update(id:string,changes:Partial<Pick<Account,"role"|"isActive">>){
    setError("");setSuccess("");
    try{
      const response=await fetch("/api/admin/users/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(changes)});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message??"Unable to update account.");
      setSuccess(result.user.revokedSessions?("Account updated. "+result.user.revokedSessions+" session(s) revoked."):"Account updated.");
      await load();
    }catch(cause){setError(cause instanceof Error?cause.message:"Unable to update account.");}
  }

  async function logout(){
    try{await fetch("/api/auth/logout",{method:"POST"});}finally{router.replace("/login");router.refresh();}
  }

  return <main className="admin-screen">
    <header className="admin-topbar"><Link href="/" className="admin-back">← Back to workspace</Link><button className="admin-logout" onClick={logout}>Log out</button></header>
    <div className="admin-content">
      <div className="admin-heading"><span className="auth-eyebrow">ACCESS CONTROL</span><h1>User management</h1><p>Create accounts, change roles, and deactivate or reactivate users.</p></div>
      <section className="admin-panel"><h2>Create account</h2>
        <form className="admin-create-form" onSubmit={create}>
          <label>Name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>Email<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Role<select value={role} onChange={e=>setRole(e.target.value as Account["role"])}><option value="inspector">Inspector</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label>
          <label>Temporary password<input type="password" required minLength={12} maxLength={72} value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)}/></label>
          <button className="auth-submit" disabled={saving}>{saving?"Creating…":"Create account"}</button>
        </form>
        <p className="auth-hint">At least 12 characters. The user must change it on first login.</p>
      </section>
      <section className="admin-panel">
        <div className="admin-table-heading"><div><h2>Accounts</h2><p>{users.length} account(s)</p></div><button className="admin-refresh" onClick={()=>void load()} disabled={loading}>Refresh</button></div>
        {error&&<p className="auth-error" role="alert">{error}</p>}{success&&<p className="auth-success" role="status">{success}</p>}
        {loading?<p className="auth-hint">Loading accounts…</p>:<div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>First login</th><th>Actions</th></tr></thead>
          <tbody>{users.map(user=><tr key={user.id}>
            <td><strong>{user.name}</strong><small>{user.email}</small></td>
            <td><select aria-label={"Role for "+user.email} value={user.role} onChange={e=>void update(user.id,{role:e.target.value as Account["role"]})}><option value="admin">Admin</option><option value="inspector">Inspector</option><option value="viewer">Viewer</option></select></td>
            <td><span className={user.isActive?"admin-status active":"admin-status inactive"}>{user.isActive?"Active":"Inactive"}</span></td>
            <td>{user.mustChangePassword?"Password change required":"Complete"}</td>
            <td><button className={user.isActive?"admin-action danger":"admin-action"} onClick={()=>void update(user.id,{isActive:!user.isActive})}>{user.isActive?"Deactivate":"Reactivate"}</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>
    </div>
  </main>;
}
